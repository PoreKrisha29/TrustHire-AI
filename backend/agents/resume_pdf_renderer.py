"""
agents/resume_pdf_renderer.py

Renders a parsed resume dict to a PDF using ReportLab.

render_pdf(resume_data, template_type) → bytes

template_type options:
    "modern"  — Indigo sidebar with white content area
    "classic" — Clean single-column, black header rule
    "minimal" — No colour, ultra-clean typography
"""

import io
from typing import Literal

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.colors import HexColor


# ---------------------------------------------------------------------------
# Colour palettes per template
# ---------------------------------------------------------------------------

PALETTES = {
    "modern": {
        "accent":      HexColor("#6366f1"),   # indigo
        "accent_dark": HexColor("#4f46e5"),
        "text_dark":   HexColor("#1e1b4b"),
        "text_mid":    HexColor("#374151"),
        "text_light":  HexColor("#6b7280"),
        "bg_sidebar":  HexColor("#6366f1"),
        "sidebar_text":colors.white,
    },
    "classic": {
        "accent":      HexColor("#1e293b"),
        "accent_dark": HexColor("#0f172a"),
        "text_dark":   HexColor("#0f172a"),
        "text_mid":    HexColor("#334155"),
        "text_light":  HexColor("#64748b"),
        "bg_sidebar":  None,
        "sidebar_text":colors.black,
    },
    "minimal": {
        "accent":      HexColor("#374151"),
        "accent_dark": HexColor("#111827"),
        "text_dark":   HexColor("#111827"),
        "text_mid":    HexColor("#374151"),
        "text_light":  HexColor("#6b7280"),
        "bg_sidebar":  None,
        "sidebar_text":colors.black,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _safe_skills_list(skills) -> list:
    if not skills:
        return []
    result = []
    for s in skills:
        if isinstance(s, str):
            result.append(s)
        elif isinstance(s, dict):
            result.append(s.get("skill") or s.get("name") or str(s))
    return result


def _safe_str(val, default="") -> str:
    return str(val).strip() if val else default


def _build_styles(palette: dict) -> dict:
    """Build a dict of ParagraphStyle for a given palette."""
    base = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "Name",
            fontSize=22,
            fontName="Helvetica-Bold",
            textColor=palette["text_dark"],
            spaceAfter=2,
        ),
        "headline": ParagraphStyle(
            "Headline",
            fontSize=11,
            fontName="Helvetica",
            textColor=palette["accent"],
            spaceAfter=6,
        ),
        "contact": ParagraphStyle(
            "Contact",
            fontSize=9,
            fontName="Helvetica",
            textColor=palette["text_light"],
            spaceAfter=4,
        ),
        "section_title": ParagraphStyle(
            "SectionTitle",
            fontSize=11,
            fontName="Helvetica-Bold",
            textColor=palette["accent_dark"],
            spaceBefore=12,
            spaceAfter=4,
        ),
        "role": ParagraphStyle(
            "Role",
            fontSize=10,
            fontName="Helvetica-Bold",
            textColor=palette["text_dark"],
            spaceAfter=1,
        ),
        "company": ParagraphStyle(
            "Company",
            fontSize=9,
            fontName="Helvetica-Oblique",
            textColor=palette["text_light"],
            spaceAfter=3,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontSize=9,
            fontName="Helvetica",
            textColor=palette["text_mid"],
            leftIndent=12,
            spaceAfter=2,
            bulletIndent=4,
        ),
        "body": ParagraphStyle(
            "Body",
            fontSize=9,
            fontName="Helvetica",
            textColor=palette["text_mid"],
            spaceAfter=4,
            leading=13,
            alignment=TA_JUSTIFY,
        ),
        "skill_chip": ParagraphStyle(
            "SkillChip",
            fontSize=9,
            fontName="Helvetica",
            textColor=palette["text_mid"],
            spaceAfter=2,
        ),
    }


# ---------------------------------------------------------------------------
# Content builders
# ---------------------------------------------------------------------------

def _section_header(title: str, styles: dict, palette: dict) -> list:
    """Return a section header flowable list."""
    return [
        Paragraph(title.upper(), styles["section_title"]),
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=palette["accent"],
            spaceAfter=4,
        ),
    ]


def _build_content(data: dict, styles: dict, palette: dict) -> list:
    """Build the list of ReportLab flowables for resume content."""
    story = []

    # ── Header ────────────────────────────────────────────────────────────
    story.append(Paragraph(_safe_str(data.get("name"), "Your Name"), styles["name"]))
    if data.get("headline"):
        story.append(Paragraph(_safe_str(data["headline"]), styles["headline"]))

    contact_parts = [
        _safe_str(data.get("email")),
        _safe_str(data.get("phone")),
    ]
    contact_str = "  |  ".join(p for p in contact_parts if p)
    if contact_str:
        story.append(Paragraph(contact_str, styles["contact"]))

    story.append(HRFlowable(width="100%", thickness=1, color=palette["accent"], spaceBefore=6, spaceAfter=8))

    # ── Summary ───────────────────────────────────────────────────────────
    if data.get("summary"):
        story += _section_header("Professional Summary", styles, palette)
        story.append(Paragraph(_safe_str(data["summary"]), styles["body"]))

    # ── Experience ────────────────────────────────────────────────────────
    exp_list = data.get("experience") or []
    if exp_list:
        story += _section_header("Experience", styles, palette)
        for exp in exp_list:
            if not isinstance(exp, dict):
                continue
            block = []
            block.append(Paragraph(_safe_str(exp.get("role")), styles["role"]))
            company_line = _safe_str(exp.get("company"))
            duration = _safe_str(exp.get("duration"))
            if duration:
                company_line += f"  —  {duration}"
            block.append(Paragraph(company_line, styles["company"]))
            bullets = exp.get("enhanced_bullets") or exp.get("bullets") or []
            for b in bullets:
                block.append(Paragraph(f"• {_safe_str(b)}", styles["bullet"]))
            block.append(Spacer(1, 4))
            story.append(KeepTogether(block))

    # ── Skills ────────────────────────────────────────────────────────────
    skills = _safe_skills_list(data.get("skills", []))
    if skills:
        story += _section_header("Skills", styles, palette)
        skills_text = "  ·  ".join(skills)
        story.append(Paragraph(skills_text, styles["skill_chip"]))

    # ── Education ─────────────────────────────────────────────────────────
    edu_list = data.get("education") or []
    if edu_list:
        story += _section_header("Education", styles, palette)
        for edu in edu_list:
            if not isinstance(edu, dict):
                continue
            deg  = _safe_str(edu.get("degree"))
            inst = _safe_str(edu.get("institution"))
            yr   = _safe_str(edu.get("year"))
            line = f"<b>{deg}</b>" if deg else ""
            if inst:
                line += f"  —  {inst}"
            if yr:
                line += f"  ({yr})"
            if line:
                story.append(Paragraph(line, styles["body"]))
                story.append(Spacer(1, 2))

    # ── Projects ──────────────────────────────────────────────────────────
    proj_list = data.get("projects") or []
    if proj_list:
        story += _section_header("Projects", styles, palette)
        for proj in proj_list:
            if not isinstance(proj, dict):
                continue
            block = []
            block.append(Paragraph(f"<b>{_safe_str(proj.get('title'))}</b>", styles["role"]))
            if proj.get("description"):
                block.append(Paragraph(_safe_str(proj["description"]), styles["body"]))
            tech = proj.get("tech") or []
            if tech:
                block.append(Paragraph(f"Tech: {', '.join(tech)}", styles["company"]))
            block.append(Spacer(1, 3))
            story.append(KeepTogether(block))

    return story


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

TemplateType = Literal["modern", "classic", "minimal"]


def render_pdf(
    resume_data: dict,
    template_type: TemplateType = "modern",
) -> bytes:
    """
    Render a resume dict to PDF bytes using ReportLab.

    Args:
        resume_data:   Parsed (or enhanced) resume dict.
        template_type: "modern" | "classic" | "minimal"

    Returns:
        Raw PDF bytes suitable for HTTP response.
    """
    if template_type not in PALETTES:
        template_type = "modern"

    palette = PALETTES[template_type]
    styles  = _build_styles(palette)
    buffer  = io.BytesIO()

    # Page layout — single-column for all templates (sidebar is a future enhancement)
    margin_left  = 1.8 * cm
    margin_right = 1.8 * cm
    margin_top   = 2.0 * cm
    margin_bot   = 2.0 * cm

    page_w, page_h = A4

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=margin_left,
        rightMargin=margin_right,
        topMargin=margin_top,
        bottomMargin=margin_bot,
    )

    content_frame = Frame(
        margin_left,
        margin_bot,
        page_w - margin_left - margin_right,
        page_h - margin_top - margin_bot,
        id="content",
    )

    def _on_page(canvas, doc):
        """Draw page decorations (modern template gets accent footer bar)."""
        if template_type == "modern":
            canvas.saveState()
            canvas.setFillColor(palette["accent"])
            canvas.rect(0, 0, page_w, 6 * mm, fill=True, stroke=False)
            canvas.restoreState()

    page_template = PageTemplate(
        id="main",
        frames=[content_frame],
        onPage=_on_page,
    )
    doc.addPageTemplates([page_template])

    story = _build_content(resume_data, styles, palette)
    doc.build(story)

    return buffer.getvalue()
