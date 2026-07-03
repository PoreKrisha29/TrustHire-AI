"""
agents/project_agent.py

AI-powered project impact bullet generator and skill extractor.

generate_bullets(title, description, tech_stack) → list[str] (3-5 STAR bullets)
extract_skills(title, description, tech_stack)   → list[str] (skill names)
"""

import json
import re

import google.generativeai as genai
from django.conf import settings


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

_BULLETS_PROMPT = """
You are a senior software engineer writing resume bullet points for a portfolio project.

Project:
  Title:       {title}
  Description: {description}
  Tech Stack:  {tech_stack}

Generate 3-5 bullet points describing this project's impact and technical achievements.

Rules (MANDATORY):
1. Each bullet MUST follow STAR format: implied Situation, specific Task/Action, quantified Result where possible.
2. Start each bullet with a strong action verb (Built, Engineered, Reduced, Improved, Automated, etc.).
3. Be technical and specific — mention technologies, algorithms, or design patterns where relevant.
4. Include measurable impact where possible (e.g. "reduced load time by 40%", "handles 10k RPM").
5. Do NOT use vague phrases like "worked on", "was responsible for", "helped with".
6. Each bullet: 1 sentence, max 20 words.

Return ONLY a JSON array of strings. No markdown. No numbering.
Example: ["Built a real-time notifications system...", "Engineered a Redis caching layer..."]
"""

_SKILLS_PROMPT = """
You are a technical recruiter extracting skills from a project.

Project:
  Title:       {title}
  Description: {description}
  Tech Stack:  {tech_stack}

Extract a list of technical skills demonstrated by this project.
Include: languages, frameworks, databases, cloud services, tools, concepts (e.g. "REST API", "JWT Auth").
Keep skill names short (1-3 words). Use canonical names (e.g. "React" not "ReactJS").
Return 5-15 skills maximum.

Return ONLY a JSON array of strings. No markdown.
Example: ["React", "PostgreSQL", "Docker", "REST API", "JWT Auth"]
"""


# ── Public API ────────────────────────────────────────────────────────────────

def generate_bullets(title: str, description: str, tech_stack: list[str]) -> list[str]:
    """
    Generate 3-5 STAR-format resume bullet points for a project.

    Args:
        title:       Project title.
        description: Project description.
        tech_stack:  List of technology names.

    Returns:
        List of 3-5 bullet point strings.
    """
    model  = _get_model()
    prompt = _BULLETS_PROMPT.format(
        title       = title,
        description = description or "No description provided.",
        tech_stack  = ", ".join(tech_stack) if tech_stack else "Not specified",
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.4,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        bullets = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini bullets returned invalid JSON: {exc}") from exc

    if not isinstance(bullets, list):
        raise ValueError("Expected a list of bullet strings")

    return [str(b).strip() for b in bullets[:5] if b]


def extract_skills(title: str, description: str, tech_stack: list[str]) -> list[str]:
    """
    Extract technical skills from a project's title, description, and tech stack.

    Args:
        title:       Project title.
        description: Project description.
        tech_stack:  List of technology names.

    Returns:
        List of skill name strings (5-15).
    """
    model  = _get_model()
    prompt = _SKILLS_PROMPT.format(
        title       = title,
        description = description or "No description provided.",
        tech_stack  = ", ".join(tech_stack) if tech_stack else "Not specified",
    )

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        skills = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini skills returned invalid JSON: {exc}") from exc

    if not isinstance(skills, list):
        raise ValueError("Expected a list of skill strings")

    return [str(s).strip() for s in skills[:15] if s]
