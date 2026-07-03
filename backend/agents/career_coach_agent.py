"""
agents/career_coach_agent.py

"Pulse" — AI career mentor using Gemini 1.5 Flash.

chat(user_message, history, user_context) → response str

user_context: {
    skills:       list[str],
    level:        str,
    target_role:  str | None,
    ats_score:    int | None,
    streak_days:  int,
}
"""

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
# System prompt builder
# ---------------------------------------------------------------------------

_SYSTEM_TEMPLATE = """You are Pulse, a senior software engineer and career mentor on DevPulse AI.

PERSONALITY:
- Direct, concise, warm. No fluff, no filler phrases.
- Use bullet points for lists, but don't over-structure short answers.
- Encourage without being patronising.
- Give concrete, actionable advice — specific resources, timelines, and tradeoffs.
- You know the tech industry deeply: compensation, hiring processes, skill gaps, career tracks.

USER PROFILE:
- Level:       {level}
- Skills:      {skills}
- Target role: {target_role}
- ATS score:   {ats_score}
- Streak:      {streak_days} days

RULES:
- Never repeat the user's message back.
- If unsure, say so honestly. Don't fabricate data.
- Keep responses under 200 words unless the user asks for a detailed breakdown.
- If skills list is empty, gently remind user to map their skills in Skill Genome.
"""


def _build_system_prompt(ctx: dict) -> str:
    skills_str = ", ".join(ctx.get("skills") or []) or "not mapped yet"
    return _SYSTEM_TEMPLATE.format(
        level=ctx.get("level", "Intern"),
        skills=skills_str,
        target_role=ctx.get("target_role") or "not set",
        ats_score=f"{ctx.get('ats_score')}%" if ctx.get("ats_score") is not None else "N/A",
        streak_days=ctx.get("streak_days", 0),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chat(
    user_message: str,
    history: list[dict],
    user_context: dict,
) -> str:
    """
    Send a message to Pulse and get a response.

    Args:
        user_message:  The user's latest message.
        history:       Conversation history [{role: "user"|"model", content: str}, ...]
        user_context:  Dict with skills, level, target_role, ats_score, streak_days.

    Returns:
        Pulse's response as a plain string.
    """
    model = _get_model()
    system_prompt = _build_system_prompt(user_context)

    # Build Gemini-format conversation history
    # Gemini uses {"role": "user"|"model", "parts": [{"text": "..."}]}
    gemini_history = [
        {
            "role":  turn.get("role", "user"),
            "parts": [{"text": str(turn.get("content", ""))}],
        }
        for turn in (history or [])
        if turn.get("content")
    ]

    # Prepend system prompt as a user→model pair (Gemini 1.5 pattern)
    full_history = [
        {"role": "user",  "parts": [{"text": system_prompt}]},
        {"role": "model", "parts": [{"text": "Understood. I'm Pulse, ready to help."}]},
        *gemini_history,
    ]

    # Start a chat session with the history
    chat_session = model.start_chat(history=full_history)

    response = chat_session.send_message(
        user_message,
        generation_config=genai.GenerationConfig(
            temperature=0.7,
            max_output_tokens=512,
        ),
    )

    return response.text.strip()
