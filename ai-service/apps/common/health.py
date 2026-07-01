"""
Health check endpoint — GET /ai/health
Returns service status, model load state, and version.
"""
from django.http import JsonResponse
from django.views import View
from apps.matching.views import _model as sbert_model


class HealthView(View):
    def get(self, request):
        return JsonResponse({
            'success': True,
            'data': {
                'service':      'TrustHire AI Microservice',
                'status':       'running',
                'version':      '1.0.0',
                'sbertLoaded':  sbert_model is not None,
                'endpoints': [
                    'POST /ai/trust-score',
                    'POST /ai/resume/analyze',
                    'POST /ai/chat',
                    'POST /ai/match',
                    'POST /ai/embed/candidate',
                    'POST /ai/embed/job',
                    'POST /ai/recommend',
                    'POST /ai/verify/company',
                    'GET  /ai/health',
                ],
            },
        })
