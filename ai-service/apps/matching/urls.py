from django.urls import path
from .views import MatchScoreView, EmbedCandidateView, EmbedJobView, RecommendJobsView

urlpatterns = [
    path('match',          MatchScoreView.as_view(),    name='match-score'),
    path('embed/candidate', EmbedCandidateView.as_view(), name='embed-candidate'),
    path('embed/job',       EmbedJobView.as_view(),       name='embed-job'),
    path('recommend',       RecommendJobsView.as_view(),  name='recommend-jobs'),
]
