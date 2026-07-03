"""
api/views/_auth.py

Shared auth helper used by every DevPulse view.

Usage:
    from api.views._auth import get_seeker, auth_error

    seeker = get_seeker(request)
    if not seeker:
        return auth_error()
"""

import uuid
from rest_framework import status
from rest_framework.response import Response

from api.models import JobSeekerAccount


def get_seeker(request, select_related: list | None = None) -> "JobSeekerAccount | None":
    """
    Extracts the JobSeekerAccount from the validated JWT.

    The JWT payload stores user_id as a UUID string. Django's ORM expects a
    real UUID object for UUIDField primary keys — passing a plain string causes
    'Field id expected a number but got <uuid>' on some Django versions.
    """
    raw_id = request.auth.get("user_id") if request.auth else None
    if not raw_id:
        return None

    # Convert to UUID object so Django ORM accepts it for UUIDField PKs
    try:
        user_uuid = uuid.UUID(str(raw_id))
    except (ValueError, AttributeError):
        return None

    qs = JobSeekerAccount.objects
    if select_related:
        qs = qs.select_related(*select_related)

    try:
        return qs.get(id=user_uuid, is_active=True)
    except JobSeekerAccount.DoesNotExist:
        return None


def auth_error() -> Response:
    return Response(
        {"success": False, "message": "Authentication required."},
        status=status.HTTP_401_UNAUTHORIZED,
    )
