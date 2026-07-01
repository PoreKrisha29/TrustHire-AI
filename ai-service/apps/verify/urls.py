from django.urls import path
from .views import CompanyVerifyView

urlpatterns = [
    path('verify/company', CompanyVerifyView.as_view(), name='verify-company'),
]
