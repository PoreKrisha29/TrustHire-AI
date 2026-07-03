"""
api/views/auth.py

Authentication endpoints for DevPulse AI.

Routes (all prefixed /api/v1/auth/):
    POST   /register          — create account + DevPulseProfile, return JWT pair
    POST   /login             — verify credentials, return JWT pair + user object
    POST   /refresh           — refresh access token
    GET    /me                — return current user (requires auth)
    POST   /github/callback   — GitHub OAuth: code → token → profile → create/login
"""

import requests as http_requests
from django.contrib.auth.hashers import make_password, check_password
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import JobSeekerAccount, DevPulseProfile
from api.views._auth import get_seeker, auth_error
from api.serializers import (
    JobSeekerSerializer,
    RegisterSerializer,
    LoginSerializer,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tokens_for_seeker(seeker: JobSeekerAccount) -> dict:
    """Generate a SimpleJWT token pair for a JobSeekerAccount instance."""
    # We store the seeker's UUID in the token subject (sub claim).
    # SimpleJWT usually wraps Django User — here we build the token manually.
    refresh = RefreshToken()
    refresh["user_id"]   = str(seeker.id)
    refresh["email"]     = seeker.email
    refresh["full_name"] = seeker.full_name
    return {
        "access":  str(refresh.access_token),
        "refresh": str(refresh),
    }



# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new JobSeekerAccount.
    - Hashes password with Django's make_password (PBKDF2-SHA256).
    - Auto-creates a DevPulseProfile for gamification.
    - Returns JWT access + refresh tokens and the user object.
    """
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = serializer.validated_data

    seeker = JobSeekerAccount.objects.create(
        full_name     = data["full_name"].strip(),
        email         = data["email"],
        password_hash = make_password(data["password"]),
    )

    # Auto-create gamification profile
    DevPulseProfile.objects.create(seeker=seeker)

    tokens      = _tokens_for_seeker(seeker)
    user_data   = JobSeekerSerializer(seeker).data

    return Response(
        {
            "success": True,
            "message": "Account created successfully.",
            "data": {
                "user":    user_data,
                "access":  tokens["access"],
                "refresh": tokens["refresh"],
            },
        },
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Authenticate a seeker with email + password.
    Returns access token, refresh token, and the user object.
    """
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"success": False, "errors": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email    = serializer.validated_data["email"].lower()
    password = serializer.validated_data["password"]

    try:
        seeker = JobSeekerAccount.objects.select_related("devpulse_profile").get(
            email=email
        )
    except JobSeekerAccount.DoesNotExist:
        return Response(
            {"success": False, "message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not seeker.is_active:
        return Response(
            {"success": False, "message": "This account has been deactivated."},
            status=status.HTTP_403_FORBIDDEN,
        )

    if not check_password(password, seeker.password_hash):
        return Response(
            {"success": False, "message": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    tokens    = _tokens_for_seeker(seeker)
    user_data = JobSeekerSerializer(seeker).data

    return Response(
        {
            "success": True,
            "message": "Login successful.",
            "data": {
                "user":    user_data,
                "access":  tokens["access"],
                "refresh": tokens["refresh"],
            },
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def token_refresh(request):
    """
    Refresh an expired access token using a valid refresh token.
    Expects JSON body: { "refresh": "<token>" }
    """
    refresh_token_str = request.data.get("refresh")
    if not refresh_token_str:
        return Response(
            {"success": False, "message": "Refresh token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        refresh = RefreshToken(refresh_token_str)
        return Response(
            {
                "success": True,
                "data": {
                    "access":  str(refresh.access_token),
                    "refresh": str(refresh),   # rotated token
                },
            },
            status=status.HTTP_200_OK,
        )
    except Exception as exc:  # noqa: BLE001
        return Response(
            {"success": False, "message": "Invalid or expired refresh token."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Return the profile of the currently authenticated seeker.
    Requires a valid Bearer access token.
    """
    seeker = get_seeker(request)
    if not seeker:
        return Response(
            {"success": False, "message": "User not found or account inactive."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "data": JobSeekerSerializer(seeker).data,
        },
        status=status.HTTP_200_OK,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/github/callback
# ---------------------------------------------------------------------------

GITHUB_TOKEN_URL   = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL    = "https://api.github.com/user"
GITHUB_EMAILS_URL  = "https://api.github.com/user/emails"


@api_view(["POST"])
@permission_classes([AllowAny])
def github_callback(request):
    """
    Exchange a GitHub OAuth code for a user profile, then create or log in
    a JobSeekerAccount.

    Expects JSON body: { "code": "<github_oauth_code>" }
    Requires GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Django settings.
    """
    from django.conf import settings

    code = request.data.get("code")
    if not code:
        return Response(
            {"success": False, "message": "GitHub code is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    client_id     = getattr(settings, "GITHUB_CLIENT_ID", "")
    client_secret = getattr(settings, "GITHUB_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        return Response(
            {"success": False, "message": "GitHub OAuth is not configured on this server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Step 1 — Exchange code for GitHub access token
    gh_token_resp = http_requests.post(
        GITHUB_TOKEN_URL,
        json={
            "client_id":     client_id,
            "client_secret": client_secret,
            "code":          code,
        },
        headers={"Accept": "application/json"},
        timeout=10,
    )
    gh_token_data = gh_token_resp.json()
    gh_token = gh_token_data.get("access_token")

    if not gh_token:
        return Response(
            {"success": False, "message": "Failed to obtain GitHub access token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    gh_headers = {"Authorization": f"Bearer {gh_token}", "Accept": "application/json"}

    # Step 2 — Fetch GitHub user profile
    gh_user = http_requests.get(GITHUB_USER_URL, headers=gh_headers, timeout=10).json()

    # Step 3 — Fetch primary verified email (GitHub may not expose it in profile)
    email = gh_user.get("email")
    if not email:
        emails_resp = http_requests.get(GITHUB_EMAILS_URL, headers=gh_headers, timeout=10).json()
        primary = next(
            (e for e in emails_resp if e.get("primary") and e.get("verified")),
            None,
        )
        email = primary["email"] if primary else None

    if not email:
        return Response(
            {"success": False, "message": "Could not retrieve a verified email from GitHub."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    email = email.lower()

    # Step 4 — Create or retrieve the seeker
    created = False
    try:
        seeker = JobSeekerAccount.objects.select_related("devpulse_profile").get(email=email)
    except JobSeekerAccount.DoesNotExist:
        seeker = JobSeekerAccount.objects.create(
            full_name     = gh_user.get("name") or gh_user.get("login", "GitHub User"),
            email         = email,
            password_hash = make_password(None),   # unusable password — OAuth only
        )
        DevPulseProfile.objects.create(
            seeker     = seeker,
            github_url = gh_user.get("html_url", ""),
        )
        created = True
    else:
        # Update GitHub URL if not set
        if hasattr(seeker, "devpulse_profile") and not seeker.devpulse_profile.github_url:
            seeker.devpulse_profile.github_url = gh_user.get("html_url", "")
            seeker.devpulse_profile.save(update_fields=["github_url"])

    if not seeker.is_active:
        return Response(
            {"success": False, "message": "This account has been deactivated."},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens    = _tokens_for_seeker(seeker)
    user_data = JobSeekerSerializer(seeker).data

    return Response(
        {
            "success": True,
            "message": "Account created via GitHub." if created else "Logged in via GitHub.",
            "data": {
                "user":    user_data,
                "access":  tokens["access"],
                "refresh": tokens["refresh"],
            },
        },
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )
