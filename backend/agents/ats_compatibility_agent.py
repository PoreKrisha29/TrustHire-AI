"""
agents/ats_compatibility_agent.py

Checks resume compatibility against an ATS (Applicant Tracking System) using Gemini.

check(resume_data, job_description) → {
    "total_score": int (0–100),
    "breakdown": {
        "keyword_match":    int (0–100),
        "formatting":       int (0–100),
        "experience":       int (0–100),
        "skills_coverage":  int (0–100),
        "education":        int (0–100)
    },
    "issues":          [str, ...],
    "recommendations": [str, ...]
}

IMPORTANT: skills can be list[str] OR list[dict {"skill": "..."}] — always normalised.
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

def _safe_skills_str(skills) -> str:
    """
    Safely convert skills to a comma-separated string.
    Handles: list[str]  OR  list[dict]  OR  None.
    """
    if not skills:
        return ""
    flat = []
    for s in skills:
        if isinstance(s, str):
            flat.append(s)
        elif isinstance(s, dict):
            # Accept {"skill": "Python"} or {"name": "Python"} or any dict
            value = s.get("skill") or s.get("name") or next(iter(s.values()), "")
            if value:
                flat.append(str(value))
    return ", ".join(flat)


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_ATS_PROMPT = """
You are an ATS (Applicant Tracking System) expert evaluator.

Analyse the resume against the job description and score each category 0-100.

Scoring rubric:
  keyword_match   — How many JD keywords/phrases appear in the resume?
  formatting      — Is the resume ATS-friendly? (no tables, headers parseable, etc.)
  experience      — Does experience align with the required years and responsibilities?
  skills_coverage — What percentage of required skills are present?
  education       — Does education meet JD requirements?

total_score = weighted average: keyword_match*0.35 + formatting*0.15 + experience*0.25 + skills_coverage*0.15 + education*0.10

issues:          List of concrete problems that will hurt ATS parsing (max 6).
recommendations: Specific, actionable fixes (max 6).

Return ONLY valid JSON, no markdown, no explanation:
{{
  "total_score": integer,
  "breakdown": {{
    "keyword_match":   integer,
    "formatting":      integer,
    "experience":      integer,
    "skills_coverage": integer,
    "education":       integer
  }},
  "issues":          ["string", ...],
  "recommendations": ["string", ...]
}}

--- RESUME (structured) ---
Name: {name}
Summary: {summary}
Skills: {skills}
Experience companies: {exp_companies}
Education: {education}

--- JOB DESCRIPTION ---
{job_description}
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check(resume_data: dict, job_description: str) -> dict:
    """
    Run an ATS compatibility check on a resume dict.

    Args:
        resume_data:     Parsed resume dict.
        job_description: Raw job description text.

    Returns:
        ATS report with total_score, breakdown, issues, recommendations.
    """
    # -- Safe extraction of all fields --
    name    = resume_data.get("name", "")
    summary = resume_data.get("summary", "")
    skills  = _safe_skills_str(resume_data.get("skills", []))

    # Experience: extract company + role strings safely
    exp = resume_data.get("experience", [])
    exp_companies = "; ".join(
        f"{e.get('role', '')} at {e.get('company', '')}"
        for e in exp
        if isinstance(e, dict)
    )

    # Education: flatten safely
    edu = resume_data.get("education", [])
    education_str = "; ".join(
        f"{e.get('degree', '')} from {e.get('institution', '')} ({e.get('year', '')})"
        for e in edu
        if isinstance(e, dict)
    )

    prompt = _ATS_PROMPT.format(
        name=name,
        summary=summary[:500],
        skills=skills[:1000],
        exp_companies=exp_companies[:1500],
        education=education_str[:500],
        job_description=job_description[:3000],
    )

    model = _get_model()
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini ATS check returned invalid JSON: {exc}\nRaw: {text[:500]}"
        ) from exc

    # Enforce int types for scores (Gemini may return floats)
    result["total_score"] = int(round(result.get("total_score", 0)))
    bd = result.setdefault("breakdown", {})
    for key in ("keyword_match", "formatting", "experience", "skills_coverage", "education"):
        bd[key] = int(round(bd.get(key, 0)))

    result.setdefault("issues", [])
    result.setdefault("recommendations", [])

    return result
