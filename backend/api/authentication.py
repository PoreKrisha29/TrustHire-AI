"""
api/authentication.py

Custom JWT authenticator that decodes our token and sets request.auth
to the token payload WITHOUT trying to look up a Django auth.User.

Our views extract the seeker using api.views._auth.get_seeker(request),
which reads request.auth["user_id"] and looks up JobSeekerAccount directly.
"""

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser


class DevPulseJWTAuthentication(BaseAuthentication):
    """
    Validates the Bearer JWT and exposes its payload as request.auth.
    Does NOT perform a database user lookup — our custom user model
    (JobSeekerAccount) is fetched per-view via get_seeker(request).
    """

    def authenticate(self, request):
        # Extract Bearer token from header
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Bearer "):
            return None  # No token → anonymous

        raw_token = header.split(" ", 1)[1].strip()
        if not raw_token:
            return None

        # Validate + decode using SimpleJWT's token validator
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(raw_token)
        except (InvalidToken, TokenError) as exc:
            raise AuthenticationFailed(str(exc))

        # Return (user, token_payload)
        # We return AnonymousUser because we don't use Django's User model.
        # Each view uses get_seeker(request) to fetch the JobSeekerAccount.
        return (AnonymousUser(), validated_token)

    def authenticate_header(self, request):
        return 'Bearer realm="api"'
