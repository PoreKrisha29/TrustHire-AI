"""
api URL patterns.
All routes mounted at /api/ by root urls.py.
"""

from django.urls import path

# ── Auth ──────────────────────────────────────────────────────────────────────
from api.views.auth import register, login, token_refresh, me, github_callback

# ── Resume Forge ──────────────────────────────────────────────────────────────
from api.views.resume import (
    upload_resume, enhance_resume, check_ats,
    download_resume, resume_drafts, resume_draft_detail,
)

# ── Dashboard ─────────────────────────────────────────────────────────────────
from api.views.dashboard import dashboard_stats

# ── Skills ────────────────────────────────────────────────────────────────────
from api.views.skills import list_skills, mark_skill_known, skill_catalog

# ── Learn & Certify ───────────────────────────────────────────────────────────
from api.views.certs import quiz_start, quiz_submit, list_certs, verify_cert

# ── Mock Interview ────────────────────────────────────────────────────────────
from api.views.interview import start_interview, submit_answer, list_sessions

# ── AI Career Coach ───────────────────────────────────────────────────────────
from api.views.coach import send_message

# ── Skill Battle Arena ────────────────────────────────────────────────────────
from api.views.battle import (
    find_battle, get_room, submit_battle,
    leaderboard, battle_history, daily_challenge,
)

# ── Project Vault ─────────────────────────────────────────────────────────────
from api.views.projects import project_list, project_detail, regenerate_bullets

# ── Market Pulse ──────────────────────────────────────────────────────────────
from api.views.market import market_trends, market_salary, market_gap

# ── Profile ────────────────────────────────────────────────────
from api.views.profile import user_profile

# ── Notifications ──────────────────────────────────────────────
from api.views.notifications import list_notifications, mark_read, mark_all_read


app_name = "api"

urlpatterns = [
    # ── Auth ───────────────────────────────────────────────────────────────
    path("v1/auth/register",         register,       name="auth-register"),
    path("v1/auth/login",            login,          name="auth-login"),
    path("v1/auth/refresh",          token_refresh,  name="auth-refresh"),
    path("v1/auth/me",               me,             name="auth-me"),
    path("v1/auth/github/callback",  github_callback,name="auth-github-callback"),

    # ── Resume Forge ────────────────────────────────────────────────────────
    path("v1/resume/upload",                    upload_resume,      name="resume-upload"),
    path("v1/resume/enhance",                   enhance_resume,     name="resume-enhance"),
    path("v1/resume/check-ats",                 check_ats,          name="resume-check-ats"),
    path("v1/resume/download",                  download_resume,    name="resume-download"),
    path("v1/resume/drafts",                    resume_drafts,      name="resume-drafts"),
    path("v1/resume/drafts/<str:draft_id>",     resume_draft_detail,name="resume-draft-detail"),

    # ── Dashboard ───────────────────────────────────────────────────────────
    path("v1/dashboard/stats",                  dashboard_stats,    name="dashboard-stats"),

    # ── Skills ──────────────────────────────────────────────────────────────
    path("v1/skills/catalog",                   skill_catalog,      name="skill-catalog"),
    path("v1/skills/mark-known",                mark_skill_known,   name="skill-mark-known"),
    path("v1/skills/",                          list_skills,        name="skill-list"),

    # ── Learn & Certify ─────────────────────────────────────────────────────
    path("v1/certs/quiz/start",                 quiz_start,         name="quiz-start"),
    path("v1/certs/quiz/submit",                quiz_submit,        name="quiz-submit"),
    path("v1/certs/",                           list_certs,         name="cert-list"),
    path("v1/certs/<str:unique_cert_id>",       verify_cert,        name="cert-verify"),

    # ── Mock Interview ───────────────────────────────────────────────────────
    path("v1/interview/start",                  start_interview,    name="interview-start"),
    path("v1/interview/answer",                 submit_answer,      name="interview-answer"),
    path("v1/interview/sessions",               list_sessions,      name="interview-sessions"),

    # ── AI Career Coach ──────────────────────────────────────────────────────
    path("v1/coach/message",                    send_message,       name="coach-message"),

    # 🏻── Skill Battle Arena ───────────────────────────────────────────────────
    path("v1/battle/find",                      find_battle,        name="battle-find"),
    path("v1/battle/room/<str:room_id>",        get_room,           name="battle-room"),
    path("v1/battle/submit",                    submit_battle,      name="battle-submit"),
    path("v1/battle/leaderboard",               leaderboard,        name="battle-leaderboard"),
    path("v1/battle/history",                   battle_history,     name="battle-history"),
    path("v1/battle/daily",                     daily_challenge,    name="battle-daily"),

    # ── Project Vault ────────────────────────────────────────────────────────
    path("v1/projects/",                        project_list,       name="project-list"),
    path("v1/projects/<str:project_id>",        project_detail,     name="project-detail"),
    path("v1/projects/<str:project_id>/regenerate", regenerate_bullets, name="project-regenerate"),

    # ── Market Pulse ─────────────────────────────────────────────────────────
    path("v1/market/trends",                    market_trends,      name="market-trends"),
    path("v1/market/salary",                    market_salary,      name="market-salary"),
    path("v1/market/gap",                       market_gap,         name="market-gap"),

    # ── Profile ────────────────────────────────────────────────
    path("v1/profile/",                         user_profile,       name="user-profile"),

    # ── Notifications ───────────────────────────────────────────
    path("v1/notifications/",                   list_notifications, name="notif-list"),
    path("v1/notifications/read-all",            mark_all_read,      name="notif-read-all"),
    path("v1/notifications/<str:notif_id>/read", mark_read,          name="notif-read"),
]
