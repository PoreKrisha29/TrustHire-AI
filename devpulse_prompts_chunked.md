# DevPulse AI — Multi-Part Build Prompts
> Send each part **one by one** to your AI in order. Each part is self-contained.

---

## ─── PART 0: Project Setup (Send First)

```
I am building a SaaS called "DevPulse AI" — a developer career platform.
Tech stack: Django 5 + DRF, Neon PostgreSQL (psycopg2), React 18 + Vite, Zustand, React Query, Google Gemini 1.5 Flash.
Styling: Vanilla CSS only, dark glassmorphism theme.

Set up the project skeleton:

BACKEND (folder: backend/):
- Django project named devpulse_backend
- Install: djangorestframework, djangorestframework-simplejwt, django-cors-headers, psycopg2-binary, google-generativeai, PyMuPDF, python-docx, reportlab, pillow, channels, channels-redis
- settings.py: configure Neon DB via DATABASE_URL env var, CORS allow localhost:5173, JWT auth, INSTALLED_APPS includes rest_framework, corsheaders, channels
- .env.example with: DATABASE_URL, SECRET_KEY, GEMINI_API_KEY, ALLOWED_HOSTS
- api/ app with empty models.py, views/, urls.py, serializers.py, agents/
- Main urls.py: include api.urls at /api/v1/
- requirements.txt

FRONTEND (folder: frontend/):
- Vite + React 18 project
- Install: react-router-dom, zustand, @tanstack/react-query, react-hot-toast, lucide-react, axios
- folder structure:
  src/
    pages/ (empty)
    components/ (empty)
    stores/authStore.js (empty Zustand store)
    lib/api.js (fetch wrapper with JWT auto-inject)
    globals.css (CSS variables + reset)
    App.jsx (Router shell, no routes yet)
    main.jsx
- globals.css variables:
  --bg: #07070f
  --surface: rgba(255,255,255,0.04)
  --border: rgba(255,255,255,0.08)
  --accent: #6366f1
  --accent2: #8b5cf6
  --text: #f1f5f9
  --muted: #94a3b8
  Font: Inter from Google Fonts

Give me all files with full content.
```

---

## ─── PART 1: Database Models

```
Continue building DevPulse AI (Django + Neon PostgreSQL).
Create backend/api/models.py with ALL these models (UUID primary keys, explicit db_table names):

1. JobSeekerAccount — (full_name, email, password_hash, phone, location, headline, resume_file_path, resume_data JSONField, enhanced_resume JSONField, skills JSONField, tier default "free", is_active, created_at, updated_at)

2. DevPulseProfile — 1:1 with JobSeekerAccount (username unique nullable, level default "Intern", total_xp int default 0, streak_days int, last_activity DateField nullable, career_health_score int default 0, target_role nullable, github_url URLField nullable, linkedin_url URLField nullable)
   XP levels: 0=Intern, 500=Junior, 1500=Mid, 3500=Senior, 7000=Principal, 12000=Legend
   Add recalculate_level() method.

3. XPTransaction — (seeker FK, event_type varchar 60, xp_amount int, description varchar 200, created_at)

4. UserBadge — (seeker FK, badge_name varchar 60, badge_icon varchar 10 emoji, earned_at). Unique together seeker+badge_name.

5. UserSkill — (seeker FK, skill_name, domain nullable, is_certified bool default False, is_self_marked bool default False, xp_contribution int default 0). Unique seeker+skill_name.

6. Certificate — (seeker FK, skill_name, score int 0-100, unique_cert_id varchar 30 unique e.g. DP-2025-REACT-4829, pdf_path nullable, issued_at)

7. QuizAttempt — (seeker FK, skill_name, score int, passed bool, attempted_at)

8. ResumeDraft — (seeker FK, title, template_id default "modern", content JSONField, ats_score FloatField nullable, ats_report JSONField nullable, exported_pdf_path nullable, is_active bool default False, created_at, updated_at)

9. InterviewSession — (seeker FK, role varchar 100, round_type choices: technical|hr|system_design, readiness_score int nullable, completed_at nullable, created_at)

10. InterviewAnswer — (session FK, question TextField, user_answer TextField blank, ai_score int nullable, ai_feedback TextField blank, model_answer TextField blank, created_at)

11. BattleRoom — (room_id UUID unique, skill, player1 FK seeker, player2 FK seeker nullable, status choices: waiting|active|done, winner FK seeker nullable, questions JSONField, created_at)

12. BattleSubmission — (room FK, seeker FK, answers JSONField, score int, time_taken_seconds int, submitted_at). Unique room+seeker.

13. DailyChallenge — (skill, question TextField, options JSONField list of 4, correct_answer int 0-indexed, challenge_date DateField unique)

14. Project — (seeker FK, title, description TextField blank, tech_stack JSONField, github_url URLField nullable, live_url URLField nullable, ai_bullets JSONField default list, skills_extracted JSONField default list, is_pinned bool default False, created_at)

15. JobApplication — (seeker FK, job_title, company_name, job_url nullable, cover_note TextField nullable, status choices: applied|shortlisted|rejected|hired default "applied", applied_at, updated_at)

16. Notification — (seeker FK, type choices: status_updated|new_match|general, title, message TextField, is_read bool default False, link nullable, created_at). Order by -created_at.

Also create and run migrations. Give full models.py file.
```

---

## ─── PART 2: Auth System

```
Continue DevPulse AI. Add authentication to the Django backend and React frontend.

BACKEND — backend/api/views/auth.py:
Endpoints (all under /api/v1/auth/):
  POST /register → create JobSeekerAccount (hash password with Django's make_password), auto-create DevPulseProfile, return JWT tokens
  POST /login → verify email+password (check_password), return access + refresh JWT tokens + user object
  POST /refresh → refresh access token
  GET  /me → return current user profile (requires auth)
  POST /github/callback → receive GitHub code, exchange for token, fetch GitHub profile, create/login user

JWT: use djangorestframework-simplejwt. Access token 1 day, refresh 30 days.
Store token key: "vish_seeker_token" in localStorage.

Serializers in serializers.py:
- JobSeekerSerializer: id, email, full_name, headline, tier, devpulse profile (level, total_xp, streak_days, career_health_score, target_role)

FRONTEND:
stores/authStore.js (Zustand):
- state: user, token, isAuthenticated
- actions: login(email, password), logout(), initFromStorage()
- persist token in localStorage key "vish_seeker_token"

pages/auth/LoginPage.jsx:
- Dark glassmorphism card, DevPulse logo/name top
- Email + Password fields
- "Sign In" gradient button (#6366f1 → #8b5cf6)
- Link to register
- Show error toast on failure
- On success: redirect to /dashboard

pages/auth/RegisterPage.jsx:
- Full name, email, password, confirm password
- Role selector (hidden, default "job_seeker")
- Gradient register button
- Link to login
- Show success toast, redirect to /login

components/ProtectedRoute.jsx:
- If no token → redirect to /login
- Else → render children

Update App.jsx with routes: /, /login, /register, /dashboard (protected, Outlet).
Give all files with full content.
```

---

## ─── PART 3: Resume Forge (AI-Powered Resume Engine)

```
Continue DevPulse AI. Build the Resume Forge module — a 5-step AI resume wizard.

BACKEND:

1. backend/agents/resume_parser_agent.py:
   - parse_pdf(file_bytes) → dict {name, email, phone, summary, skills[], experience[], education[], projects[]}
   - parse_docx(file_bytes) → same dict
   - Use PyMuPDF (fitz) for PDF, python-docx for DOCX
   - Extract text, send to Gemini with structured extraction prompt
   - Return parsed JSON (skills as flat list of strings, experience as list of dicts)

2. backend/agents/resume_enhancer_agent.py:
   - enhance(resume_data dict, job_description str) → {enhanced_experience[], enhanced_summary, keyword_coverage{matched[], missing[]}}
   - Rewrite each bullet in STAR format, inject target keywords naturally

3. backend/agents/ats_compatibility_agent.py:
   - check(resume_data dict, job_description str) → {total_score 0-100, breakdown{keyword_match, formatting, experience, skills_coverage, education}, issues[], recommendations[]}
   - IMPORTANT: skills may be list of str OR list of dict {"skill": "Python"} — handle both safely before joining

4. backend/agents/resume_pdf_renderer.py:
   - render_pdf(resume_data dict, template_type str) → bytes
   - template_type: "modern" (indigo sidebar), "classic" (clean), "minimal" (no color)
   - Use ReportLab

5. backend/api/views/resume.py — endpoints under /api/v1/resume/:
   POST /upload → parse PDF/DOCX, store resume_data on JobSeekerAccount, return parsed data
   POST /enhance → call enhancer agent with resume_data + job_description from request body
   POST /check-ats → call ATS agent, return score report
   POST /download → render PDF via renderer, return file download (Content-Disposition: attachment)
   GET  /drafts → list user's ResumeDraft objects
   POST /drafts → create new draft
   PATCH/DELETE /drafts/:id

FRONTEND — pages/dashboard/MyResumePage.jsx:
6-step wizard with stepper progress bar at top. Dark glassmorphism throughout.

Step 1 – Upload Resume:
- Drag & drop zone (dashed border, cloud upload icon)
- Accepts PDF, DOCX
- After upload: show parsed data preview (name, skills chips, experience list)

Step 2 – AI Enhancement:
- Textarea: "Paste target job description"
- "Enhance with AI" gradient button
- Show loading skeleton while enhancing
- After: side-by-side comparison card (Original bullet | Enhanced bullet)
- Show keyword coverage: matched (green chips), missing (red chips)

Step 3 – ATS Score:
- "Check ATS Score" button
- Animated score ring (SVG) showing total score 0–100
- Category bars: Keyword Match, Formatting, Experience, Skills, Education
- Issues list with ⚠️ icon, Recommendations with ✓ icon

Step 4 – Template:
- 3 template preview cards: Modern, Classic, Minimal
- Click to select (purple glow border on selected)

Step 5 – Download:
- "Download PDF" button → POST /resume/download
- "Download DOCX" button (if implemented)
- "Copy Plain Text" button

Step 6 – Drafts:
- List of saved ResumeDraft cards (title, ATS score, template, last updated)
- "Set Active" button per draft
- "New Draft" button

Style: same dark glassmorphism as the rest of the app. No white backgrounds anywhere.
Give all files with full content.
```

---

## ─── PART 4: Dashboard Home + Skill Genome

```
Continue DevPulse AI. Build the Career Dashboard Home and Skill Genome pages.

BACKEND — /api/v1/:
GET /dashboard/stats → return:
  {
    career_health_score, level, total_xp, xp_to_next_level,
    streak_days, certs_count, battles_won, resume_ats_score,
    recent_badges [{badge_name, badge_icon, earned_at}],
    recent_xp [{event_type, xp_amount, created_at}]
  }
  career_health_score = weighted average of: (ats_score * 0.3) + (certs * 5, capped 30) + (streak * 2, capped 20) + (projects_count * 3, capped 20)

GET /skills/ → list user's UserSkill objects grouped by domain
POST /skills/mark-known → body {skill_name, domain} → toggle is_self_marked, create UserSkill if not exists
GET /skills/catalog → return a hardcoded dict of all skills organized by domain (you define a comprehensive list covering: Web Frontend, Backend, DevOps, Databases, Mobile, Data/ML, Tools)

FRONTEND:

pages/dashboard/CareerDashboardPage.jsx — Career Command Center:
Layout: grid of cards, max-width 1200px

Top row (4 stat cards):
  - Career Health Score: large circular gauge (SVG, indigo arc), number center, label below
  - Level Badge: current level name, XP bar showing progress to next level (e.g. "2400 / 3500 XP")
  - Streak: flame emoji 🔥, number of days, "Keep it up!" label
  - Certs Earned: trophy icon, count, "verified skills"

Middle row:
  - Recent Badges: horizontal scroll of badge chips (icon + name, purple glow)
  - AI Nudge card: indigo gradient left border, italic text "You're 600 XP away from Senior Developer — crush 3 more quizzes!"
  - Quick actions: 4 buttons "Today's Challenge ⚡", "Mock Interview 🎤", "Skill Battle ⚔️", "Upload Resume 📄"

Bottom row:
  - XP Timeline: last 7 days, simple bar chart (CSS bars, no library), show daily XP earned
  - Top Skills: top 5 certified skills as chips with domain color coding

pages/dashboard/SkillGenomePage.jsx — Skill Genome:
Layout: left sidebar domain filter + right skill grid

Left sidebar:
  - "All Domains" + domain list: Web Frontend, Backend, DevOps, Databases, Mobile, Data/ML, Tools
  - Clicking filters the right grid

Right skill grid (3-4 columns):
  Each skill card:
    - Skill name
    - Status icon: 🔒 locked, ✋ known (blue border), ✅ certified (purple glow)
    - XP contribution badge if certified
    - Click → expand bottom drawer with: description, "Mark as Known" toggle, "Certify this skill →" link button

Top stats bar:
  - Total skills known: X | Certified: Y | Coverage for [target_role]: Z%

Give all files with full content.
```

---

## ─── PART 5: Learn & Certify + Mock Interview

```
Continue DevPulse AI. Build Learn & Certify (quiz + certs) and Mock Interview pages.

BACKEND:

1. backend/agents/quiz_generator_agent.py:
   generate_quiz(skill_name, difficulty="medium") → list of exactly 10 dicts:
   [{question str, options [4 strings], correct_answer int 0-indexed, explanation str}]
   Use Gemini. Prompt must enforce: no duplicate questions, clear distractors, practical not trivia.

2. backend/api/views/certs.py — /api/v1/certs/:
   POST /quiz/start → body {skill_name} → generate 10 questions, return them (do NOT store answers server-side yet, store questions temporarily in session or return them)
   POST /quiz/submit → body {skill_name, answers [int array]} → grade against correct_answer, calculate score, if score >= 70:
     - Create Certificate (unique_cert_id = f"DP-{year}-{skill_upper}-{random 4 digits}")
     - Create/update UserSkill (is_certified=True)
     - Create XPTransaction (+200 XP)
     - Call DevPulseProfile.recalculate_level() and save
     - Return: {passed, score, cert_id if passed, wrong_answers [{question, user_answer, correct_answer, explanation}], xp_gained}
   GET / → list user's certificates
   GET /:unique_cert_id → public endpoint (no auth), return cert details for verification

3. backend/agents/interview_agent.py:
   generate_questions(role, round_type) → list of 5 question strings
   grade_answer(question, user_answer, role) → {score 1-10, feedback str paragraph, model_answer str}

4. backend/api/views/interview.py — /api/v1/interview/:
   POST /start → body {role, round_type} → create InterviewSession, generate 5 questions, store in session, return session_id + first question
   POST /answer → body {session_id, question_index, user_answer} → grade with AI, store InterviewAnswer, return {score, feedback, model_answer, next_question or results if last}
   GET /sessions → list past sessions with readiness_score
   On session complete: award XP (+50 always, +100 bonus if readiness >= 80), recalculate level

FRONTEND:

pages/dashboard/LearnCertifyPage.jsx:
State machine: "catalog" | "quiz" | "results"

Catalog view:
  - Search bar + domain filter tabs
  - Skill cards grid: skill name, difficulty dots (●●○), estimated time, XP reward badge, "Start Quiz →" button
  - "Your Certificates" section at bottom: cert cards with unique_cert_id, issue date, "View" button

Quiz view:
  - Progress bar top: "Question 3 of 10"
  - Countdown timer circle: 60s per question (red when < 10s) — auto-advance on timeout
  - Question card: question text, 4 option buttons (click to select, highlight selected)
  - "Next Question" button (disabled until option selected)
  - On last question: "Submit Quiz" button

Results view:
  - Score ring: animated SVG circle fills to score percentage (green if pass, red if fail)
  - "🎉 Certified!" or "Try Again" headline
  - Pass: show cert card (name, skill, unique ID, date) + "+200 XP" animated chip
  - Fail: show wrong answers breakdown (question, your answer ❌, correct answer ✅, explanation)
  - Buttons: "Back to Catalog" | "Retry (24h cooldown)"

pages/dashboard/MockInterviewPage.jsx:
State machine: "setup" | "interview" | "results"

Setup view:
  - Role selector: Frontend Dev, Backend Dev, Full Stack, DevOps, Data Engineer (card buttons with icons)
  - Round type: Technical 💻, HR 🤝, System Design 🏗️
  - "Start Interview →" gradient button

Interview view:
  - Question number header: "Question 2 of 5"
  - Big question card (dark surface, readable text)
  - Large textarea: "Type your answer..."
  - Countdown timer bar (optional, not strict)
  - "Submit Answer" button → shows AI feedback drawer before next question
  - Feedback drawer (slide up): score badge (1-10), feedback paragraph, model answer (collapsible)
  - "Next Question →" button

Results view:
  - Readiness Score ring
  - Summary: "Strong: System design, Weak: Concurrency"
  - XP awarded chip
  - "Practice Again" | "View History" buttons
  - Past sessions list: role, round, score, date

Give all files with full content.
```

---

## ─── PART 6: AI Career Coach + Skill Battle Arena

```
Continue DevPulse AI. Build the AI Career Coach and Skill Battle Arena pages.

BACKEND:

1. backend/agents/career_coach_agent.py:
   chat(user_message str, history list[{role, content}], user_context dict) → response str
   user_context: {skills[], level, target_role, ats_score, streak_days}
   System prompt: "You are Pulse, a senior engineer career mentor. Be concise, direct, no fluff. User context: [inject context]"
   Use Gemini. Non-streaming for simplicity.

2. backend/api/views/coach.py — /api/v1/coach/:
   POST /message → body {message, history[]} → call agent, return {response}
   Rate limit: free users max 10 messages/day (check XPTransaction count or add a daily_message_count to DevPulseProfile)

3. backend/agents/quiz_generator_agent.py (reuse) for battle questions.

4. backend/api/views/battle.py — /api/v1/battle/:
   POST /find → body {skill} → look for a waiting BattleRoom for that skill, if found join it (set player2), if not create new room (status=waiting), return {room_id, status}
   GET /room/:room_id → return room status, questions (if active), both player scores
   POST /submit → body {room_id, answers [int array], time_taken} → create BattleSubmission, check if both submitted, if yes determine winner, update BattleRoom status=done, award XP (winner +150, loser +50)
   GET /leaderboard → top 50 DevPulseProfiles by total_xp, return [{username, level, total_xp, target_role}]
   GET /history → user's BattleRooms (as player1 or player2), with result
   GET /daily-challenge → today's DailyChallenge
   POST /daily-challenge → body {answer int} → check answer, if correct award +25 XP, return {correct, xp_gained, explanation}

NOTE: Skip WebSocket for now, use polling (GET /room/:room_id every 2 seconds in frontend to check opponent joined + scores).

FRONTEND:

pages/dashboard/AICareerCoachPage.jsx:
- Full-height flex column: messages area (scrollable, flex-grow) + input bar (fixed bottom)
- Messages: user bubbles right (indigo gradient bg), AI bubbles left (dark surface)
- AI avatar: small purple circle with "P" (Pulse)
- Input: text input + "Send" button (Enter to send)
- Suggested prompts panel (first load, before any message):
  Quick prompt chips: "What skills do I need for FAANG?", "Review my career roadmap", "How to negotiate salary?", "What should I learn next?"
- Loading: animated 3-dot typing indicator while waiting for response
- Show message count remaining for free users: "8 messages left today"

pages/dashboard/SkillBattlePage.jsx:
State machine: "lobby" | "waiting" | "battle" | "results"

Lobby view:
  - Header: "Skill Battle Arena ⚔️"
  - Skill input: "Enter a skill to battle on" (e.g. React, Python, Docker)
  - "Find Opponent" gradient button
  - Leaderboard tab: table with rank, username, level badge, XP
  - Daily Challenge card: today's skill, question preview, "Answer Today's Challenge" button

Waiting view:
  - Animated pulse ring: "Finding opponent for [skill]..."
  - Cancel button
  - Poll /battle/find or /battle/room/:id every 3 seconds
  - Timeout: after 30s show "No opponent found — try another skill"

Battle view:
  - Question number + timer bar (30s countdown)
  - Question card + 4 option buttons
  - Bottom: "Your Score: X | Opponent: Y" (poll for opponent score)
  - Auto-advance on timer expire (count as wrong)

Results view:
  - Winner/Loser banner (confetti CSS animation on win)
  - XP chip: "+150 XP" or "+50 XP"
  - "Rematch" | "New Battle" | "Back to Lobby" buttons

Give all files with full content.
```

---

## ─── PART 7: Project Vault + Market Pulse + Navigation Shell

```
Continue DevPulse AI. Build Project Vault, Market Pulse, and the full dashboard navigation shell.

BACKEND:

1. backend/agents/project_agent.py:
   generate_bullets(title, description, tech_stack list) → list of 3-5 strings (impact bullet points)
   extract_skills(title, description, tech_stack list) → list of skill name strings
   Use Gemini. Bullets should be STAR-format impact statements, not generic descriptions.

2. backend/api/views/projects.py — /api/v1/projects/:
   GET /          → list user's projects (ordered by is_pinned desc, created_at desc)
   POST /         → create project, call generate_bullets and extract_skills, auto-mark extracted skills as "known" in UserSkill
   PATCH /:id     → update project (title, description, tech_stack, github_url, live_url, is_pinned)
   DELETE /:id    → delete project
   POST /:id/regenerate → regenerate ai_bullets (call agent again)

3. backend/agents/market_intel_agent.py:
   get_trends() → {skills: [{name, demand_pct, delta_week}]} — top 12 trending skills
   get_salary(role) → {median, p25, p75, currency "USD", top_companies [str]}
   get_skill_gap(target_role, user_skills [str]) → {missing [str], recommended_order [str], priority_skill str}
   All use Gemini. Cache results in-memory with timestamp (refresh if older than 6 hours). Use a module-level dict: _cache = {}.

4. backend/api/views/market.py — /api/v1/market/:
   GET /trends          → skill demand data
   GET /salary?role=    → salary data for role
   GET /gap?target=     → skill gap for user vs target role (inject user's skills from DB)

FRONTEND:

pages/dashboard/ProjectVaultPage.jsx:
- Top: "Project Vault 🗂️" header + "Add Project" button (opens modal)
- Projects grid (2 columns): each card has:
  - Title (large) + description (2 lines, truncated)
  - Tech stack chips (colored by category: frontend=blue, backend=green, devops=orange)
  - AI-generated bullets (3-5 bullet points, indigo bullet dots)
  - Footer: GitHub link icon + Live link icon + Edit (pencil) + Delete (trash) + Pin (📌 toggles)
  - Pinned projects: purple glow border
- "Add Project" modal:
  - Title input, description textarea
  - Tech stack: type-to-add chip input (press Enter or comma to add chip)
  - GitHub URL, Live URL inputs
  - "Save & Generate AI Bullets" button → shows spinner while generating
  - After save: modal closes, new project card appears with AI bullets

pages/dashboard/MarketPulsePage.jsx:
- Header: "Market Pulse 📊" + last updated timestamp
- Trending Skills section:
  Horizontal bar chart (CSS bars, no library):
  Each bar: skill name left, colored bar (width = demand_pct%), percentage right, delta chip (▲2.1% green or ▼1.3% red)
- Salary Insights section:
  Role dropdown selector (Frontend Dev, Backend Dev, DevOps, etc.)
  After select: show salary card with median large text, p25-p75 range bar, top companies chips
- Skill Gap Analyzer section:
  "Your target role: [target_role]" (from profile)
  Missing skills shown as red chips
  Recommended learning order: numbered list
  Priority skill: highlighted card "Start with: [skill]"

components/DevPulseDashboardLayout.jsx (full dashboard shell):
  Left sidebar (240px wide, fixed):
    - Logo/brand: "DevPulse AI" with lightning bolt icon (indigo)
    - Navigation groups:
      OVERVIEW: Dashboard (home icon), Profile (user icon)
      RESUME: Resume Forge (file icon), Applications (list icon)
      GROW: Skill Genome (dna icon), Learn & Certify (book icon), Project Vault (folder icon)
      COMPETE: Mock Interview (mic icon), Skill Battle (sword icon), AI Coach (brain icon)
      INTEL: Market Pulse (chart icon)
    - Bottom: user avatar + name + level badge + logout button
    - Active route: indigo background, white text
    - Hover: rgba(99,102,241,0.1) background

  Top header bar (56px, sticky):
    - Search bar (⌘K shortcut hint)
    - "⚡ Daily Challenge" button pill (indigo outline)
    - Notification bell with unread dot
    - XP display: "2,400 XP" chip

  Main content: Outlet (react-router)

  components/DevPulseSidebar.jsx (extracted sidebar component, used inside layout)

Also update App.jsx with ALL routes:
  / → LandingPage
  /login → LoginPage
  /register → RegisterPage
  /dashboard → ProtectedRoute → DevPulseDashboardLayout with nested routes:
    index → CareerDashboardPage
    resume → MyResumePage
    genome → SkillGenomePage
    learn → LearnCertifyPage
    coach → AICareerCoachPage
    interview → MockInterviewPage
    battle → SkillBattlePage
    projects → ProjectVaultPage
    market → MarketPulsePage
    applications → MyApplicationsPage (basic list of job_applications)
    profile → UserProfilePage
  /cert/:id → CertVerifyPage (public)

Give all files with full content.
```

---

## ─── PART 8: Landing Page + Profile + Final Polish

```
Continue DevPulse AI. Build the public landing page, user profile page, and final polish.

BACKEND:
GET /api/v1/profile/ → return full user profile + devpulse_profile data
PATCH /api/v1/profile/ → update full_name, headline, location, github_url, linkedin_url, target_role, phone

GET /api/v1/notifications/ → list user's notifications (last 20)
PATCH /api/v1/notifications/:id/read → mark as read
PATCH /api/v1/notifications/read-all → mark all read

FRONTEND:

pages/DevPulseLandingPage.jsx — Full marketing landing page:
Section 1 – Hero:
  - Dark background with animated grid lines (CSS) or floating particle dots
  - Large heading: "Level Up Your Dev Career" (gradient text indigo→purple)
  - Subheading: "AI-powered resume, skill genome, mock interviews, and real-time skill battles — all in one platform"
  - Two CTAs: "Get Started Free" (gradient button) | "See How It Works" (ghost button)
  - Right side: animated dashboard preview mockup (CSS art/SVG of the dashboard cards)

Section 2 – Stats bar:
  - 3 stats: "10,000+ Devs", "500+ Skills", "50,000+ Certs Issued"

Section 3 – Features grid (6 cards):
  - Resume Forge 📄: AI rewrites your resume bullets for each job
  - Skill Genome 🧬: Visual map of every skill you know and certify
  - AI Career Coach 🧠: Pulse — your personal senior engineer mentor
  - Mock Interviews 🎤: Practice technical, HR, system design rounds
  - Skill Battle ⚔️: Real-time 1v1 MCQ battles with other devs
  - Market Pulse 📊: Live salary data and trending skill demand

Section 4 – How it works (3 steps):
  1. Upload Resume → AI parses and scores it
  2. Learn & Certify → earn XP and verified skill badges
  3. Battle & Grow → climb the leaderboard, attract recruiters

Section 5 – Pricing:
  Free: Resume upload, 5 quizzes/day, 10 coach messages/day, public portfolio
  Premium ($12/mo): Unlimited quizzes, unlimited coaching, priority ATS scoring, custom resume templates, PDF export

Section 6 – CTA footer:
  "Start building your dev career today" + "Sign up free" button

Sticky navbar: DevPulse AI logo, nav links (Features, Pricing, Login), "Get Started" button

pages/dashboard/UserProfilePage.jsx:
  Left card: avatar (initials fallback), name, headline, level badge (e.g. "Senior Developer ⭐"), XP bar, stats row (certs, battles, streak)
  Right panel tabs: Edit Profile | Achievements | Account

  Edit Profile tab:
    - Full name, headline, bio (textarea), target role, location, phone
    - GitHub URL, LinkedIn URL
    - "Save Changes" button

  Achievements tab:
    - Badges grid: each badge chip with emoji icon + name + earned date
    - Certificates list: skill, score, cert ID, issued date, "View & Share" link

  Account tab:
    - Email (readonly)
    - Plan: "Free" badge or "Premium" badge
    - "Upgrade to Premium" CTA card (if free)
    - Danger zone: "Delete Account" (confirmation modal)

pages/public/CertVerifyPage.jsx — /cert/:unique_cert_id (no auth):
  - Fetch cert details from GET /api/v1/certs/:unique_cert_id
  - Show: DevPulse AI logo, "Verified Certificate", skill name, holder's name, score, issue date, unique cert ID
  - Green ✅ "Authentic" badge
  - "Share on LinkedIn" button (linkedin.com/sharing URL)

GLOBAL POLISH to add across all pages:
1. Every page: show loading skeleton (gray animated shimmer boxes) while data fetches
2. XP gain toast: when XP is awarded, show a floating chip "+200 XP ⚡" that fades in from bottom and disappears after 2s
3. All error states: show a centered card with ⚠️ icon and error message + "Retry" button
4. Empty states: when no data, show illustrated empty state (CSS art or icon) with helpful CTA
5. Mobile: sidebar collapses on width < 768px (hamburger button in header)

Give all files with full content.
```

---

## ─── HOW TO USE THESE PROMPTS

| Part | Content | Est. Files |
|------|---------|-----------|
| **Part 0** | Project setup, folder structure, config | ~8 files |
| **Part 1** | All Django models (16 models) | 1 file |
| **Part 2** | Auth backend + Login/Register frontend | ~6 files |
| **Part 3** | Resume Forge (3 AI agents + wizard page) | ~5 files |
| **Part 4** | Dashboard home + Skill Genome | ~4 files |
| **Part 5** | Learn & Certify + Mock Interview | ~5 files |
| **Part 6** | AI Coach + Skill Battle | ~4 files |
| **Part 7** | Projects + Market + Nav Shell | ~6 files |
| **Part 8** | Landing page + Profile + Polish | ~5 files |

> **Tip**: At the start of each part (2–8), paste this context line first:
> `"I am continuing building DevPulse AI — Django 5 + React 18 + Neon PostgreSQL + Gemini AI SaaS platform. Here is the next part of the build:"`
