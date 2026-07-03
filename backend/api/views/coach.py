"""
api/views/coach.py

AI Career Coach — "Pulse" endpoints.

POST /api/v1/coach/message
    body: { message: str, history: [{role, content}, ...] }
    rate-limit: free users ≤ 10 messages/day
    returns: { response: str, messages_used: int, messages_limit: int }
"""

from datetime import date

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, XPTransaction, UserSkill
from agents import career_coach_agent

FREE_DAILY_LIMIT = 10
PRO_DAILY_LIMIT  = 100   # effectively unlimited for now


# ---------------------------------------------------------------------------
# Auth helper
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


def _daily_message_count(seeker) -> int:
    """Count 'coach_message' XP transactions created today (each message = 1 record)."""
    today = date.today()
    return XPTransaction.objects.filter(
        seeker     = seeker,
        event_type = "coach_message",
        created_at__date = today,
    ).count()


# ---------------------------------------------------------------------------
# POST /api/v1/coach/message
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_message(request):
    """
    Send a message to Pulse (AI career coach) and receive a response.

    Body:
        message:  str            — the user's question / message
        history:  list[dict]     — previous turns [{role, content}, ...]

    Rate limit:
        free tier: 10 messages/day
        pro  tier: 100 messages/day
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    message = str(request.data.get("message", "")).strip()
    history = request.data.get("history", [])

    if not message:
        return Response(
            {"success": False, "message": "'message' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Rate limit check ──────────────────────────────────────────────────────
    daily_limit  = FREE_DAILY_LIMIT if seeker.tier == "free" else PRO_DAILY_LIMIT
    used_today   = _daily_message_count(seeker)

    if used_today >= daily_limit:
        return Response(
            {
                "success": False,
                "message": f"Daily message limit reached ({daily_limit}/day on {seeker.tier} plan). Upgrade to Pro for more.",
                "messages_used":  used_today,
                "messages_limit": daily_limit,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    # ── Build user context from profile ──────────────────────────────────────
    profile = getattr(seeker, "devpulse_profile", None)
    skills  = list(
        UserSkill.objects.filter(seeker=seeker, is_certified=True)
        .values_list("skill_name", flat=True)[:20]
    )
    if not skills:
        skills = list(seeker.skills or [])[:20]

    user_context = {
        "skills":       skills,
        "level":        profile.level       if profile else "Intern",
        "target_role":  profile.target_role if profile else None,
        "ats_score":    None,   # could pull from latest draft
        "streak_days":  profile.streak_days if profile else 0,
    }

    # ── Call agent ────────────────────────────────────────────────────────────
    try:
        response_text = career_coach_agent.chat(message, history, user_context)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Coach unavailable: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ── Record usage (0 XP entry, just for counting) ──────────────────────────
    XPTransaction.objects.create(
        seeker      = seeker,
        event_type  = "coach_message",
        xp_amount   = 0,
        description = "AI coach message",
    )

    return Response(
        {
            "success":        True,
            "response":       response_text,
            "messages_used":  used_today + 1,
            "messages_limit": daily_limit,
        }
    )
