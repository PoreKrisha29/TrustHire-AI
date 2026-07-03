"""
agents/resume_enhancer_agent.py

Enhances resume content using Gemini 1.5 Flash.

enhance(resume_data, job_description) → {
    "enhanced_experience": [
        {
            "company": str,
            "role": str,
            "duration": str,
            "original_bullets": [str, ...],
            "enhanced_bullets": [str, ...]   # STAR format, keyword-injected
        },
        ...
    ],
    "enhanced_summary": str,
    "keyword_coverage": {
        "matched": [str, ...],   # keywords found in resume
        "missing": [str, ...]    # keywords in JD but missing from resume
    }
}
"""

import json
import re

import google.generativeai as genai
from django.conf import settings


# ---------------------------------------------------------------------------
# Gemini client
# ---------------------------------------------------------------------------

_gemini_model = None


def _get_model():
    global _gemini_model
    if _gemini_model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
    return _gemini_model


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_skills_list(skills) -> list[str]:
    """Normalise skills to a flat list of strings regardless of input format."""
    if not skills:
        return []
    result = []
    for s in skills:
        if isinstance(s, str):
            result.append(s)
        elif isinstance(s, dict):
            result.append(s.get("skill") or s.get("name") or str(s))
    return result


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_ENHANCE_PROMPT = """
You are an expert technical resume writer and career coach.

Given the resume data and target job description, perform TWO tasks:

TASK 1 — Rewrite EVERY experience bullet in STAR format (Situation, Task, Action, Result).
  - Inject relevant keywords from the job description naturally into each bullet.
  - Start every bullet with a strong action verb.
  - Add quantifiable metrics where plausible (use realistic estimates if not present).
  - Do NOT fabricate company names, roles, or durations.

TASK 2 — Analyse keyword coverage.
  - Extract the top 20 technical/role keywords from the job description.
  - Classify each as "matched" (already in resume) or "missing".

TASK 3 — Rewrite the professional summary (3-4 sentences) to align with the target role.

Return ONLY valid JSON with this exact schema (no markdown, no explanation):
{{
  "enhanced_experience": [
    {{
      "company": "string",
      "role": "string",
      "duration": "string",
      "original_bullets": ["string", ...],
      "enhanced_bullets": ["string", ...]
    }}
  ],
  "enhanced_summary": "string",
  "keyword_coverage": {{
    "matched": ["keyword1", "keyword2"],
    "missing": ["keyword3", "keyword4"]
  }}
}}

--- RESUME DATA ---
{resume_json}

--- JOB DESCRIPTION ---
{job_description}
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enhance(resume_data: dict, job_description: str) -> dict:
    """
    Enhance a parsed resume dict against a target job description.

    Args:
        resume_data:      Parsed resume dict (from resume_parser_agent).
        job_description:  Raw job description text.

    Returns:
        Enhancement dict with enhanced_experience, enhanced_summary,
        and keyword_coverage (matched + missing lists).
    """
    # Normalise skills before serialising
    data_copy = dict(resume_data)
    data_copy["skills"] = _safe_skills_list(data_copy.get("skills", []))

    resume_json = json.dumps(data_copy, indent=2)
    prompt = _ENHANCE_PROMPT.format(
        resume_json=resume_json[:8000],
        job_description=job_description[:3000],
    )

    model = _get_model()
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini enhancement returned invalid JSON: {exc}\nRaw: {text[:500]}"
        ) from exc

    # Ensure keyword_coverage lists are always present
    kc = result.setdefault("keyword_coverage", {})
    kc.setdefault("matched", [])
    kc.setdefault("missing", [])

    return result
