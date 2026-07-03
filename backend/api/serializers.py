"""
api/serializers.py

DRF serializers for the DevPulse / TrustHire AI platform.
"""

from rest_framework import serializers
from .models import JobSeekerAccount, DevPulseProfile


# ---------------------------------------------------------------------------
# DevPulse profile (nested, read-only)
# ---------------------------------------------------------------------------

class DevPulseProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DevPulseProfile
        fields = [
            "level",
            "total_xp",
            "streak_days",
            "career_health_score",
            "target_role",
        ]


# ---------------------------------------------------------------------------
# JobSeeker serializer (safe — no password)
# ---------------------------------------------------------------------------

class JobSeekerSerializer(serializers.ModelSerializer):
    """
    Full public representation of a job seeker.
    Nested devpulse_profile is included read-only.
    """
    devpulse_profile = DevPulseProfileSerializer(read_only=True)

    class Meta:
        model  = JobSeekerAccount
        fields = [
            "id",
            "email",
            "full_name",
            "headline",
            "tier",
            "devpulse_profile",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Registration input serializer (write-only)
# ---------------------------------------------------------------------------

class RegisterSerializer(serializers.Serializer):
    full_name        = serializers.CharField(max_length=150)
    email            = serializers.EmailField()
    password         = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value):
        if JobSeekerAccount.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


# ---------------------------------------------------------------------------
# Login input serializer (write-only)
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)
