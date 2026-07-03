"""
agents/interview_agent.py

AI-powered mock interview agent using Gemini 1.5 Flash.

generate_questions(role, round_type) → list of 5 question strings
grade_answer(question, user_answer, role) → {
    "score":        int (1–10),
    "feedback":     str,
    "model_answer": str
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


def _clean_json(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_QUESTIONS_PROMPT = """
You are a senior interviewer conducting a {round_type} interview for a {role} position.

Generate EXACTLY 5 interview questions appropriate for this role and round type.

Rules:
- Questions must be open-ended and require thoughtful answers (not yes/no).
- Technical round: focus on real implementation problems, system tradeoffs, debugging scenarios.
- HR round: focus on behavioural questions (STAR method), teamwork, conflict resolution, career goals.
- System Design round: focus on designing scalable systems, architecture decisions, capacity planning.
- Each question must be unique and cover a different aspect.
- Questions should be realistic — as asked in actual interviews at top tech companies.

Return ONLY a JSON array of exactly 5 question strings. No numbering. No markdown. No explanations.

Example format:
["Question 1?", "Question 2?", "Question 3?", "Question 4?", "Question 5?"]

Role: {role}
Round: {round_type}
"""


_GRADE_PROMPT = """
You are a senior technical interviewer grading a candidate's answer.

Role being interviewed for: {role}

Question asked:
{question}

Candidate's answer:
{user_answer}

Evaluate the answer on a scale of 1–10 and provide:
1. A score (1=completely wrong, 5=partially correct, 8=good, 10=exceptional).
2. Constructive feedback (2-3 sentences): what was good, what was missing.
3. A model answer: what an ideal candidate would say (3-6 sentences).

Return ONLY valid JSON, no markdown:
{{
  "score":        integer (1-10),
  "feedback":     "string",
  "model_answer": "string"
}}
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_questions(role: str, round_type: str) -> list[str]:
    """
    Generate 5 interview questions for the given role and round type.

    Args:
        role:       e.g. "Frontend Dev", "Backend Dev", "Full Stack", "DevOps", "Data Engineer"
        round_type: "technical" | "hr" | "system_design"

    Returns:
        List of 5 question strings.
    """
    model  = _get_model()
    prompt = _QUESTIONS_PROMPT.format(role=role, round_type=round_type)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.6,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        questions = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini interview questions returned invalid JSON: {exc}\nRaw: {text[:500]}"
        ) from exc

    if not isinstance(questions, list):
        raise ValueError("Expected list of questions")

    return [str(q).strip() for q in questions[:5] if q]


def grade_answer(question: str, user_answer: str, role: str) -> dict:
    """
    Grade a candidate's answer to an interview question.

    Args:
        question:    The interview question.
        user_answer: The candidate's typed answer.
        role:        The role being interviewed for.

    Returns:
        Dict with score (1-10), feedback, model_answer.
    """
    model  = _get_model()
    prompt = _GRADE_PROMPT.format(
        role=role,
        question=question,
        user_answer=user_answer[:2000] if user_answer else "(No answer provided)",
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
        result = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini grading returned invalid JSON: {exc}\nRaw: {text[:500]}"
        ) from exc

    return {
        "score":        max(1, min(10, int(result.get("score", 5)))),
        "feedback":     str(result.get("feedback", "")),
        "model_answer": str(result.get("model_answer", "")),
    }
