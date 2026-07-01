"""
TrustHire AI — Django AI Microservice
Main URL configuration
"""

from django.urls import path, include
from apps.common.health import HealthView

urlpatterns = [
    path('ai/health', HealthView.as_view(), name='health'),
    path('ai/', include('apps.trust_score.urls')),
    path('ai/', include('apps.resume.urls')),
    path('ai/', include('apps.matching.urls')),
    path('ai/', include('apps.assistant.urls')),
    path('ai/', include('apps.verify.urls')),
]
