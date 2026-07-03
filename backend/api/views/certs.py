"""
api/views/certs.py

Learn & Certify endpoints.

POST /api/v1/certs/quiz/start    — generate 10 Qs, cache server-side, return to client
POST /api/v1/certs/quiz/submit   — grade answers, issue cert if score >= 70, award XP
GET  /api/v1/certs/              — list seeker's certificates
GET  /api/v1/certs/<cert_id>     — public cert verification (no auth)
"""

import random
import string
from datetime import datetime

from django.core.cache import cache
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import (
    JobSeekerAccount,
    Certificate,
    UserSkill,
    XPTransaction,
    QuizAttempt,
)
from agents import quiz_generator_agent

PASS_SCORE = 70      # minimum percentage to pass
XP_CERT    = 200     # XP awarded on passing
CACHE_TTL  = 60 * 30 # 30 minutes


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


def _quiz_cache_key(seeker_id: str, skill_name: str) -> str:
    slug = skill_name.lower().replace(" ", "_")
    return f"quiz:{seeker_id}:{slug}"


def _generate_cert_id(skill_name: str) -> str:
    """Generate e.g. DP-2025-REACT-4829"""
    year   = datetime.utcnow().year
    slug   = "".join(c for c in skill_name.upper() if c.isalpha())[:8]
    digits = "".join(random.choices(string.digits, k=4))
    return f"DP-{year}-{slug}-{digits}"


# ---------------------------------------------------------------------------
# POST /api/v1/certs/quiz/start
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quiz_start(request):
    """
    Generate a 10-question quiz for the requested skill.
    Questions (including correct answers) are stored in Django cache.
    Client receives questions WITHOUT correct_answer exposed.

    Body: { "skill_name": "React", "difficulty": "medium" }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    skill_name = request.data.get("skill_name", "").strip()
    difficulty = request.data.get("difficulty", "medium").strip()

    if not skill_name:
        return Response(
            {"success": False, "message": "'skill_name' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        questions = quiz_generator_agent.generate_quiz(skill_name, difficulty)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Quiz generation failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Store full questions (with correct_answer) in cache
    cache_key = _quiz_cache_key(str(seeker.id), skill_name)
    cache.set(cache_key, questions, CACHE_TTL)

    # Return questions WITHOUT correct_answer
    safe_questions = [
        {
            "question": q["question"],
            "options":  q["options"],
        }
        for q in questions
    ]

    return Response(
        {
            "success": True,
            "data": {
                "skill_name": skill_name,
                "difficulty": difficulty,
                "total":      len(safe_questions),
                "questions":  safe_questions,
            },
        }
    )


# ---------------------------------------------------------------------------
# POST /api/v1/certs/quiz/submit
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quiz_submit(request):
    """
    Grade a completed quiz and issue a certificate if score >= 70.

    Body: { "skill_name": "React", "answers": [0, 2, 1, 3, ...] }
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    skill_name = request.data.get("skill_name", "").strip()
    user_answers = request.data.get("answers", [])

    if not skill_name:
        return Response(
            {"success": False, "message": "'skill_name' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Retrieve cached questions
    cache_key = _quiz_cache_key(str(seeker.id), skill_name)
    questions  = cache.get(cache_key)

    if not questions:
        return Response(
            {"success": False, "message": "Quiz session expired or not found. Please start a new quiz."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Grade
    total        = len(questions)
    correct_cnt  = 0
    wrong_answers = []

    for i, q in enumerate(questions):
        user_ans = user_answers[i] if i < len(user_answers) else -1
        correct  = q["correct_answer"]
        if user_ans == correct:
            correct_cnt += 1
        else:
            wrong_answers.append(
                {
                    "question":       q["question"],
                    "user_answer":    q["options"][user_ans] if 0 <= user_ans < 4 else "No answer",
                    "correct_answer": q["options"][correct],
                    "explanation":    q.get("explanation", ""),
                }
            )

    score_pct = int(round((correct_cnt / total) * 100)) if total else 0
    passed    = score_pct >= PASS_SCORE

    # Record attempt
    QuizAttempt.objects.create(
        seeker     = seeker,
        skill_name = skill_name,
        score      = score_pct,
        passed     = passed,
    )

    cert_id  = None
    xp_gained = 0

    if passed:
        # Avoid duplicate certs for same skill (regenerate unique_cert_id)
        existing = Certificate.objects.filter(seeker=seeker, skill_name=skill_name).first()
        if not existing:
            cert_id = _generate_cert_id(skill_name)
            Certificate.objects.create(
                seeker         = seeker,
                skill_name     = skill_name,
                score          = score_pct,
                unique_cert_id = cert_id,
            )

            # Create/update UserSkill as certified
            skill_obj, _ = UserSkill.objects.get_or_create(
                seeker     = seeker,
                skill_name = skill_name,
            )
            if not skill_obj.is_certified:
                skill_obj.is_certified     = True
                skill_obj.xp_contribution  = XP_CERT
                skill_obj.save(update_fields=["is_certified", "xp_contribution"])

            # Award XP
            xp_gained = XP_CERT
            XPTransaction.objects.create(
                seeker      = seeker,
                event_type  = "cert_earned",
                xp_amount   = xp_gained,
                description = f"Certified in {skill_name} with {score_pct}%",
            )

            # Update DevPulseProfile XP + recalculate level
            profile = getattr(seeker, "devpulse_profile", None)
            if profile:
                profile.total_xp += xp_gained
                profile.save(update_fields=["total_xp"])
                profile.recalculate_level()
        else:
            cert_id = existing.unique_cert_id

    # Invalidate cache
    cache.delete(cache_key)

    return Response(
        {
            "success": True,
            "data": {
                "passed":       passed,
                "score":        score_pct,
                "correct":      correct_cnt,
                "total":        total,
                "cert_id":      cert_id,
                "xp_gained":    xp_gained,
                "wrong_answers": wrong_answers,
            },
        }
    )


# ---------------------------------------------------------------------------
# GET /api/v1/certs/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_certs(request):
    """List all certificates earned by the authenticated seeker."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    certs = Certificate.objects.filter(seeker=seeker).order_by("-issued_at")
    data = [
        {
            "id":             str(c.id),
            "skill_name":     c.skill_name,
            "score":          c.score,
            "unique_cert_id": c.unique_cert_id,
            "issued_at":      c.issued_at.isoformat(),
        }
        for c in certs
    ]
    return Response({"success": True, "data": data})


# ---------------------------------------------------------------------------
# GET /api/v1/certs/<unique_cert_id>   (public — no auth)
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def verify_cert(request, unique_cert_id: str):
    """
    Public endpoint to verify a certificate by its unique ID.
    Used for shareable cert verification pages.
    """
    try:
        cert = Certificate.objects.select_related("seeker").get(
            unique_cert_id=unique_cert_id
        )
    except Certificate.DoesNotExist:
        return Response(
            {"success": False, "message": "Certificate not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "data": {
                "unique_cert_id": cert.unique_cert_id,
                "skill_name":     cert.skill_name,
                "score":          cert.score,
                "issued_at":      cert.issued_at.isoformat(),
                "holder_name":    cert.seeker.full_name,
            },
        }
    )
