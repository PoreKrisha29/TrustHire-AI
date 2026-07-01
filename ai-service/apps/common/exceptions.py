from rest_framework.views import exception_handler
from rest_framework.response import Response


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        response.data = {
            'success': False,
            'error': str(exc),
            'message': response.data.get('detail', str(exc)) if isinstance(response.data, dict) else str(response.data),
        }
    return response
