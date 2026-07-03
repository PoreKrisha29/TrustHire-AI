"""
api/views/resume.py

Resume Forge endpoints for DevPulse AI.

All routes under /api/v1/resume/

POST   /upload          — parse uploaded PDF/DOCX → store resume_data → return parsed dict
POST   /enhance         — enhance resume_data + job_description with AI
POST   /check-ats       — ATS compatibility check → score report
POST   /download        — render resume to PDF → return file download
GET    /drafts          — list user's ResumeDraft objects
POST   /drafts          — create a new ResumeDraft
PATCH  /drafts/<id>     — update a draft
DELETE /drafts/<id>     — delete a draft
"""

import uuid

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.views._auth import get_seeker, auth_error
from api.models import JobSeekerAccount, ResumeDraft
from agents import resume_parser_agent, resume_enhancer_agent, ats_compatibility_agent, resume_pdf_renderer


# ---------------------------------------------------------------------------
# Auth helper (reuse pattern from auth.py)
# ---------------------------------------------------------------------------

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


def _auth_error():
    return Response(
        {"success": False, "message": "Authentication required."},
        status=status.HTTP_401_UNAUTHORIZED,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/resume/upload
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_resume(request):
    """
    Upload a PDF or DOCX resume, parse it with Gemini, and store on the
    seeker's account.  Returns the parsed structured data.
    """
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    file = request.FILES.get("resume")
    if not file:
        return Response(
            {"success": False, "message": "No file uploaded. Send multipart/form-data with key 'resume'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    filename     = file.name.lower()
    file_bytes   = file.read()

    try:
        if filename.endswith(".pdf"):
            parsed = resume_parser_agent.parse_pdf(file_bytes)
        elif filename.endswith(".docx"):
            parsed = resume_parser_agent.parse_docx(file_bytes)
        else:
            return Response(
                {"success": False, "message": "Unsupported file type. Upload a PDF or DOCX."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    except ValueError as exc:
        return Response(
            {"success": False, "message": str(exc)},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Parsing failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Persist on account
    seeker.resume_data = parsed
    seeker.skills = parsed.get("skills", [])
    seeker.save(update_fields=["resume_data", "skills", "updated_at"])

    return Response(
        {"success": True, "message": "Resume parsed successfully.", "data": parsed},
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/resume/enhance
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def enhance_resume(request):
    """
    Enhance stored resume_data using Gemini against a provided job description.
    Stores the enhanced result in seeker.enhanced_resume.

    Body: { "job_description": "..." }
    """
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    job_description = request.data.get("job_description", "").strip()
    if not job_description:
        return Response(
            {"success": False, "message": "'job_description' is required in the request body."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resume_data = seeker.resume_data
    if not resume_data:
        return Response(
            {"success": False, "message": "No resume found. Please upload your resume first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        enhanced = resume_enhancer_agent.enhance(resume_data, job_description)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"Enhancement failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Store enhancement on account
    seeker.enhanced_resume = enhanced
    seeker.save(update_fields=["enhanced_resume", "updated_at"])

    return Response(
        {"success": True, "message": "Resume enhanced.", "data": enhanced},
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/resume/check-ats
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def check_ats(request):
    """
    Run an ATS compatibility check on the seeker's stored resume.

    Body: { "job_description": "..." }
    """
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    job_description = request.data.get("job_description", "").strip()
    if not job_description:
        return Response(
            {"success": False, "message": "'job_description' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    resume_data = seeker.resume_data
    if not resume_data:
        return Response(
            {"success": False, "message": "No resume found. Upload first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        report = ats_compatibility_agent.check(resume_data, job_description)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"ATS check failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(
        {"success": True, "data": report},
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/resume/download
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def download_resume(request):
    """
    Render the seeker's resume to PDF and return it as a file download.

    Body: { "template": "modern" | "classic" | "minimal" }
    Optionally: { "use_enhanced": true }  — merge enhanced bullets before render
    """
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    template_type = request.data.get("template", "modern")
    use_enhanced  = bool(request.data.get("use_enhanced", False))

    resume_data = seeker.resume_data
    if not resume_data:
        return Response(
            {"success": False, "message": "No resume found. Upload first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Optionally merge enhanced experience bullets
    render_data = dict(resume_data)
    if use_enhanced and seeker.enhanced_resume:
        enhanced = seeker.enhanced_resume
        enhanced_exp = {
            e["company"]: e.get("enhanced_bullets", [])
            for e in enhanced.get("enhanced_experience", [])
            if isinstance(e, dict) and e.get("company")
        }
        merged_exp = []
        for exp in render_data.get("experience", []):
            if isinstance(exp, dict):
                exp_copy = dict(exp)
                company = exp_copy.get("company", "")
                if company in enhanced_exp:
                    exp_copy["enhanced_bullets"] = enhanced_exp[company]
                merged_exp.append(exp_copy)
        render_data["experience"] = merged_exp

        if enhanced.get("enhanced_summary"):
            render_data["summary"] = enhanced["enhanced_summary"]

    try:
        pdf_bytes = resume_pdf_renderer.render_pdf(render_data, template_type)
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": f"PDF generation failed: {exc}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    name     = render_data.get("name", "resume").replace(" ", "_")
    filename = f"{name}_devpulse.pdf"

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Length"] = len(pdf_bytes)
    return response


# ---------------------------------------------------------------------------
# GET + POST /api/v1/resume/drafts
# ---------------------------------------------------------------------------

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def resume_drafts(request):
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    if request.method == "GET":
        drafts = ResumeDraft.objects.filter(seeker=seeker).order_by("-updated_at")
        data = [
            {
                "id":               str(d.id),
                "title":            d.title,
                "template_id":      d.template_id,
                "ats_score":        d.ats_score,
                "is_active":        d.is_active,
                "created_at":       d.created_at.isoformat(),
                "updated_at":       d.updated_at.isoformat(),
            }
            for d in drafts
        ]
        return Response({"success": True, "data": data})

    # POST — create new draft
    title       = request.data.get("title", "Untitled Draft")
    template_id = request.data.get("template_id", "modern")
    content     = request.data.get("content", seeker.resume_data or {})

    draft = ResumeDraft.objects.create(
        seeker      = seeker,
        title       = title,
        template_id = template_id,
        content     = content,
    )
    return Response(
        {
            "success": True,
            "message": "Draft created.",
            "data": {
                "id":          str(draft.id),
                "title":       draft.title,
                "template_id": draft.template_id,
                "is_active":   draft.is_active,
                "created_at":  draft.created_at.isoformat(),
                "updated_at":  draft.updated_at.isoformat(),
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# PATCH + DELETE /api/v1/resume/drafts/<draft_id>
# ---------------------------------------------------------------------------

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser])
def resume_draft_detail(request, draft_id: str):
    seeker = get_seeker(request)
    if not seeker:
        return _auth_error()

    try:
        draft = ResumeDraft.objects.get(id=draft_id, seeker=seeker)
    except ResumeDraft.DoesNotExist:
        return Response(
            {"success": False, "message": "Draft not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "DELETE":
        draft.delete()
        return Response({"success": True, "message": "Draft deleted."})

    # PATCH — partial update
    updatable = ("title", "template_id", "content", "ats_score", "ats_report", "is_active")
    update_fields = []
    for field in updatable:
        if field in request.data:
            setattr(draft, field, request.data[field])
            update_fields.append(field)

    if update_fields:
        update_fields.append("updated_at")
        draft.save(update_fields=update_fields)

    return Response(
        {
            "success": True,
            "message": "Draft updated.",
            "data": {
                "id":          str(draft.id),
                "title":       draft.title,
                "template_id": draft.template_id,
                "ats_score":   draft.ats_score,
                "is_active":   draft.is_active,
                "updated_at":  draft.updated_at.isoformat(),
            },
        }
    )
