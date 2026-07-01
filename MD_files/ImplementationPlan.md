# TrustHire AI — Implementation Plan

> **Version:** 1.0.0
> **Created:** 2026-06-19
> **Target Team:** 3-person student team
> **Timeline:** 10 weeks (full MVP)
> **Demo Milestone:** Week 6 (core demo-ready build)
> **Parent Documents:** All project documents (v1.0.0–v1.1.0)

---

## 1. 🎯 Strategy Overview

### Core Principle: Ship the Demo, Then Complete the MVP

A 3-person student team cannot build everything in parallel without burning out. This plan is organized around **two goals in sequence:**

1. **Week 6 Demo Build** — A working, impressive demo that covers the 3 highest-impact features: Trust Score, Resume Analyzer, and Job Board. This is what professors, judges, and investors will see.
2. **Week 10 Full MVP** — The complete platform with all features from PRD.md.

### What to Build First (Demo Impact Priority)

| Priority | Feature | Why First |
|----------|---------|-----------|
| 🔴 P0 | Auth + Job Board + Trust Score | The entire product narrative: "AI detects fake jobs" |
| 🔴 P0 | Resume Analyzer | Instantly visual AI output — best demo moment |
| 🔴 P0 | Candidate Dashboard | Makes it look like a real product, not a prototype |
| 🟡 P1 | Candidate Matching | Elevates the AI story significantly |
| 🟡 P1 | Employer Dashboard + Applicant Review | Needed for end-to-end demo |
| 🟢 P2 | Company Verification | Trust narrative completeness |
| 🟢 P2 | AI Career Assistant | WOW factor, but depends on P0+P1 |
| 🔵 P3 | Admin Dashboard | Needed for production, not demo |
| 🔵 P3 | Email Notifications | Polish feature |

---

## 2. 👥 Team Roles

Based on TrustHire AI's hybrid architecture, assign roles by service layer:

| Person | Role | Primary Stack | Owns |
|--------|------|--------------|------|
| **Person A** | Frontend Engineer | Next.js 14, React 18, TypeScript, Tailwind | All UI pages, components, design system |
| **Person B** | Backend Engineer | Node.js, Express, PostgreSQL, Redis, BullMQ | REST API, auth, database, queues, email |
| **Person C** | AI / Python Engineer | Python, Django, scikit-learn, SBERT, PyMuPDF | All AI services, ML pipelines, Python API |

### Collaboration Points (where all 3 must sync)

- **API contracts** — Person A and B must agree on request/response shapes before Person A builds any page that calls an API
- **Queue format** — Person B (BullMQ producer) and Person C (BullMQ consumer) must agree on job payload structure before building AI pipelines
- **AI response format** — Person C returns JSON to Person B, which Person A displays. All 3 must agree on the schema for Trust Score, Resume Report, and Match Score responses.

> **Sync rule:** 15-minute standup every day. First 10 minutes of every week: agree on API contracts for that week's features.

---

## 3. 🗺️ Critical Path

> ⚠️ **Critical path tasks** are marked with 🔴. A delay on any of these delays ALL downstream work. Prioritize ruthlessly.

```
🔴 Week 1: Dev environment + PostgreSQL schema + auth foundation
     │
     ├─► Person A can start building login/register UI
     ├─► Person B can build all DB tables, auth endpoints
     └─► Person C can start building Django project structure

🔴 Week 2: Job Listing CRUD + BullMQ queue setup
     │
     ├─► Person A can build job board UI and job post form
     ├─► Person B can expose job endpoints + queue producer
     └─► Person C starts Trust Score pipeline

🔴 Week 3: Trust Score pipeline end-to-end
     │
     ├─► Job board becomes fully functional (listings go live after AI scores)
     └─► Company verification can now leverage the web-presence check code

🔴 Week 4: Resume upload to S3 + analysis pipeline
     │
     ├─► Resume Report page unlocked
     └─► Matching pipeline can use resume data + candidate embedding

🔴 Week 5: Candidate Matching (SBERT + pgvector)
     │
     └─► Match Score badges appear on job board — demo looks complete

 Week 6: 🎯 DEMO BUILD — Polish, integrate, record demo

 Week 7: Company Verification + Employer applicant review
 Week 8: AI Career Assistant
 Week 9: Admin Dashboard + Email Notifications
 Week 10: Testing, security hardening, deployment
```

---

## 4. 📅 Week-by-Week Plan

---

### ⚙️ PHASE 0 — Foundation (Week 1)

**Goal:** Everyone can code. Shared infrastructure is live. Zero blocked days from setup.

#### Person B — Backend/Infra
- [ ] 🔴 Create GitHub repo with monorepo structure: `/frontend`, `/backend`, `/ai-service`
- [ ] 🔴 Set up Docker Compose for local dev: PostgreSQL 15, MongoDB 7, Redis 7
- [ ] 🔴 Initialize Node.js + Express project with TypeScript
- [ ] 🔴 Run Prisma migrations for all 10 PostgreSQL tables from `Schema.md`
- [ ] 🔴 Set up `.env` template and share env var names with team (no secrets in git)
- [ ] Create AWS S3 bucket (private) for resumes + company docs
- [ ] Set up Supabase project (hosted PostgreSQL with pgvector extension)
- [ ] Set up MongoDB Atlas cluster
- [ ] Set up Upstash Redis

#### Person C — AI/Python
- [ ] 🔴 Initialize Django project: `django-admin startproject trusthire_ai`
- [ ] 🔴 Install all Python dependencies: `pip install djangorestframework sentence-transformers scikit-learn PyMuPDF python-docx pandas numpy xgboost requests beautifulsoup4 langchain`
- [ ] 🔴 Set up Django DRF project structure: `apps/trust_score`, `apps/resume`, `apps/matching`, `apps/assistant`
- [ ] Create `salary_benchmarks.json` static dataset (50 common job roles with median salaries)
- [ ] Test SBERT model download: `sentence-transformers/all-MiniLM-L6-v2`
- [ ] Verify PyMuPDF can parse a sample PDF resume

#### Person A — Frontend
- [ ] 🔴 Initialize Next.js 14 project with TypeScript + Tailwind
- [ ] 🔴 Implement all CSS design tokens from `Design.md §10` in `globals.css`
- [ ] Build reusable component library (Week 1 foundations):
  - [ ] `Button` (4 variants from `Design.md §6.1`)
  - [ ] `Input` + `Textarea`
  - [ ] `Card` + `CardRaised`
  - [ ] `Badge` / `Pill`
  - [ ] `Sidebar` layout shell
- [ ] Set up Axios instance with JWT interceptor (auto-refresh logic from `TRD.md §TR-AUTH-08`)
- [ ] Set up Zustand store: `useAuthStore`, `useUserStore`

**Week 1 Exit Criteria:**
- `docker-compose up` brings up all 3 databases locally ✓
- PostgreSQL tables exist and migrations are clean ✓
- Next.js app loads with design tokens applied ✓
- Django dev server starts without errors ✓

---

### 🔐 PHASE 1 — Auth & Core API (Week 2)

**Goal:** Users can register, log in, and stay logged in. The backbone is done.

#### Person B — Backend
- [ ] 🔴 `POST /api/auth/register` — create user, hash password, dispatch email-verify job to queue (stub queue for now)
- [ ] 🔴 `POST /api/auth/login` — validate credentials, bcrypt compare, issue JWT (RS256 access + refresh)
- [ ] 🔴 `POST /api/auth/refresh` — validate refresh token from Redis, rotate
- [ ] 🔴 JWT middleware: `verifyJWT`, `requireRole(['CANDIDATE'])`, `requireRole(['EMPLOYER'])`, `requireAdmin`
- [ ] `POST /api/auth/logout` — blocklist token in Redis
- [ ] `POST /api/auth/forgot-password` + `POST /api/auth/reset-password`
- [ ] Google OAuth setup with `passport-google-oauth20`
- [ ] Account lockout: Redis `login_fail:{email}` counter (5 strikes → 15 min lock)
- [ ] `GET/PUT /api/candidates/me` — candidate profile CRUD
- [ ] `GET/PUT /api/employers/me` — employer profile CRUD
- [ ] `POST /api/candidates/me/resume` — Multer → S3 upload, update `resume_url`
- [ ] `POST /api/employers/me/logo` — logo upload to S3

#### Person A — Frontend
- [ ] 🔴 `/login` page — two-column layout from `Design.md §7.2`
- [ ] 🔴 `/register` page — role selection (Candidate / Employer) + form
- [ ] 🔴 Auth flow: store JWT in memory (not localStorage), refresh token in httpOnly cookie
- [ ] Protected route wrapper component (`<AuthGuard role="CANDIDATE">`)
- [ ] Candidate onboarding 4-step flow from `AppFlow.md §3.2`
- [ ] Employer profile setup page
- [ ] Profile completeness % widget (visual progress bar)

#### Person C — AI/Python
- [ ] Set up BullMQ Python consumer (`bullmq` Python package) — listen to `trust-score-queue`
- [ ] Internal API key middleware in Django: check `X-Internal-API-Key` header on all `/ai/*` routes
- [ ] Draft `POST /ai/trust-score` endpoint (scaffold, not full logic yet)
- [ ] Start building NLP word-count check (Check 1 from `TRD.md §TR-FJD-03`)

**Week 2 Exit Criteria:**
- Register → verify email (console log) → login → JWT issued ✓
- Candidate profile page loads with completeness score ✓
- Resume uploads to S3 and URL stored in DB ✓

---

### 📋 PHASE 2 — Job Board + Trust Score (Week 3) 🔴 CRITICAL

**Goal:** Jobs can be posted and scored. The core product demo is functional.

#### Person B — Backend
- [ ] 🔴 `POST /api/jobs` — create listing, set `status = PROCESSING`, dispatch to BullMQ `trust-score-queue`
- [ ] 🔴 `GET /api/jobs` — paginated list, filters (status, job_type, location, trust_score range), `status = ACTIVE` only for public
- [ ] 🔴 `GET /api/jobs/:id` — single listing detail
- [ ] `PUT /api/jobs/:id` — employer update (ownership check)
- [ ] `DELETE /api/jobs/:id` — set status CLOSED
- [ ] `GET /api/jobs/:id/trust-score` — Trust Score + flags for employer/admin
- [ ] 🔴 BullMQ producer: `trust-score-queue` with payload `{ jobId, title, description, salaryMin, salaryMax, domain, employerId }`
- [ ] BullMQ worker (Node side): when Python returns result → update `job_listings` table, set `status = ACTIVE` or `QUARANTINED`
- [ ] `POST /api/jobs/:id/apply` — create application, duplicate check (409 if exists, `FR-JB-11`)
- [ ] `DELETE /api/jobs/:id/apply` — withdraw application

#### Person C — AI/Python 🔴
- [ ] 🔴 Complete `POST /ai/trust-score` — full pipeline:
  - Check 1: NLTK word count < 100 → penalty -20
  - Check 2: Salary vs `salary_benchmarks.json` median → penalty -20 if > 3× median
  - Check 3: HTTP HEAD to company domain (5 sec timeout) → penalty -25 if unreachable
  - Check 4: DNS lookup on domain → penalty -25 if no record (combined with Check 3 as "no web presence")
  - Check 5: Count employer posts in 24h via PostgreSQL query → penalty -10 if > 10
  - Check 6: Employer verified? → bonus +10
  - Final: `score = max(0, min(100, 90 - penalties + bonus))`
- [ ] 🔴 Return: `{ jobId, score, flags: [{ signal, penalty, description }], status: "ACTIVE"|"QUARANTINED" }`
- [ ] Unit tests for each signal check function (`pytest`)

#### Person A — Frontend
- [ ] 🔴 `/jobs` — Job Board page: 2-column grid, search bar, filter panel (slide-over)
- [ ] 🔴 Trust Score badge component: High/Medium/Low/Processing variants from `Design.md §6.4`
- [ ] 🔴 Verified badge component from `Design.md §6.5`
- [ ] Job Card component with Trust Score badge, Match Score bar (stubbed 0% for now), Apply button
- [ ] `/jobs/:id` — Job Detail page from `Design.md §7.5`
- [ ] Job Post form for employers (multi-step: Basic Info → Description → Requirements → Salary)
- [ ] "Under Review" state on job card while Trust Score computing (shimmer skeleton)
- [ ] Toast notification when job goes live

**Week 3 Exit Criteria:**
- Employer posts job → enters "Processing" state → Python computes Trust Score ≤ 60 sec → listing goes live with color badge ✓
- Job with vague description gets Trust Score < 40 and is quarantined ✓
- Candidate can browse, filter, and apply to jobs ✓

---

### 📄 PHASE 3 — Resume Analyzer (Week 4) 🔴 CRITICAL

**Goal:** Candidates can upload a resume and get a real AI analysis report. This is the #1 demo moment.

#### Person C — AI/Python 🔴
- [ ] 🔴 `POST /ai/resume/analyze` — full pipeline:
  - Download from S3 via presigned URL
  - PyMuPDF parse (PDF) or python-docx (DOCX)
  - Section extraction: regex for Contact, Experience, Education, Skills headers
  - Score each section (weights: Contact 10%, Experience 30%, Skills 25%, Education 15%, ATS 20%)
  - Integrity flags: detect date overlaps using Pandas datetime comparison, 12+ month gaps
  - Keyword gap: if `targetRole` provided, compare skills list vs role benchmark keywords
  - LLM call (Gemini API): prompt with resume sections + context → get 5 prioritized suggestions
  - Return full structured JSON
- [ ] Store result in MongoDB `resume_analyses` collection
- [ ] Handle 3-report limit: delete oldest if candidate already has 3

#### Person B — Backend
- [ ] `GET /api/candidates/me/resume/analysis` — latest report from MongoDB
- [ ] `GET /api/candidates/me/resume/analysis/:id` — specific report
- [ ] BullMQ `resume-analysis-queue` producer (triggered on resume upload)
- [ ] Redis pub/sub: publish to `resume:analyzed:{candidateId}` when complete
- [ ] Server-Sent Events (SSE) endpoint or polling endpoint: `GET /api/candidates/me/resume/analysis/status` — lets frontend poll for completion

#### Person A — Frontend
- [ ] 🔴 `/resume` — Resume Analysis page from `Design.md §7.6`
- [ ] Score display: `font-mono, text-5xl, font-bold` — animated count-up from 0 to score (800ms)
- [ ] Score breakdown: 5 progress bars with labels, fill animation (600ms)
- [ ] Priority improvements list: numbered, expandable
- [ ] Integrity flags: amber warning boxes
- [ ] Missing keywords: chip components (pill badges)
- [ ] "Analyzing..." loading state (skeleton + spinner) while waiting for pipeline
- [ ] "Your profile resume has been updated" confirmation banner (FR-RA-09)

**Week 4 Exit Criteria:**
- Upload PDF → "Analyzing" state → full report appears in < 60 seconds ✓
- Score displays with count-up animation ✓
- Improvements are specific and relevant to the actual resume content ✓

---

### 🎯 PHASE 4 — Matching + Dashboard (Week 5)

**Goal:** The platform feels complete. Match scores appear. Dashboard shows real data.

#### Person C — AI/Python
- [ ] 🔴 `POST /ai/match` — SBERT match score:
  - Load `all-MiniLM-L6-v2`
  - Encode candidate skills + title + years_experience as text
  - Encode job title + requirements as text
  - Cosine similarity = raw score
  - Weighted breakdown: Skills 40%, Experience 25%, Title 15%, Location 10%, Type 10%
  - Return: `{ jobId, candidateId, score, breakdown }`
- [ ] Candidate embedding generation: `POST /ai/embeddings/candidate` — encode profile → return 384-dim vector
- [ ] Job embedding generation: `POST /ai/embeddings/job` — encode listing → return vector
- [ ] Top-10 recommended jobs: pgvector ANN search using cosine similarity

#### Person B — Backend
- [ ] `GET /api/candidates/me/matches` — top-10 recommended jobs (Redis cached, TTL 30 min)
- [ ] `GET /api/jobs/:id/match` — match score for specific job (Redis cached, TTL 1h)
- [ ] Store match_score on `applications` table at apply time
- [ ] Candidate dashboard aggregate endpoint: `GET /api/candidates/me/dashboard`
- [ ] Employer dashboard aggregate endpoint: `GET /api/employers/me/dashboard`
- [ ] `GET /api/jobs/:id/applicants` — sorted by match_score DESC
- [ ] `PATCH /api/jobs/:id/applicants/:applicantId/status` — employer status update
- [ ] `GET /api/jobs/:id/applicants/:applicantId` — candidate profile view (masked below Shortlisted)

#### Person A — Frontend
- [ ] 🔴 Candidate Dashboard page from `Design.md §7.3`
  - 4 stat widgets (Profile %, Match Score, Apps sent, New jobs)
  - Recommended Jobs feed (top 5, with Match Score bars)
  - Recent Applications table with status pills
- [ ] Match Score progress bar component from `Design.md §6.6`
- [ ] Match Score visible on every job card (real data now)
- [ ] Employer Dashboard page from `Design.md §7.7`
- [ ] Applicant list page from `Design.md §7.8` — sorted by Match Score
- [ ] Status update dropdown (Shortlisted / Interview / Rejected / Hired)
- [ ] Status pills from `Design.md §6.7`
- [ ] Application status update reflected with 5-second polling

**Week 5 Exit Criteria:**
- Every job card shows a real Match Score % ✓
- Candidate dashboard loads with real data in < 2 seconds ✓
- Employer can view applicants sorted by Match Score and change status ✓

---

### 🎬 PHASE 5 — Demo Polish Week (Week 6)

**Goal:** The product looks and feels production-ready for a demo. No new features — only polish and integration.

#### All 3 People — Full Integration
- [ ] 🔴 End-to-end happy path test: Register → Post Job → Trust Score → Apply → Resume Analyze → View Match → Change Status
- [ ] 🔴 Seed database with realistic demo data:
  - 3 employer accounts (1 verified, 2 unverified)
  - 10 job listings (mix of trust scores: 2 quarantined, 3 medium, 5 high)
  - 5 candidate accounts with complete profiles and uploaded resumes
  - Pre-computed match scores and resume reports (so demo doesn't wait for AI)
- [ ] Fix all bugs found during integration testing
- [ ] Performance check: dashboard loads < 2 seconds, job board < 2 seconds
- [ ] Mobile responsiveness check (tablet minimum)

#### Person A — Frontend Polish
- [ ] Micro-animations: Trust Score count-up, match bar fill, score count-up (from `Design.md §8.2`)
- [ ] Loading skeleton on job board while fetching
- [ ] Empty state screens: "No jobs match your filters", "Upload your resume to see your score"
- [ ] Error states: network error toast, 404 page
- [ ] Landing page from `Design.md §7.1` — makes demo entry point impressive
- [ ] Dark mode toggle (if time allows)

#### Person B — Backend Polish
- [ ] Request logging with Winston (structured JSON logs)
- [ ] Error handler middleware: all errors return `{ success: false, error, code, message }`
- [ ] Add Sentry error tracking
- [ ] Rate limiting: global 100 req/min, auth routes 10 req/min

#### Person C — AI Polish
- [ ] Tune Trust Score penalties if test data produces too many false positives
- [ ] Ensure resume analysis handles edge cases: very short resumes, image-only PDFs (return graceful error)
- [ ] Cache SBERT model in memory (don't reload on every request)

**Week 6 Exit Criteria (Demo Readiness Checklist):**
- [ ] Landing page → Register → Post Job → Trust Score appears ✓
- [ ] Upload resume → Report appears in < 60 sec ✓
- [ ] Job board shows Match Scores for logged-in candidate ✓
- [ ] Employer sees applicants sorted by Match Score ✓
- [ ] No console errors in browser ✓
- [ ] No 500 errors in server logs ✓
- [ ] Product works on Chrome, Firefox, and Safari ✓

---

### 🏢 PHASE 6 — Company Verification (Week 7)

**Goal:** The verification system is live and completes the trust narrative.

#### Person B — Backend
- [ ] `POST /api/companies/me/verify` — document upload to S3, create verification record
- [ ] Automated check pipeline (Node.js): DNS lookup, HTTP ping, LinkedIn URL format (all async, timeout-safe)
- [ ] `GET /api/companies/me/verify/status`
- [ ] `GET /api/companies/:id` — public company profile
- [ ] Admin verification queue endpoints: `GET /api/admin/verifications`, `PATCH /api/admin/verifications/:id`
- [ ] Admin auth and admin CLI script (`npm run create-admin`)
- [ ] Admin quarantine queue endpoints: `GET /api/admin/quarantine`, `PATCH /api/admin/quarantine/:jobId`

#### Person C — AI/Python
- [ ] `POST /ai/verify` — lightweight HTTP GET check (homepage status 200 + body > 500 chars)

#### Person A — Frontend
- [ ] Company Verification form and submission flow
- [ ] Verification status page (Pending / Verified / Rejected states)
- [ ] Admin Dashboard page from `Design.md §7.10`
  - Quarantine queue table with Approve / Resubmit / Remove actions
  - Verification queue table with Approve / Reject / Request Docs
- [ ] Admin-only route guard (`/admin` → 403 if not ADMIN role)

---

### 🤖 PHASE 7 — AI Career Assistant (Week 8)

**Goal:** The AI chat widget is live. It's the WOW feature for the demo's second run.

#### Person C — AI/Python
- [ ] `POST /ai/chat` — full pipeline:
  - Intent classifier (keyword matching + zero-shot on 5 intents)
  - Template responses for matched intents (inject real user context)
  - LLM fallback: LangChain + Gemini API for unmatched intents
  - Append disclaimer to every response
  - Store message in MongoDB `chat_sessions`
- [ ] `GET /ai/chat/history?sessionId=X`

#### Person B — Backend
- [ ] `POST /api/assistant/chat` — check Redis daily quota, increment, forward to Python
- [ ] `GET /api/assistant/history`
- [ ] Redis `llm_count:{userId}:{date}` with auto-expire at midnight

#### Person A — Frontend
- [ ] AI Chat floating button (bottom-right, all pages after login)
- [ ] Slide-over chat panel from `Design.md §7.9`
- [ ] Message bubbles: user right-aligned (brand-50 bg), AI left-aligned (bg-muted)
- [ ] Disclaimer shown below every AI response
- [ ] Daily quota progress bar (14/20 used)
- [ ] Typing indicator (3 animated dots)
- [ ] Out-of-scope graceful redirect message

---

### 📧 PHASE 8 — Email Notifications + Admin Polish (Week 9)

**Goal:** The platform notifies users correctly. Admin tools are production-ready.

#### Person B — Backend
- [ ] SendGrid integration: `@sendgrid/mail`
- [ ] BullMQ `email-queue` worker
- [ ] Email templates with Handlebars: Verify Email, Reset Password, Verification Status, Application Status
- [ ] `notification_preferences` CRUD endpoints
- [ ] `email_log` table writes on every send

#### Person A — Frontend
- [ ] Email preferences page in account settings
- [ ] Notification opt-in/out toggles
- [ ] "Check your email" screens after register/forgot password

#### Person C — AI/Python
- [ ] Pandas EDA script for salary benchmarks (validate `salary_benchmarks.json` against real salary distribution)
- [ ] Matplotlib visualization: Trust Score distribution chart (internal tool, not user-facing)
- [ ] Regression model experiment: predict resume score given profile completeness (academic component)

---

### 🚀 PHASE 9 — Testing, Security & Deployment (Week 10)

**Goal:** The product is deployed. Tests pass. Security is hardened.

#### Person B — Backend + DevOps
- [ ] Jest unit tests: auth middleware, role guard, Trust Score update logic (target: 80% coverage)
- [ ] Supertest integration tests: all API endpoints with valid + invalid inputs
- [ ] HTTPS enforced (Railway auto-TLS)
- [ ] CORS configured to production domain only
- [ ] Helmet.js security headers
- [ ] File upload MIME type hardening
- [ ] Deploy backend to Railway
- [ ] Deploy Python AI service to Railway (Dockerfile)
- [ ] Set all environment variables in Railway dashboard

#### Person C — AI/Python
- [ ] pytest unit tests for all ML pipeline functions
- [ ] Load test: simulate 10 concurrent Trust Score requests (ensure queue handles load)
- [ ] Verify SBERT model is bundled correctly in Docker image

#### Person A — Frontend + DevOps
- [ ] Playwright E2E tests: Register → Apply → View Resume Report (happy path)
- [ ] Cross-browser test: Chrome, Firefox, Safari
- [ ] Lighthouse audit: Performance > 85, Accessibility > 90
- [ ] Deploy frontend to Vercel
- [ ] Set environment variables (API URL, etc.) in Vercel

**Week 10 Exit Criteria:**
- [ ] All three services running in production ✓
- [ ] End-to-end happy path works on production URLs ✓
- [ ] No critical security vulnerabilities (JWT, CORS, HTTPS) ✓
- [ ] Lighthouse performance > 85 ✓

---

## 5. 🚦 Critical Path Summary

```
Week 1: [B] DB + Schema + Docker  →  [C] Django setup  →  [A] Design tokens + components
           ↓
Week 2: [B] Auth API  →  [A] Login/Register pages  →  [C] BullMQ consumer + Trust scaffold
           ↓
Week 3: 🔴 [C] Trust Score pipeline (END-TO-END)  →  [B] Job CRUD + queue  →  [A] Job Board
           ↓
Week 4: 🔴 [C] Resume Analyzer pipeline  →  [B] S3 + polling  →  [A] Resume report page
           ↓
Week 5: [C] SBERT matching  →  [B] Match API + dashboards  →  [A] Dashboard + Match Score UI
           ↓
Week 6: 🎯 DEMO BUILD — Integration + Seed Data + Polish
           ↓
Week 7: Verification + Admin  →  Week 8: AI Chat  →  Week 9: Email + Tests  →  Week 10: Deploy
```

---

## 6. ⚠️ Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| SBERT model too slow for MVP | Medium | High | Use pre-computed embeddings from Django startup; cache aggressively in Redis |
| LLM API (Gemini) rate limits during demo | Medium | High | Pre-cache 5 common resume advice responses; demo uses cached responses |
| S3 presigned URL issues in local dev | High | Medium | Use MinIO (S3-compatible local service) in Docker Compose for dev |
| Person C falls behind on ML pipelines | Medium | High | Person B writes stub Python endpoints that return hardcoded scores by Week 3 so UI isn't blocked |
| Resume PDF parsing fails on complex formats | High | Medium | Keep fallback: if PyMuPDF extraction is < 200 chars, show "Parsing failed" + prompt to re-upload |
| Team coordination breaks API contracts | Medium | Medium | Share Postman collection or OpenAPI stub file by end of Week 1 |
| Demo database has no data | Low | High | Seed script must run in Week 6; test it twice before demo day |

---

## 7. 📦 Tech Setup Checklist (Before Day 1)

Everyone must complete before coding starts:

- [ ] **All:** Install Node.js 20 LTS, Python 3.11+, Docker Desktop, VS Code
- [ ] **All:** Clone the monorepo and run `docker-compose up` successfully
- [ ] **Person B:** Create accounts: Supabase, MongoDB Atlas, Upstash Redis, AWS (S3), Railway
- [ ] **Person C:** Run `pip install sentence-transformers` and verify SBERT loads (downloads ~90MB model)
- [ ] **Person A:** Run `npm run dev` in Next.js and verify the app loads on `localhost:3000`
- [ ] **All:** Create a shared `.env.example` file in the repo root with all variable names (no values)
- [ ] **All:** Join a shared Postman workspace OR agree on API contract documentation format

---

## 8. 🎬 Demo Script (Week 6 Walkthrough)

**Target: 5-minute demo that hits every major feature**

| Time | Action | Who Narrates |
|------|--------|-------------|
| 0:00 | Open landing page — "This is TrustHire AI. We solve fake job postings, bad matches, and weak resumes." | Anyone |
| 0:30 | Login as Employer → Post a job with vague description → Watch Trust Score compute → Listing gets quarantined (score 22) | Person B |
| 1:30 | Post a second job with real, detailed description → Watch Trust Score compute → Score 84 → Listing goes live with green badge | Person B |
| 2:15 | Switch to Candidate → Browse job board → Filters working → Match Score % visible on cards | Person A |
| 2:45 | Click on a job → See Trust Score breakdown, Match Score breakdown | Person A |
| 3:00 | Go to Resume page → Upload a PDF → Watch "Analyzing..." → Full report appears with 82/100 score | Person C |
| 3:45 | Show improvement suggestions (count-up animation, priority list) | Person A |
| 4:00 | Apply to a job → Switch back to Employer → See applicants sorted by Match Score → Update status to Shortlisted | Person B |
| 4:30 | Open AI Chat widget → Ask "How can I improve my resume?" → Show personalized advice using actual score | Person C |
| 5:00 | "TrustHire AI: Trust Score, Smart Matching, Resume Intelligence — in one platform." | Anyone |

---

## 9. 📁 Document Index

| Document | Status | Used In |
|----------|--------|---------|
| [ProjectContext.md](./ProjectContext.md) | ✅ Active | Vision, constraints |
| [PRD.md](./PRD.md) | ✅ Active | Feature requirements |
| [TRD.md](./TRD.md) | ✅ Active | Technical specs, API contracts |
| [Schema.md](./Schema.md) | ✅ Active | Database — build from this directly |
| [AppFlow.md](./AppFlow.md) | ✅ Active | Reference for all flows when building |
| [Design.md](./Design.md) | ✅ Active | CSS tokens, component specs, page layouts |
| [ImplementationPlan.md](./ImplementationPlan.md) | ✅ Active | This document |

---

*© 2026 TrustHire AI. Confidential — Internal Use Only.*
*Implementation Plan v1.0.0 | Created: 2026-06-19 | Author: Project Lead*
