"""
Company Verify Pipeline — POST /ai/verify/company

Runs 4 automated verification checks on employer data:
  1. DNS record lookup
  2. HTTP reachability ping
  3. LinkedIn company URL format validation
  4. Gemini-powered company web presence check

Returns structured JSON with per-check pass/fail and an overall confidence score.
"""

import re
import socket
import urllib.request
import urllib.error
import logging
import google.generativeai as genai
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class CompanyVerifyView(APIView):
    """POST /ai/verify/company"""

    def post(self, request):
        employer_id     = request.data.get('employerId')
        company_name    = request.data.get('companyName', '')
        website_url     = request.data.get('websiteUrl', '')
        linkedin_url    = request.data.get('linkedinUrl', '')
        reg_number      = request.data.get('registrationNumber', '')

        if not employer_id:
            return Response({'success': False, 'error': 'employerId is required'}, status=400)

        checks = {}
        score  = 0
        total  = 0

        # ── Check 1: DNS ─────────────────────────────────────────
        if website_url:
            total += 25
            try:
                hostname = _extract_hostname(website_url)
                socket.getaddrinfo(hostname, None)
                checks['dns_lookup'] = {'passed': True, 'detail': f'DNS resolved for {hostname}', 'weight': 25}
                score += 25
            except Exception:
                checks['dns_lookup'] = {'passed': False, 'detail': f'No DNS record found for {website_url}', 'weight': 25}

        # ── Check 2: HTTP reachability ────────────────────────────
        if website_url:
            total += 25
            http_ok = _http_ping(website_url)
            if http_ok:
                checks['http_ping'] = {'passed': True, 'detail': 'Website responded successfully', 'weight': 25}
                score += 25
            else:
                checks['http_ping'] = {'passed': False, 'detail': 'Website did not respond within 5 seconds', 'weight': 25}

        # ── Check 3: LinkedIn format ──────────────────────────────
        if linkedin_url:
            total += 20
            is_valid = bool(re.match(r'^https://(www\.)?linkedin\.com/company/[a-zA-Z0-9\-_]+/?$', linkedin_url))
            if is_valid:
                checks['linkedin_format'] = {'passed': True, 'detail': 'LinkedIn URL is correctly formatted', 'weight': 20}
                score += 20
            else:
                checks['linkedin_format'] = {'passed': False, 'detail': f'LinkedIn URL format is invalid: {linkedin_url}', 'weight': 20}

        # ── Check 4: Gemini web presence analysis ─────────────────
        if company_name and settings.GEMINI_API_KEY:
            total += 30
            gemini_result = _gemini_check(company_name, website_url, reg_number)
            checks['gemini_analysis'] = gemini_result
            if gemini_result['passed']:
                score += 30

        # ── Confidence score ──────────────────────────────────────
        confidence = int((score / total * 100)) if total > 0 else 0
        recommendation = (
            'HIGH_CONFIDENCE'   if confidence >= 70 else
            'MEDIUM_CONFIDENCE' if confidence >= 40 else
            'LOW_CONFIDENCE'
        )

        return Response({
            'success': True,
            'data': {
                'employerId':       employer_id,
                'checks':           checks,
                'confidenceScore':  confidence,
                'recommendation':   recommendation,
            },
        })


# ── Helper functions ───────────────────────────────────────────────

def _extract_hostname(url: str) -> str:
    import urllib.parse
    parsed = urllib.parse.urlparse(url)
    return parsed.hostname or url


def _http_ping(url: str) -> bool:
    for scheme_url in [url, url.replace('https://', 'http://')]:
        try:
            req = urllib.request.Request(
                scheme_url if scheme_url.startswith('http') else f'https://{scheme_url}',
                method='HEAD',
                headers={'User-Agent': 'TrustHire-Verifier/1.0'},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status < 500
        except Exception:
            continue
    return False


def _gemini_check(company_name: str, website: str, reg_number: str) -> dict:
    """Use Gemini to assess company legitimacy based on name + website."""
    prompt = f"""You are a company verification assistant for TrustHire AI, an Indian job platform.

Assess the legitimacy of this company:
- Company Name: {company_name}
- Website: {website or 'Not provided'}
- Registration Number: {reg_number or 'Not provided'}

Based only on the information above (do not search the internet), answer:
1. Does the company name sound like a real, registered business? (not a generic/fake-sounding name)
2. Does the website domain match or relate to the company name?
3. Any obvious red flags?

Respond with a JSON object:
{{"legitimate": true/false, "confidence": "HIGH"/"MEDIUM"/"LOW", "reason": "Brief 1-sentence explanation"}}

Return only valid JSON."""

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model    = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        raw      = response.text.strip()
        # Strip markdown fences
        import re as _re
        raw = _re.sub(r'^```(?:json)?\s*|\s*```$', '', raw, flags=_re.MULTILINE)
        import json
        result = json.loads(raw)
        return {
            'passed':  result.get('legitimate', False),
            'detail':  result.get('reason', 'Gemini analysis complete'),
            'weight':  30,
            'confidence': result.get('confidence', 'LOW'),
        }
    except Exception as e:
        logger.error(f'Gemini verify error: {e}')
        return {'passed': False, 'detail': 'Gemini analysis unavailable', 'weight': 30}
