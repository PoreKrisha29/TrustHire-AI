"""
Semantic Matching Pipeline — POST /ai/match, POST /ai/embed

Uses SBERT (all-MiniLM-L6-v2) to compute cosine similarity between
candidate profiles and job listings.

Flow:
  1. POST /ai/embed/candidate — encode candidate profile text → 384-dim vector
  2. POST /ai/embed/job       — encode job listing text → 384-dim vector
  3. POST /ai/match           — cosine_similarity(candidate_vec, job_vec) → score 0-100
  4. POST /ai/recommend       — top-N similar jobs from Neon pgvector

Model is loaded once at module level and cached in memory.
"""

import logging
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# ── SBERT model (lazy-loaded on first use) ─────────────────────────
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer  # lazy import
        model_name = getattr(settings, 'SBERT_MODEL_NAME', 'all-MiniLM-L6-v2')
        logger.info(f'Loading SBERT model: {model_name}')
        _model = SentenceTransformer(model_name)
        logger.info('SBERT model loaded ✓')
    return _model


def _candidate_to_text(candidate: dict) -> str:
    """Convert candidate profile dict to searchable text for SBERT."""
    parts = []
    if candidate.get('jobTitle'):
        parts.append(f"Current role: {candidate['jobTitle']}")
    if candidate.get('skills'):
        skills = candidate['skills'] if isinstance(candidate['skills'], list) else json.loads(candidate['skills'])
        parts.append(f"Skills: {', '.join(skills)}")
    if candidate.get('yearsExperience') is not None:
        parts.append(f"Experience: {candidate['yearsExperience']} years")
    if candidate.get('location'):
        parts.append(f"Location: {candidate['location']}")
    if candidate.get('preferredJobTypes'):
        types = candidate['preferredJobTypes'] if isinstance(candidate['preferredJobTypes'], list) else json.loads(candidate['preferredJobTypes'])
        parts.append(f"Preferred job types: {', '.join(types)}")
    return ' | '.join(parts) or 'General candidate profile'


def _job_to_text(job: dict) -> str:
    """Convert job listing dict to searchable text for SBERT."""
    parts = [job.get('title', '')]
    if job.get('description'):
        parts.append(job['description'][:500])
    if job.get('requirements'):
        parts.append(job['requirements'][:300])
    if job.get('location'):
        parts.append(f"Location: {job['location']}")
    if job.get('jobType'):
        parts.append(f"Type: {job['jobType']}")
    return ' '.join(filter(None, parts))


class EmbedCandidateView(APIView):
    """POST /ai/embed/candidate — generate + store candidate embedding"""

    def post(self, request):
        candidate_id      = request.data.get('candidateId')
        candidate_profile = request.data.get('profile', {})

        if not candidate_id:
            return Response({'success': False, 'error': 'candidateId is required'}, status=400)

        text      = _candidate_to_text(candidate_profile)
        model     = _get_model()
        embedding = model.encode(text, normalize_embeddings=True).tolist()

        # Store in Neon via raw SQL (pgvector)
        _store_candidate_embedding(candidate_id, embedding)

        return Response({
            'success': True,
            'data': {'candidateId': candidate_id, 'dimensions': len(embedding)},
        })


class EmbedJobView(APIView):
    """POST /ai/embed/job — generate + store job embedding"""

    def post(self, request):
        job_id  = request.data.get('jobId')
        job_data = request.data.get('job', {})

        if not job_id:
            return Response({'success': False, 'error': 'jobId is required'}, status=400)

        text      = _job_to_text(job_data)
        model     = _get_model()
        embedding = model.encode(text, normalize_embeddings=True).tolist()

        _store_job_embedding(job_id, embedding)

        return Response({
            'success': True,
            'data': {'jobId': job_id, 'dimensions': len(embedding)},
        })


class MatchScoreView(APIView):
    """
    POST /ai/match
    Compute cosine similarity between a candidate and a job listing.
    Returns match score 0-100.
    """

    def post(self, request):
        candidate_profile = request.data.get('candidateProfile', {})
        job_data          = request.data.get('jobData', {})
        candidate_id      = request.data.get('candidateId')
        job_id            = request.data.get('jobId')

        if not (candidate_profile or candidate_id) or not (job_data or job_id):
            return Response({'success': False, 'error': 'candidateProfile/candidateId and jobData/jobId are required'}, status=400)

        model = _get_model()

        # Use stored embeddings if IDs provided, else encode on-the-fly
        if candidate_id and job_id:
            c_vec = _load_candidate_embedding(candidate_id)
            j_vec = _load_job_embedding(job_id)
            if c_vec is not None and j_vec is not None:
                score = _cosine_score(c_vec, j_vec)
                return Response({'success': True, 'data': {'candidateId': candidate_id, 'jobId': job_id, 'score': score}})

        # Fallback: encode inline
        c_text = _candidate_to_text(candidate_profile) if candidate_profile else ''
        j_text = _job_to_text(job_data) if job_data else ''

        if not c_text or not j_text:
            return Response({'success': False, 'error': 'Could not build embedding texts'}, status=400)

        c_vec = model.encode(c_text, normalize_embeddings=True)
        j_vec = model.encode(j_text, normalize_embeddings=True)
        score = _cosine_score(c_vec, j_vec)

        return Response({'success': True, 'data': {'score': score}})


class RecommendJobsView(APIView):
    """
    POST /ai/recommend
    Given a candidate embedding, return top-N most similar job IDs
    using pgvector cosine similarity.
    """

    def post(self, request):
        candidate_id = request.data.get('candidateId')
        top_n        = min(int(request.data.get('topN', 10)), 50)

        if not candidate_id:
            return Response({'success': False, 'error': 'candidateId is required'}, status=400)

        jobs = _pgvector_recommend(candidate_id, top_n)
        return Response({'success': True, 'data': {'jobs': jobs, 'candidateId': candidate_id}})


# ── Helpers ────────────────────────────────────────────────────────

def _cosine_score(vec1, vec2) -> int:
    """Return cosine similarity as a 0-100 integer score."""
    v1 = np.array(vec1).reshape(1, -1)
    v2 = np.array(vec2).reshape(1, -1)
    similarity = cosine_similarity(v1, v2)[0][0]
    return max(0, min(100, int(similarity * 100)))


def _get_db_conn():
    """Get a raw psycopg2 connection to Neon."""
    import psycopg2
    db = settings.DATABASES['default']
    return psycopg2.connect(
        dbname=db['NAME'], user=db['USER'], password=db['PASSWORD'],
        host=db['HOST'], port=db['PORT'], sslmode='require',
    )


def _store_candidate_embedding(candidate_id: str, embedding: list):
    try:
        conn = _get_db_conn()
        vec_str = '[' + ','.join(map(str, embedding)) + ']'
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO candidate_embeddings (candidate_id, embedding, updated_at)
                VALUES (%s, %s::vector, NOW())
                ON CONFLICT (candidate_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
            """, (candidate_id, vec_str))
            conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f'Store candidate embedding error: {e}')


def _store_job_embedding(job_id: str, embedding: list):
    try:
        conn = _get_db_conn()
        vec_str = '[' + ','.join(map(str, embedding)) + ']'
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO job_embeddings (job_id, embedding, updated_at)
                VALUES (%s, %s::vector, NOW())
                ON CONFLICT (job_id)
                DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = NOW()
            """, (job_id, vec_str))
            conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f'Store job embedding error: {e}')


def _load_candidate_embedding(candidate_id: str):
    try:
        conn = _get_db_conn()
        with conn.cursor() as cur:
            cur.execute('SELECT embedding FROM candidate_embeddings WHERE candidate_id = %s', (candidate_id,))
            row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return [float(x) for x in row[0].strip('[]').split(',')]
    except Exception as e:
        logger.warning(f'Load candidate embedding error: {e}')
    return None


def _load_job_embedding(job_id: str):
    try:
        conn = _get_db_conn()
        with conn.cursor() as cur:
            cur.execute('SELECT embedding FROM job_embeddings WHERE job_id = %s', (job_id,))
            row = cur.fetchone()
        conn.close()
        if row and row[0]:
            return [float(x) for x in row[0].strip('[]').split(',')]
    except Exception as e:
        logger.warning(f'Load job embedding error: {e}')
    return None


def _pgvector_recommend(candidate_id: str, top_n: int) -> list:
    """Use pgvector <=> (cosine distance) to find nearest job embeddings."""
    try:
        conn = _get_db_conn()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT je.job_id,
                       ROUND((1 - (je.embedding <=> ce.embedding)) * 100)::int AS score
                FROM job_embeddings je,
                     candidate_embeddings ce
                WHERE ce.candidate_id = %s
                  AND je.job_id IN (
                      SELECT id FROM job_listings WHERE status = 'ACTIVE'
                  )
                ORDER BY je.embedding <=> ce.embedding
                LIMIT %s
            """, (candidate_id, top_n))
            rows = cur.fetchall()
        conn.close()
        return [{'jobId': str(r[0]), 'score': int(r[1])} for r in rows]
    except Exception as e:
        logger.error(f'pgvector recommend error: {e}')
        return []
