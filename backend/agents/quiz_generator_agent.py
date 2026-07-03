"""
agents/quiz_generator_agent.py

Generate a 10-question multiple-choice quiz for a given skill using Gemini 1.5 Flash.

generate_quiz(skill_name, difficulty="medium") → list of 10 dicts:
[
    {
        "question":       str,
        "options":        [str, str, str, str],   # exactly 4
        "correct_answer": int,                     # 0-indexed
        "explanation":    str
    },
    ...
]

Rules enforced via prompt:
  - No duplicate questions
  - Clear distractors (plausible wrong answers, not obviously wrong)
  - Practical knowledge, not trivia
  - Difficulty levels: easy | medium | hard
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
# Prompt
# ---------------------------------------------------------------------------

_QUIZ_PROMPT = """
You are a senior technical interviewer and educator.

Generate EXACTLY 10 unique multiple-choice questions to test practical knowledge of: {skill_name}
Difficulty level: {difficulty}

Rules (MANDATORY):
1. Each question must test real-world practical understanding, NOT trivia or history.
2. All 4 options must be plausible — distractors should look correct to beginners.
3. No two questions may test the same concept.
4. correct_answer is the 0-indexed position of the correct option in the "options" array.
5. explanation must be 1-2 sentences explaining WHY the correct answer is right.
6. For "hard" difficulty: test edge cases, internals, performance tradeoffs.
7. For "easy" difficulty: test fundamental concepts a junior would need.

Return ONLY a valid JSON array of exactly 10 objects. No markdown. No explanation outside JSON.

Schema for each object:
{{
  "question":       "string",
  "options":        ["option A", "option B", "option C", "option D"],
  "correct_answer": 0,
  "explanation":    "string"
}}

Skill: {skill_name}
Difficulty: {difficulty}
"""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_quiz(skill_name: str, difficulty: str = "medium") -> list[dict]:
    """
    Generate a 10-question MCQ quiz for the given skill and difficulty.

    Args:
        skill_name: Name of the skill to quiz on (e.g. "React", "PostgreSQL").
        difficulty: "easy" | "medium" | "hard"

    Returns:
        List of 10 question dicts with question, options, correct_answer, explanation.

    Raises:
        ValueError: If Gemini returns invalid JSON or wrong number of questions.
    """
    difficulty = difficulty.lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    model  = _get_model()
    prompt = _QUIZ_PROMPT.format(skill_name=skill_name, difficulty=difficulty)

    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            temperature=0.5,
            response_mime_type="application/json",
        ),
    )

    text = _clean_json(response.text)
    try:
        questions = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Gemini quiz returned invalid JSON: {exc}\nRaw: {text[:500]}"
        ) from exc

    if not isinstance(questions, list):
        raise ValueError(f"Expected a list of questions, got {type(questions)}")

    # Validate and normalise each question
    validated = []
    for i, q in enumerate(questions[:10]):
        if not isinstance(q, dict):
            continue
        validated.append(
            {
                "question":       str(q.get("question", f"Question {i + 1}")),
                "options":        [str(o) for o in q.get("options", [])[:4]],
                "correct_answer": int(q.get("correct_answer", 0)),
                "explanation":    str(q.get("explanation", "")),
            }
        )

    if len(validated) < 5:
        raise ValueError(
            f"Gemini returned only {len(validated)} valid questions (minimum 5 required)."
        )

    return validated
