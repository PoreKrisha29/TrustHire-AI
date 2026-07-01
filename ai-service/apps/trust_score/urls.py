from django.urls import path
from .views import TrustScoreView

urlpatterns = [
    path('trust-score', TrustScoreView.as_view(), name='trust-score'),
]
