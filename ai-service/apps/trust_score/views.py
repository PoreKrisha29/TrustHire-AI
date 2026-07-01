"""
Trust Score Pipeline — POST /ai/trust-score

Implements 6 signal checks that produce a trust score 0-100 for a job listing.
Score = max(0, min(100, 90 - total_penalties + bonuses))
Listings scoring ≤ 40 are QUARANTINED.

Checks:
  1. Description word count < 100  → -20
  2. Salary > 3× industry median   → -20
  3. Company domain unreachable    → -25
  4. No DNS record for domain      → -25  (combined with check 3)
  5. >10 employer posts in 24h     → -10
  6. Employer is verified          → +10
"""

import json
import time
import socket
import urllib.request
import urllib.error
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import nltk
import psycopg2
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

# Download NLTK tokenizer data on first run
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('punkt_tab', quiet=True)

# Load salary benchmarks dataset
_BENCHMARKS_PATH = Path(__file__).parent / 'salary_benchmarks.json'
try:
    with open(_BENCHMARKS_PATH) as f:
        SALARY_BENCHMARKS = json.load(f)
except FileNotFoundError:
    SALARY_BENCHMARKS = {}
    logger.warning('salary_benchmarks.json not found — salary check will be skipped')


class TrustScoreView(APIView):
    """POST /ai/trust-score"""

    def post(self, request):
        data = request.data
        job_id           = data.get('jobId')
        title            = data.get('title', '')
        description      = data.get('description', '')
        salary_min       = data.get('salaryMin')
        salary_max       = data.get('salaryMax')
        domain           = data.get('domain')          # e.g. "acmecorp.com"
        employer_id      = data.get('employerId')
        is_verified      = data.get('isVerifiedCompany', False)

        if not job_id:
            return Response({'success': False, 'error': 'jobId is required'}, status=400)

        flags   = []
        penalty = 0

        # ── Check 1: Description word count ───────────────────────
        word_count = len(nltk.word_tokenize(description))
        if word_count < 100:
            p = 20
            penalty += p
            flags.append({
                'signal':      'LOW_WORD_COUNT',
                'penalty':     -p,
                'description': f'Job description has only {word_count} words (minimum 100 expected).',
            })

        # ── Check 2: Salary vs industry benchmark ─────────────────
        if salary_min is not None and salary_max is not None:
            avg_salary = (salary_min + salary_max) / 2
            median = _get_salary_median(title)
            if median and avg_salary > 3 * median:
                p = 20
                penalty += p
                flags.append({
                    'signal':      'UNREALISTIC_SALARY',
                    'penalty':     -p,
                    'description': f'Advertised salary (₹{avg_salary:,.0f}) is over 3× the industry median (₹{median:,.0f}) for "{title}".',
                })

        # ── Check 3 & 4: Domain reachability + DNS ────────────────
        if domain:
            dns_ok   = _check_dns(domain)
            http_ok  = _check_http(domain) if dns_ok else False

            if not dns_ok:
                p = 25
                penalty += p
                flags.append({
                    'signal':      'NO_DNS_RECORD',
                    'penalty':     -p,
                    'description': f'No DNS record found for company domain "{domain}".',
                })
            elif not http_ok:
                p = 25
                penalty += p
                flags.append({
                    'signal':      'DOMAIN_UNREACHABLE',
                    'penalty':     -p,
                    'description': f'Company domain "{domain}" did not respond to HTTP ping within 5 seconds.',
                })

        # ── Check 5: Employer posting rate (last 24h) ─────────────
        if employer_id:
            post_count = _count_employer_posts_24h(employer_id)
            if post_count > 10:
                p = 10
                penalty += p
                flags.append({
                    'signal':      'HIGH_POSTING_RATE',
                    'penalty':     -p,
                    'description': f'Employer posted {post_count} jobs in the last 24 hours (threshold: 10).',
                })

        # ── Check 6: Verified employer bonus ──────────────────────
        bonus = 0
        if is_verified:
            bonus = 10
            flags.append({
                'signal':      'VERIFIED_EMPLOYER',
                'penalty':     +bonus,
                'description': 'Employer has been verified by TrustHire AI admin.',
            })

        # ── Final score ───────────────────────────────────────────
        score       = max(0, min(100, 90 - penalty + bonus))
        job_status  = 'QUARANTINED' if score <= 40 else 'ACTIVE'

        logger.info(f'Trust score for job {job_id}: {score} (penalty={penalty}, bonus={bonus}) → {job_status}')

        return Response({
            'success': True,
            'data': {
                'jobId':   job_id,
                'score':   score,
                'flags':   flags,
                'status':  job_status,
            },
        })


# ── Signal check helpers ───────────────────────────────────────────

def _get_salary_median(title: str) -> float | None:
    """Look up the median salary for a job title from benchmarks JSON."""
    title_lower = title.lower()
    for role, median in SALARY_BENCHMARKS.items():
        if role.lower() in title_lower or title_lower in role.lower():
            return float(median)
    return None


def _check_dns(domain: str) -> bool:
    """Return True if DNS record exists for the domain."""
    try:
        socket.getaddrinfo(domain, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        return True
    except socket.gaierror:
        return False


def _check_http(domain: str) -> bool:
    """Return True if the domain responds to HTTP/HTTPS HEAD within 5 seconds."""
    for scheme in ('https', 'http'):
        try:
            req = urllib.request.Request(
                f'{scheme}://{domain}',
                method='HEAD',
                headers={'User-Agent': 'TrustHire-Verifier/1.0'},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status < 500
        except Exception:
            continue
    return False


def _count_employer_posts_24h(employer_id: str) -> int:
    """Count how many jobs the employer posted in the last 24 hours via Neon."""
    try:
        db_url = settings.DATABASES['default']
        conn = psycopg2.connect(
            dbname=db_url['NAME'],
            user=db_url['USER'],
            password=db_url['PASSWORD'],
            host=db_url['HOST'],
            port=db_url['PORT'],
            sslmode='require',
        )
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        with conn.cursor() as cur:
            cur.execute(
                'SELECT COUNT(*) FROM job_listings WHERE employer_id = %s AND created_at >= %s',
                (employer_id, cutoff)
            )
            count = cur.fetchone()[0]
        conn.close()
        return int(count)
    except Exception as e:
        logger.warning(f'Could not count employer posts: {e}')
        return 0
