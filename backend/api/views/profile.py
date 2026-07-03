"""
api/views/profile.py

User profile endpoints.

GET  /api/v1/profile/ → full user + devpulse_profile data
PATCH /api/v1/profile/ → update editable fields
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, Certificate, UserBadge


def get_seeker(request):
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


def _profile_dict(seeker) -> dict:
    profile = getattr(seeker, "devpulse_profile", None)

    badges = list(
        UserBadge.objects.filter(seeker=seeker).values(
            "badge_name", "badge_icon", "earned_at"
        )[:20]
    )
    certs = list(
        Certificate.objects.filter(seeker=seeker)
        .values("skill_name", "score", "unique_cert_id", "issued_at")
        .order_by("-issued_at")[:20]
    )

    return {
        "id":           str(seeker.id),
        "email":        seeker.email,
        "full_name":    seeker.full_name,
        "headline":     seeker.headline,
        "location":     seeker.location,
        "phone":        seeker.phone,
        "tier":         seeker.tier,
        "devpulse_profile": {
            "level":              profile.level          if profile else "Intern",
            "total_xp":          profile.total_xp       if profile else 0,
            "streak_days":       profile.streak_days    if profile else 0,
            "career_health_score": profile.career_health_score if profile else 0,
            "target_role":       profile.target_role    if profile else None,
            "github_url":        profile.github_url     if profile else None,
            "linkedin_url":      profile.linkedin_url   if profile else None,
            "username":          profile.username       if profile else None,
        },
        "badges":       [
            {
                "badge_name": b["badge_name"],
                "badge_icon": b["badge_icon"],
                "earned_at":  b["earned_at"].isoformat() if b["earned_at"] else None,
            }
            for b in badges
        ],
        "certificates": [
            {
                "skill_name":     c["skill_name"],
                "score":          c["score"],
                "unique_cert_id": c["unique_cert_id"],
                "issued_at":      c["issued_at"].isoformat() if c["issued_at"] else None,
            }
            for c in certs
        ],
    }


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_profile(request):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    if request.method == "GET":
        return Response({"success": True, "data": _profile_dict(seeker)})

    # PATCH — update fields
    # Account-level fields
    account_fields = ["full_name", "headline", "location", "phone"]
    account_updated = []
    for field in account_fields:
        if field in request.data:
            setattr(seeker, field, request.data[field])
            account_updated.append(field)

    if account_updated:
        seeker.save(update_fields=account_updated)

    # Profile-level fields
    profile = getattr(seeker, "devpulse_profile", None)
    if profile:
        profile_fields_map = {
            "target_role":  "target_role",
            "github_url":   "github_url",
            "linkedin_url": "linkedin_url",
        }
        profile_updated = []
        for key, field in profile_fields_map.items():
            if key in request.data:
                setattr(profile, field, request.data[key] or None)
                profile_updated.append(field)
        if profile_updated:
            profile.save(update_fields=profile_updated)

    return Response({"success": True, "data": _profile_dict(seeker)})
