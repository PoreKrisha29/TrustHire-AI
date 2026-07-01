"""
TrustHire AI — Django Settings
AI Microservice for Trust Score, Resume Analysis, Matching, and Career Assistant
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'trusthire-ai-service-dev-secret-key-change-in-prod')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,0.0.0.0').split(',')

# ── Application definition ─────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'rest_framework',
    'corsheaders',
    'apps.trust_score',
    'apps.resume',
    'apps.matching',
    'apps.assistant',
    'apps.verify',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
    'apps.common.middleware.InternalAPIKeyMiddleware',
]

ROOT_URLCONF = 'trusthire_ai.urls'
WSGI_APPLICATION = 'trusthire_ai.wsgi.application'

# ── Database (Neon PostgreSQL) ─────────────────────────────────────
import urllib.parse

_db_url = os.getenv('DATABASE_URL', '')
if _db_url:
    _parsed = urllib.parse.urlparse(_db_url)
    DATABASES = {
        'default': {
            'ENGINE':   'django.db.backends.postgresql',
            'NAME':     _parsed.path.lstrip('/'),
            'USER':     _parsed.username,
            'PASSWORD': _parsed.password,
            'HOST':     _parsed.hostname,
            'PORT':     _parsed.port or 5432,
            'OPTIONS':  {'sslmode': 'require'},
        }
    }
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}

# ── REST Framework ─────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES':   ['rest_framework.parsers.JSONParser'],
    'EXCEPTION_HANDLER':        'apps.common.exceptions.custom_exception_handler',
}

# ── CORS (allow Node.js backend on port 3001) ─────────────────────
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]
CORS_ALLOW_ALL_ORIGINS = DEBUG  # allow all in dev

# ── Gemini API ─────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_MODEL   = os.getenv('GEMINI_MODEL', 'gemini-1.5-flash')

# ── Internal Security ──────────────────────────────────────────────
INTERNAL_API_KEY = os.getenv('INTERNAL_API_KEY', 'trusthire_internal_key_dev_secret_32chars')

# ── AI Service ────────────────────────────────────────────────────
NODE_BACKEND_URL = os.getenv('NODE_BACKEND_URL', 'http://localhost:3001')
SBERT_MODEL_NAME = os.getenv('SBERT_MODEL_NAME', 'all-MiniLM-L6-v2')

# ── Internationalization ──────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = False
USE_TZ        = True

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Logging ────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '[{levelname}] {asctime} {module}: {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'root': {'handlers': ['console'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
    },
}
