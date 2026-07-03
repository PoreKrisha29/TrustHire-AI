"""
agents/market_intel_agent.py

Market intelligence agent using Gemini 1.5 Flash.
Results cached in-memory for 6 hours.

get_trends()              → {skills: [{name, demand_pct, delta_week}]}
get_salary(role)          → {median, p25, p75, currency, top_companies}
get_skill_gap(role, user_skills) → {missing, recommended_order, priority_skill}
"""

import json
import re
import time

import google.generativeai as genai
from django.conf import settings


# ── Cache ────────────────────────────────────────────────────────────────────
# { key: {"data": ..., "ts": float} }
_cache: dict = {}
CACHE_TTL = 6 * 60 * 60   # 6 hours


def _cached(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _store(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}
    return data


# ── Gemini client ────────────────────────────────────────────────────────────

_gemini_model = None


def _get_model():
    global _gemini_model
    if _gemini_model is None:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(settings.GEMINI_MODEL)
    return _gemini_model


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text


# ── Prompts ───────────────────────────────────────────────────────────────────

_TRENDS_PROMPT = """
You are a tech industry analyst with access to job board data.

List exactly 12 of the most in-demand technical skills in the software industry RIGHT NOW (mid-2025).
For each skill, estimate:
  - demand_pct: % of active job postings that mention this skill (realistic, 10-85 range)
  - delta_week: week-over-week change in demand in percentage points (can be negative, range -5 to +5)

Order by demand_pct descending.

Return ONLY valid JSON. No markdown:
{
  "skills": [
    {"name": "Python", "demand_pct": 72, "delta_week": 1.2},
    ...
  ]
}
"""

_SALARY_PROMPT = """
You are a compensation data analyst.

Provide realistic 2025 US salary data for: {role}

Return ONLY valid JSON:
{{
  "median": 145000,
  "p25": 118000,
  "p75": 175000,
  "currency": "USD",
  "top_companies": ["Google", "Meta", "Stripe", "Shopify", "Cloudflare"]
}}

Use realistic market rates for {role} in the United States (2025).
"""

_GAP_PROMPT = """
You are a senior engineering manager helping a developer plan their career.

Target role: {role}
Current skills: {user_skills}

Identify:
1. missing: skills required for {role} that the user DOESN'T have (max 10)
2. recommended_order: ordered learning path for the missing skills (most impactful first)
3. priority_skill: the single most important skill to learn first

Return ONLY valid JSON:
{{
  "missing": ["skill1", "skill2", ...],
  "recommended_order": ["skill1", "skill2", ...],
  "priority_skill": "skill1"
}}
"""


# ── Public API ────────────────────────────────────────────────────────────────

def get_trends() -> dict:
    """
    Return top 12 trending skills with demand_pct and delta_week.
    Cached for 6 hours.
    """
    cached = _cached("trends")
    if cached:
        return cached

    model    = _get_model()
    response = model.generate_content(
        _TRENDS_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini trends JSON error: {exc}") from exc

    # Normalise
    skills = []
    for s in data.get("skills", [])[:12]:
        skills.append({
            "name":       str(s.get("name", "")),
            "demand_pct": max(0, min(100, float(s.get("demand_pct", 0)))),
            "delta_week": float(s.get("delta_week", 0)),
        })

    result = {"skills": skills}
    return _store("trends", result)


def get_salary(role: str) -> dict:
    """
    Return salary data for a given role.
    Cached per role for 6 hours.
    """
    key    = f"salary:{role.lower()}"
    cached = _cached(key)
    if cached:
        return cached

    model    = _get_model()
    prompt   = _SALARY_PROMPT.format(role=role)
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini salary JSON error: {exc}") from exc

    result = {
        "median":        int(data.get("median", 120000)),
        "p25":           int(data.get("p25", 95000)),
        "p75":           int(data.get("p75", 155000)),
        "currency":      str(data.get("currency", "USD")),
        "top_companies": [str(c) for c in data.get("top_companies", [])[:6]],
    }
    return _store(key, result)


def get_skill_gap(target_role: str, user_skills: list[str]) -> dict:
    """
    Identify skill gaps between user's current skills and target role requirements.

    Args:
        target_role:  Role the user is targeting.
        user_skills:  List of skill names the user already has.

    Returns:
        Dict with missing, recommended_order, priority_skill.
    """
    # Don't cache skill gap since it depends on user_skills
    skills_str = ", ".join(user_skills) if user_skills else "none"
    model      = _get_model()
    prompt     = _GAP_PROMPT.format(role=target_role, user_skills=skills_str)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini gap JSON error: {exc}") from exc

    return {
        "missing":             [str(s) for s in data.get("missing", [])[:10]],
        "recommended_order":   [str(s) for s in data.get("recommended_order", [])[:10]],
        "priority_skill":      str(data.get("priority_skill", "")),
    }
