"""
api/views/market.py

Market Pulse endpoints.

GET /api/v1/market/trends        → trending skills
GET /api/v1/market/salary?role=  → salary data
GET /api/v1/market/gap?target=   → skill gap for user vs target role
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, UserSkill
from agents import market_intel_agent


# ── Auth helper ───────────────────────────────────────────────────────────────

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


# ── GET /api/v1/market/trends ────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def market_trends(request):
    """Return top 12 trending skills with demand_pct and delta_week."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    try:
        data = market_intel_agent.get_trends()
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Trends unavailable: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({"success": True, "data": data})


# ── GET /api/v1/market/salary ────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def market_salary(request):
    """Return salary data for a given role. Query param: ?role=Frontend Dev"""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    role = request.query_params.get("role", "").strip()
    if not role:
        # Default to profile target role
        profile = getattr(seeker, "devpulse_profile", None)
        role    = (profile.target_role if profile else None) or "Full Stack Developer"

    try:
        data = market_intel_agent.get_salary(role)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Salary data unavailable: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response({"success": True, "role": role, "data": data})


# ── GET /api/v1/market/gap ───────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def market_gap(request):
    """
    Return skill gap analysis for the user.
    Query param: ?target=Backend Dev (overrides profile target_role)
    """
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    profile     = getattr(seeker, "devpulse_profile", None)
    target_role = request.query_params.get("target", "").strip()
    if not target_role:
        target_role = (profile.target_role if profile else None) or "Full Stack Developer"

    # Gather user's known + certified skills
    user_skills = list(
        UserSkill.objects.filter(seeker=seeker)
        .filter(is_self_marked=True)
        .values_list("skill_name", flat=True)[:30]
    )
    # Also include skills from account.skills field
    account_skills = list(seeker.skills or [])[:20]
    all_skills     = list(dict.fromkeys(user_skills + account_skills))  # dedup preserving order

    try:
        data = market_intel_agent.get_skill_gap(target_role, all_skills)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Gap analysis unavailable: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {
            "success":     True,
            "target_role": target_role,
            "user_skills": all_skills,
            "data":        data,
        }
    )
