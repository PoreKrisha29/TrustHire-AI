"""
api/views/projects.py

Project Vault endpoints.

GET    /api/v1/projects/           → list user's projects
POST   /api/v1/projects/           → create project + AI bullets + skill extraction
PATCH  /api/v1/projects/:id        → update project fields
DELETE /api/v1/projects/:id        → delete project
POST   /api/v1/projects/:id/regenerate → regenerate AI bullets
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, Project, UserSkill
from agents import project_agent


# ── Auth helper ───────────────────────────────────────────────────────────────

def get_seeker(request) -> "JobSeekerAccount | None":
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


def _project_to_dict(p: Project) -> dict:
    return {
        "id":               str(p.id),
        "title":            p.title,
        "description":      p.description,
        "tech_stack":       p.tech_stack,
        "github_url":       p.github_url,
        "live_url":         p.live_url,
        "ai_bullets":       p.ai_bullets,
        "skills_extracted": p.skills_extracted,
        "is_pinned":        p.is_pinned,
        "created_at":       p.created_at.isoformat(),
    }


def _auto_mark_skills(seeker, skill_names: list[str]):
    """Auto-create UserSkill records (is_self_marked=True) for extracted skills."""
    for name in skill_names:
        if not name.strip():
            continue
        UserSkill.objects.get_or_create(
            seeker=seeker,
            skill_name=name.strip(),
            defaults={"is_self_marked": True},
        )


# ── GET + POST /api/v1/projects/ ──────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def project_list(request):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    if request.method == "GET":
        projects = Project.objects.filter(seeker=seeker)
        return Response(
            {"success": True, "data": [_project_to_dict(p) for p in projects]}
        )

    # POST — create project
    title       = str(request.data.get("title", "")).strip()
    description = str(request.data.get("description", "")).strip()
    tech_stack  = request.data.get("tech_stack", [])
    github_url  = request.data.get("github_url") or None
    live_url    = request.data.get("live_url")   or None

    if not title:
        return Response(
            {"success": False, "message": "'title' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(tech_stack, list):
        tech_stack = []

    # Generate AI bullets and extract skills
    try:
        bullets = project_agent.generate_bullets(title, description, tech_stack)
    except Exception as exc:  # noqa: BLE001
        bullets = [f"Built {title} using {', '.join(tech_stack[:3]) if tech_stack else 'modern technologies'}."]

    try:
        skills_extracted = project_agent.extract_skills(title, description, tech_stack)
    except Exception:  # noqa: BLE001
        skills_extracted = list(tech_stack)[:10]

    # Create project
    project = Project.objects.create(
        seeker           = seeker,
        title            = title,
        description      = description,
        tech_stack       = tech_stack,
        github_url       = github_url,
        live_url         = live_url,
        ai_bullets       = bullets,
        skills_extracted = skills_extracted,
    )

    # Auto-mark extracted skills as known
    _auto_mark_skills(seeker, skills_extracted)

    return Response(
        {"success": True, "data": _project_to_dict(project)},
        status=status.HTTP_201_CREATED,
    )


# ── PATCH + DELETE /api/v1/projects/:id ──────────────────────────────────────

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def project_detail(request, project_id: str):
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    try:
        project = Project.objects.get(id=project_id, seeker=seeker)
    except Project.DoesNotExist:
        return Response(
            {"success": False, "message": "Project not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        project.delete()
        return Response({"success": True, "message": "Project deleted."})

    # PATCH
    updatable = ["title", "description", "tech_stack", "github_url", "live_url", "is_pinned"]
    updated   = []
    for field in updatable:
        if field in request.data:
            setattr(project, field, request.data[field])
            updated.append(field)

    if updated:
        project.save(update_fields=updated)

    return Response({"success": True, "data": _project_to_dict(project)})


# ── POST /api/v1/projects/:id/regenerate ─────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def regenerate_bullets(request, project_id: str):
    """Regenerate AI bullet points for an existing project."""
    seeker = get_seeker(request)
    if not seeker:
        return auth_error()

    try:
        project = Project.objects.get(id=project_id, seeker=seeker)
    except Project.DoesNotExist:
        return Response(
            {"success": False, "message": "Project not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        bullets = project_agent.generate_bullets(
            project.title, project.description, project.tech_stack
        )
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Bullet generation failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    project.ai_bullets = bullets
    project.save(update_fields=["ai_bullets"])

    return Response({"success": True, "data": _project_to_dict(project)})
