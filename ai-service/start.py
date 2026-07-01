#!/usr/bin/env python
"""
Development startup script for TrustHire AI Django service.
Run: python start.py

Production: gunicorn trusthire_ai.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
"""

import os
import sys
import subprocess

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trusthire_ai.settings')

    # Pre-flight: check Gemini API key
    from dotenv import load_dotenv
    load_dotenv()
    if not os.getenv('GEMINI_API_KEY'):
        print('⚠️  WARNING: GEMINI_API_KEY not set — AI features will use fallback responses.')
        print('   Get a free key at: https://aistudio.google.com/app/apikey')
        print()

    port = os.getenv('PORT', '8000')
    print(f'🚀 Starting TrustHire AI service on http://localhost:{port}')
    print(f'   Endpoints: /ai/trust-score, /ai/resume/analyze, /ai/chat, /ai/match, /ai/recommend')
    print()

    subprocess.run([
        sys.executable, 'manage.py', 'runserver', f'0.0.0.0:{port}',
    ])
