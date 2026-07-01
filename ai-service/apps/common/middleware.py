from django.conf import settings
from django.http import JsonResponse


class InternalAPIKeyMiddleware:
    """
    Validates X-Internal-API-Key header on all /ai/* routes.
    Rejects requests without the correct key with 401.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only protect /ai/* endpoints
        if request.path.startswith('/ai/'):
            key = request.headers.get('X-Internal-API-Key', '')
            if key != settings.INTERNAL_API_KEY:
                return JsonResponse(
                    {'success': False, 'error': 'Unauthorized', 'message': 'Invalid or missing X-Internal-API-Key header.'},
                    status=401
                )
        return self.get_response(request)
