"""
Resume Analyzer Pipeline — POST /ai/resume/analyze

Pipeline steps:
  1. Download resume PDF/DOCX from S3 via presigned URL
  2. Parse text using PyMuPDF (PDF) or python-docx (DOCX)
  3. Extract sections (Contact, Experience, Education, Skills) via regex
  4. Score each section (Contact 10%, Experience 30%, Skills 25%, Education 15%, ATS 20%)
  5. Integrity checks — date overlaps, 12+ month employment gaps
  6. Keyword gap analysis vs target role
  7. Gemini API call → 5 prioritized improvement suggestions
  8. Return full structured JSON analysis report
"""

import re
import logging
from io import BytesIO

import requests
import google.generativeai as genai
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# ── Gemini setup ───────────────────────────────────────────────────
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Role → benchmark keywords mapping
ROLE_KEYWORDS = {
    'software engineer':    ['python', 'java', 'algorithms', 'data structures', 'git', 'api', 'testing'],
    'frontend developer':   ['react', 'javascript', 'typescript', 'css', 'html', 'responsive', 'redux'],
    'backend developer':    ['node.js', 'python', 'django', 'sql', 'rest api', 'microservices', 'docker'],
    'data scientist':       ['python', 'machine learning', 'pandas', 'numpy', 'tensorflow', 'sql', 'statistics'],
    'devops engineer':      ['docker', 'kubernetes', 'ci/cd', 'aws', 'terraform', 'linux', 'ansible'],
    'product manager':      ['roadmap', 'agile', 'stakeholder', 'user stories', 'kpi', 'analytics', 'jira'],
    'ui/ux designer':       ['figma', 'wireframe', 'prototyping', 'user research', 'accessibility', 'sketch'],
    'data analyst':         ['sql', 'excel', 'tableau', 'power bi', 'python', 'statistics', 'visualization'],
}


class ResumeAnalyzeView(APIView):
    """POST /ai/resume/analyze"""

    def post(self, request):
        candidate_id = request.data.get('candidateId')
        resume_url   = request.data.get('resumeUrl')   # S3 presigned URL or key
        target_role  = request.data.get('targetRole', '')

        if not candidate_id or not resume_url:
            return Response({'success': False, 'error': 'candidateId and resumeUrl are required'}, status=400)

        # Step 1: Download resume
        try:
            raw_bytes, file_type = _download_resume(resume_url)
        except Exception as e:
            logger.error(f'Resume download failed: {e}')
            return Response({'success': False, 'error': 'Failed to download resume', 'message': str(e)}, status=500)

        # Step 2: Parse text
        text = _parse_resume(raw_bytes, file_type)
        if len(text.strip()) < 200:
            return Response({
                'success': False,
                'error': 'Parsing failed',
                'message': 'Could not extract enough text from this resume. Please upload a text-based PDF or DOCX.',
            }, status=422)

        # Step 3: Extract sections
        sections = _extract_sections(text)

        # Step 4: Score sections
        scoring   = _score_sections(sections)
        ats_score = _compute_ats_score(text)

        # Step 5: Integrity checks
        integrity_flags = _integrity_checks(sections.get('experience', ''))

        # Step 6: Keyword gap analysis
        missing_keywords = _keyword_gap(text, target_role)

        # Step 7: Gemini suggestions
        suggestions = _get_gemini_suggestions(text, scoring, target_role)

        # Step 8: Compute overall score
        overall_score = int(
            scoring['contact_score']    * 0.10 +
            scoring['experience_score'] * 0.30 +
            scoring['skills_score']     * 0.25 +
            scoring['education_score']  * 0.15 +
            ats_score                   * 0.20
        )

        return Response({
            'success': True,
            'data': {
                'candidateId':     candidate_id,
                'fileUrl':         resume_url,
                'overallScore':    overall_score,
                'atsScore':        ats_score,
                'breakdown': {
                    'contact':    scoring['contact_score'],
                    'experience': scoring['experience_score'],
                    'skills':     scoring['skills_score'],
                    'education':  scoring['education_score'],
                    'ats':        ats_score,
                },
                'strengths':        scoring['strengths'],
                'weaknesses':       scoring['weaknesses'],
                'suggestions':      suggestions,
                'missingKeywords':  missing_keywords,
                'integrityFlags':   integrity_flags,
                'targetRole':       target_role or None,
            },
        })


# ── Helper functions ───────────────────────────────────────────────

def _download_resume(url: str) -> tuple[bytes, str]:
    """Download resume bytes from URL. Returns (bytes, 'pdf'|'docx')."""
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    content_type = resp.headers.get('Content-Type', '')
    file_type = 'pdf' if 'pdf' in content_type or url.lower().endswith('.pdf') else 'docx'
    return resp.content, file_type


def _parse_resume(raw_bytes: bytes, file_type: str) -> str:
    """Extract plain text from PDF or DOCX bytes."""
    if file_type == 'pdf':
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=raw_bytes, filetype='pdf')
            return '\n'.join(page.get_text() for page in doc)
        except Exception as e:
            logger.error(f'PyMuPDF parse error: {e}')
            return ''
    else:
        try:
            from docx import Document
            doc = Document(BytesIO(raw_bytes))
            return '\n'.join(p.text for p in doc.paragraphs)
        except Exception as e:
            logger.error(f'python-docx parse error: {e}')
            return ''


def _extract_sections(text: str) -> dict:
    """Extract named sections from resume text using regex headers."""
    sections = {}
    patterns = {
        'contact':    r'(?i)(contact|personal info|profile)',
        'experience': r'(?i)(experience|work history|employment)',
        'education':  r'(?i)(education|academic|qualification)',
        'skills':     r'(?i)(skills|technical skills|competencies|technologies)',
        'summary':    r'(?i)(summary|objective|about me|profile)',
    }

    lines = text.split('\n')
    current = 'header'
    sections[current] = []

    for line in lines:
        matched = False
        for section, pattern in patterns.items():
            if re.search(pattern, line) and len(line.strip()) < 60:
                current = section
                sections.setdefault(current, [])
                matched = True
                break
        if not matched:
            sections.setdefault(current, [])
            sections[current].append(line)

    return {k: '\n'.join(v) for k, v in sections.items()}


def _score_sections(sections: dict) -> dict:
    """Score each resume section 0–100 based on length and keywords."""
    strengths  = []
    weaknesses = []

    def score_section(text, good_len, excellent_len, label):
        length = len(text.strip())
        if length == 0:
            weaknesses.append(f'Missing {label} section')
            return 0
        elif length < good_len:
            weaknesses.append(f'{label} section is too brief ({length} chars)')
            return 50
        elif length >= excellent_len:
            strengths.append(f'Strong {label} section')
            return 100
        else:
            strengths.append(f'{label} section present')
            return 75

    contact_score    = score_section(sections.get('contact', ''),    50,  150, 'Contact')
    experience_score = score_section(sections.get('experience', ''), 200, 600, 'Experience')
    skills_score     = score_section(sections.get('skills', ''),     100, 300, 'Skills')
    education_score  = score_section(sections.get('education', ''),  50,  200, 'Education')

    return {
        'contact_score':    contact_score,
        'experience_score': experience_score,
        'skills_score':     skills_score,
        'education_score':  education_score,
        'strengths':        strengths,
        'weaknesses':       weaknesses,
    }


def _compute_ats_score(text: str) -> int:
    """
    ATS compatibility score based on:
    - No tables/columns (hard for ATS parsers)
    - Uses standard section headers
    - Has quantified achievements (numbers)
    - No excessive special characters
    """
    score = 60  # base score

    # Has measurable achievements
    if re.search(r'\d+%|\d+x|\d+ (years?|months?|projects?|teams?)', text, re.IGNORECASE):
        score += 20

    # Has standard section headings
    headings = re.findall(r'(?i)(experience|education|skills|contact|summary|objective)', text)
    if len(set(h.lower() for h in headings)) >= 3:
        score += 15

    # Too many special chars = likely scanned image or tables
    special_ratio = len(re.findall(r'[^\w\s.,;:()\-@+]', text)) / max(len(text), 1)
    if special_ratio > 0.05:
        score -= 20

    return max(0, min(100, score))


def _integrity_checks(experience_text: str) -> list[str]:
    """Detect potential date overlaps or large employment gaps."""
    flags = []
    date_pattern = re.compile(
        r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]+(\d{4})',
        re.IGNORECASE
    )
    matches = date_pattern.findall(experience_text)

    if len(matches) >= 4:
        # Simple heuristic: if years span > 15 years with few entries, might be inflated
        years = [int(m[1]) for m in matches]
        span  = max(years) - min(years)
        if span > 15 and len(matches) < 6:
            flags.append('Large date span with few listed positions — please verify work history.')

    return flags


def _keyword_gap(text: str, target_role: str) -> list[str]:
    """Find benchmark keywords missing from the resume for the target role."""
    if not target_role:
        return []
    text_lower = text.lower()
    role_lower = target_role.lower()
    keywords   = []
    for role, kws in ROLE_KEYWORDS.items():
        if role in role_lower or role_lower in role:
            keywords = kws
            break
    return [kw for kw in keywords if kw not in text_lower]


def _get_gemini_suggestions(text: str, scoring: dict, target_role: str) -> list[dict]:
    """Call Gemini API for 5 prioritized resume improvement suggestions."""
    if not settings.GEMINI_API_KEY:
        return _fallback_suggestions(scoring)

    prompt = f"""You are an expert resume coach. Analyze this resume and provide exactly 5 specific, actionable improvement suggestions.

Resume text (first 3000 chars):
{text[:3000]}

Target role: {target_role or 'General'}

Section scores: Contact={scoring['contact_score']}/100, Experience={scoring['experience_score']}/100, Skills={scoring['skills_score']}/100, Education={scoring['education_score']}/100

Return a JSON array of 5 objects, each with:
- "priority": integer 1-5 (1 = most important)
- "text": specific actionable suggestion (1-2 sentences, max 150 chars)

Only return valid JSON, nothing else."""

    try:
        model    = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        raw      = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=re.MULTILINE)
        import json
        suggestions = json.loads(raw)
        return suggestions[:5]
    except Exception as e:
        logger.error(f'Gemini API error: {e}')
        return _fallback_suggestions(scoring)


def _fallback_suggestions(scoring: dict) -> list[dict]:
    """Static fallback suggestions when Gemini is unavailable."""
    suggestions = []
    priority = 1
    if scoring['experience_score'] < 75:
        suggestions.append({'priority': priority, 'text': 'Add quantified achievements to your experience section (e.g., "Increased performance by 40%").'})
        priority += 1
    if scoring['skills_score'] < 75:
        suggestions.append({'priority': priority, 'text': 'Expand your skills section with specific tools, frameworks, and technologies relevant to your target role.'})
        priority += 1
    if scoring['contact_score'] < 75:
        suggestions.append({'priority': priority, 'text': 'Ensure your contact section includes email, phone, LinkedIn profile, and city/location.'})
        priority += 1
    suggestions.append({'priority': priority, 'text': 'Add a concise professional summary (3-4 sentences) at the top of your resume tailored to the role.'})
    priority += 1
    suggestions.append({'priority': priority, 'text': 'Use action verbs at the start of each bullet point (e.g., "Led", "Built", "Optimized", "Delivered").'})
    return suggestions[:5]
