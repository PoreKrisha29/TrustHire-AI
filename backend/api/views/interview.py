"""
api/views/interview.py

Mock Interview endpoints.

POST /api/v1/interview/start    — create InterviewSession, generate 5 Qs, cache them
POST /api/v1/interview/answer   — grade answer, store InterviewAnswer, return next Q or results
GET  /api/v1/interview/sessions — list past sessions
"""

from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import (
    JobSeekerAccount,
    InterviewSession,
    InterviewAnswer,
    XPTransaction,
)
from agents import interview_agent

XP_BASE  = 50    # always awarded on completion
XP_BONUS = 100   # bonus if readiness_score >= 80
CACHE_TTL = 60 * 60  # 1 hour


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_seeker(request) -> "JobSeekerAccount | None":
    token_user_id = request.auth.get("user_id") if request.auth else None
    if not token_user_id:
        return None
    try:
        return (
            JobSeekerAccount.objects
            .select_related("devpulse_profile")
            .get(id=token_user_id, is_active=True)
        )
    except JobSeekerAccount.DoesNotExist:
        return None


def auth_error():
    return Response(
        {"success": False, "message": "Authentication required."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _session_cache_key(session_id: str) -> str:
    return f"interview_session:{session_id}"


def _award_xp(seeker, amount: int, description: str):
    XPTransaction.objects.create(
        seeker      = seeker,
        event_type  = "interview_completed",
        xp_amount   = amount,
        description = description,
    )
    profile = getattr(seeker, "devpulse_profile", None)
    if profile:
        profile.total_xp += amount
        profile.save(update_fields=["total_xp"])
        profile.recalculate_level()


# ---------------------------------------------------------------------------
# POST /api/v1/interview/start
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_interview(request):
    """
    Create an InterviewSession, generate 5 questions via Gemini,
    cache the question list, and return the first question.

    Body: { "role": "Frontend Dev", "round_type": "technical" }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    role       = request.data.get("role", "").strip()
    round_type = request.data.get("round_type", "technical").strip()

    if not role:
        return Response(
            {"success": False, "message": "'role' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_rounds = ("technical", "hr", "system_design")
    if round_type not in valid_rounds:
        round_type = "technical"

    try:
        questions = interview_agent.generate_questions(role, round_type)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Question generation failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Create session
    session = InterviewSession.objects.create(
        seeker     = seeker,
        role       = role,
        round_type = round_type,
    )

    # Cache questions for this session
    cache_key = _session_cache_key(str(session.id))
    cache.set(cache_key, {"questions": questions, "answered": 0}, CACHE_TTL)

    return Response(
        {
            "success": True,
            "data": {
                "session_id":    str(session.id),
                "role":          role,
                "round_type":    round_type,
                "total":         len(questions),
                "question_index": 0,
                "question":      questions[0],
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/interview/answer
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_answer(request):
    """
    Grade a single answer, store it, then return either the next question
    or the final results if all 5 questions are answered.

    Body: { "session_id": "...", "question_index": 0, "user_answer": "..." }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    session_id     = request.data.get("session_id", "")
    question_index = int(request.data.get("question_index", 0))
    user_answer    = request.data.get("user_answer", "").strip()

    # Fetch session
    try:
        session = InterviewSession.objects.get(id=session_id, seeker=seeker)
    except InterviewSession.DoesNotExist:
        return Response(
            {"success": False, "message": "Interview session not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Fetch cached questions
    cache_key   = _session_cache_key(str(session.id))
    cached      = cache.get(cache_key)
    if not cached:
        return Response(
            {"success": False, "message": "Session expired. Please start a new interview."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    questions = cached["questions"]
    if question_index >= len(questions):
        return Response(
            {"success": False, "message": "Invalid question index."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    question_text = questions[question_index]

    # Grade with AI
    try:
        grade = interview_agent.grade_answer(question_text, user_answer, session.role)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Grading failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Store answer
    InterviewAnswer.objects.create(
        session      = session,
        question     = question_text,
        user_answer  = user_answer,
        ai_score     = grade["score"],
        ai_feedback  = grade["feedback"],
        model_answer = grade["model_answer"],
    )

    # Update cache answered count
    cached["answered"] = question_index + 1
    cache.set(cache_key, cached, CACHE_TTL)

    is_last = question_index >= len(questions) - 1

    if not is_last:
        # Return next question
        return Response(
            {
                "success": True,
                "data": {
                    "graded": grade,
                    "is_last": False,
                    "next_question_index": question_index + 1,
                    "next_question":       questions[question_index + 1],
                },
            }
        )

    # ── Session complete ──────────────────────────────────────────────────
    answers = (
        InterviewAnswer.objects
        .filter(session=session)
        .order_by("created_at")
        .values("question", "ai_score", "ai_feedback", "model_answer", "user_answer")
    )

    scores         = [a["ai_score"] for a in answers if a["ai_score"] is not None]
    readiness      = int(round(sum(scores) / len(scores) * 10)) if scores else 0
    readiness      = max(0, min(100, readiness))

    # Update session
    session.readiness_score = readiness
    session.completed_at    = timezone.now()
    session.save(update_fields=["readiness_score", "completed_at"])

    # Award XP
    xp_total = XP_BASE + (XP_BONUS if readiness >= 80 else 0)
    _award_xp(seeker, xp_total, f"Completed {session.round_type} interview for {session.role}")

    # Clear cache
    cache.delete(cache_key)

    return Response(
        {
            "success": True,
            "data": {
                "graded":          grade,
                "is_last":         True,
                "session_complete": True,
                "readiness_score": readiness,
                "xp_gained":       xp_total,
                "answers": [
                    {
                        "question":     a["question"],
                        "user_answer":  a["user_answer"],
                        "ai_score":     a["ai_score"],
                        "ai_feedback":  a["ai_feedback"],
                        "model_answer": a["model_answer"],
                    }
                    for a in answers
                ],
            },
        }
    )


# ---------------------------------------------------------------------------
# GET /api/v1/interview/sessions
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_sessions(request):
    """List the seeker's past interview sessions with readiness scores."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    sessions = (
        InterviewSession.objects
        .filter(seeker=seeker)
        .order_by("-created_at")[:20]
    )

    data = [
        {
            "id":              str(s.id),
            "role":            s.role,
            "round_type":      s.round_type,
            "readiness_score": s.readiness_score,
            "completed_at":    s.completed_at.isoformat() if s.completed_at else None,
            "created_at":      s.created_at.isoformat(),
        }
        for s in sessions
    ]

    return Response({"success": True, "data": data})
