from django.urls import path
from .views import ResumeAnalyzeView

urlpatterns = [
    path('resume/analyze', ResumeAnalyzeView.as_view(), name='resume-analyze'),
]
