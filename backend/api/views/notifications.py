"""
api/views/notifications.py

Notification endpoints.

GET   /api/v1/notifications/           → last 20 notifications (newest first)
PATCH /api/v1/notifications/:id/read   → mark single notification as read
PATCH /api/v1/notifications/read-all   → mark all as read
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, Notification


def get_seeker(request):
    token_user_id = request.auth.get("user_id") if request.auth else None
    if not token_user_id:
        return None
    try:
        return JobSeekerAccount.objects.get(id=token_user_id, is_active=True)
    except JobSeekerAccount.DoesNotExist:
        return None


def auth_error():
    return Response(
        {"success": False, "message": "Authentication required."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


def _notif_dict(n: Notification) -> dict:
    return {
        "id":         str(n.id),
        "type":       n.type,
        "title":      n.title,
        "message":    n.message,
        "is_read":    n.is_read,
        "link":       n.link,
        "created_at": n.created_at.isoformat(),
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_notifications(request):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    notifications = Notification.objects.filter(seeker=seeker).order_by("-created_at")[:20]
    unread_count  = Notification.objects.filter(seeker=seeker, is_read=False).count()

    return Response(
        {
            "success":      True,
            "unread_count": unread_count,
            "data":         [_notif_dict(n) for n in notifications],
        }
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_read(request, notif_id: str):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    try:
        notif = Notification.objects.get(id=notif_id, seeker=seeker)
    except Notification.DoesNotExist:
        return Response(
            {"success": False, "message": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notif.is_read = True
    notif.save(update_fields=["is_read"])
    return Response({"success": True, "data": _notif_dict(notif)})


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    updated = Notification.objects.filter(seeker=seeker, is_read=False).update(is_read=True)
    return Response({"success": True, "updated": updated})
