"""
api/views/dashboard.py

Career Dashboard stats endpoint.

GET /api/v1/dashboard/stats
"""

from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import (
    JobSeekerAccount,
    Certificate,
    XPTransaction,
    UserBadge,
    BattleSubmission,
    BattleRoom,
    ResumeDraft,
    Project,
)


# ---------------------------------------------------------------------------
# XP level thresholds (ascending)
# ---------------------------------------------------------------------------
XP_LEVELS = [
    (0,     "Intern"),
    (500,   "Junior"),
    (1500,  "Mid"),
    (3500,  "Senior"),
    (7000,  "Principal"),
    (12000, "Legend"),
]


def _xp_to_next(total_xp: int) -> int:
    """Return XP needed to reach the next level (0 if already at Legend)."""
    for threshold, _ in XP_LEVELS:
        if total_xp < threshold:
            return threshold - total_xp
    return 0   # already Legend


def _next_level_threshold(total_xp: int) -> int:
    """Return the XP threshold of the next level."""
    for threshold, _ in XP_LEVELS:
        if total_xp < threshold:
            return threshold
    return 12000   # cap


def _compute_career_health(
    ats_score: float | None,
    certs_count: int,
    streak_days: int,
    projects_count: int,
) -> int:
    """
    career_health_score = weighted average:
      (ats_score * 0.3) + (certs * 5, capped 30) + (streak * 2, capped 20) + (projects * 3, capped 20)
    Max theoretical: 30 + 30 + 20 + 20 = 100
    """
    ats_component      = (ats_score or 0) * 0.3
    certs_component    = min(certs_count * 5, 30)
    streak_component   = min(streak_days * 2, 20)
    projects_component = min(projects_count * 3, 20)
    return int(round(ats_component + certs_component + streak_component + projects_component))


def get_seeker(request) -> "JobSeekerAccount | None":
    token_user_id = request.auth.get("user_id") if request.auth else None
    if not token_user_id:
        return None
    try:
        return JobSeekerAccount.objects.select_related("devpulse_profile").get(
            id=token_user_id, is_active=True
        )
    except JobSeekerAccount.DoesNotExist:
        return None


# ---------------------------------------------------------------------------
# GET /api/v1/dashboard/stats
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Return aggregated career stats for the authenticated seeker.
    """
    seeker = get_seeker(request)
    if not seeker:
        return Response(
            {"success": False, "message": "Authentication required."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    profile = getattr(seeker, "devpulse_profile", None)
    total_xp    = profile.total_xp    if profile else 0
    streak_days = profile.streak_days if profile else 0
    level       = profile.level       if profile else "Intern"

    # ── Counts ──────────────────────────────────────────────────────────────
    certs_count    = Certificate.objects.filter(seeker=seeker).count()
    projects_count = Project.objects.filter(seeker=seeker).count()

    # Battles won
    battles_won = BattleRoom.objects.filter(winner=seeker).count()

    # Latest ATS score from most-recently updated draft
    latest_draft = (
        ResumeDraft.objects.filter(seeker=seeker, ats_score__isnull=False)
        .order_by("-updated_at")
        .first()
    )
    resume_ats_score = latest_draft.ats_score if latest_draft else None

    # ── Career health ────────────────────────────────────────────────────────
    career_health_score = _compute_career_health(
        ats_score=resume_ats_score,
        certs_count=certs_count,
        streak_days=streak_days,
        projects_count=projects_count,
    )

    # ── XP progress ──────────────────────────────────────────────────────────
    xp_to_next     = _xp_to_next(total_xp)
    next_threshold = _next_level_threshold(total_xp)

    # ── Recent badges (latest 6) ─────────────────────────────────────────────
    recent_badges = list(
        UserBadge.objects.filter(seeker=seeker)
        .order_by("-earned_at")[:6]
        .values("badge_name", "badge_icon", "earned_at")
    )
    for b in recent_badges:
        b["earned_at"] = b["earned_at"].isoformat()

    # ── Recent XP (latest 10 transactions) ──────────────────────────────────
    recent_xp = list(
        XPTransaction.objects.filter(seeker=seeker)
        .order_by("-created_at")[:10]
        .values("event_type", "xp_amount", "created_at", "description")
    )
    for x in recent_xp:
        x["created_at"] = x["created_at"].isoformat()

    return Response(
        {
            "success": True,
            "data": {
                "career_health_score": career_health_score,
                "level":              level,
                "total_xp":          total_xp,
                "xp_to_next_level":  xp_to_next,
                "next_threshold":    next_threshold,
                "streak_days":       streak_days,
                "certs_count":       certs_count,
                "battles_won":       battles_won,
                "resume_ats_score":  resume_ats_score,
                "recent_badges":     recent_badges,
                "recent_xp":         recent_xp,
            },
        }
    )
