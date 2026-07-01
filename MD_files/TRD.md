# TrustHire AI — Technical Requirements Document (TRD)

> **Version:** 1.0.0
> **Created:** 2026-06-19
> **Status:** Active — MVP Phase 1
> **Parent Documents:**
> - [ProjectContext.md](./ProjectContext.md) ← Vision, tech stack, constraints
> - [PRD.md](./PRD.md) ← Product requirements (PRD v1.1.0)
> **Audience:** Backend Engineers, Frontend Engineers, DevOps, QA Engineers
> **Scope:** Every technical requirement in this document maps 1:1 to a functional requirement in PRD.md. No technical requirement exists without a product justification.

---

## 1. 📋 Document Purpose

This Technical Requirements Document (TRD) translates all product requirements from `PRD.md` into precise, implementable technical specifications. It defines the **backend services, data models, API contracts, and security controls** for every feature in the TrustHire AI MVP.

**Traceability Convention:** Every technical requirement (TR-XXX) references its parent product requirement (FR-XXX or PRD §X.X) in brackets.

---

## 2. 🏗️ System Architecture

### 2.1 Architecture Pattern

TrustHire AI uses a **hybrid microservices architecture**:

| Layer | Pattern | Rationale |
|-------|---------|-----------|
| Frontend | Monolithic SPA (Next.js) | Single deployment, fast iteration |
| Node.js Backend | Modular Monolith → microservices-ready | Avoids premature decomposition in MVP |
| Python AI Service | Dedicated microservice | Language isolation; Python ML ecosystem |
| Async Processing | BullMQ queue (Redis-backed) | Decouple heavy AI jobs from request cycle |
| Data Layer | Unified SQL persistence | Neon Serverless PostgreSQL for all relational tables, SBERT embeddings, and JSONB document columns |

### 2.2 System Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    CLIENT — Browser (Next.js 14)                  │
│  React 18 Components │ Zustand State │ React Hooks API Calls      │
│  All data exchanged as JSON via REST over HTTPS                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS / REST (JSON)
                               │ JWT in Authorization header
┌──────────────────────────────▼───────────────────────────────────┐
│               NODE.JS / EXPRESS.JS BACKEND (Port 3001)            │
│                                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Auth Router  │  │  Jobs Router │  │  Candidates / Companies  │ │
│  │ /api/auth/*  │  │  /api/jobs/* │  │  /api/candidates/*       │ │
│  └─────────────┘  └──────────────┘  │  /api/companies/*        │ │
│                                     └──────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ Middleware Chain: JWT Verify → Role Guard → Rate Limiter   │   │
│  │ → Request Validator (Zod) → Error Handler                  │   │
│  └───────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              BullMQ Job Queue (Redis-backed)                  │ │
│  │  Queues: trust-score-queue │ match-score-queue │ resume-queue │ │
│  └────────────────────────────┬─────────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────┘
            ┌──────────────────┘
            │ Internal REST (JSON) — port 8000
┌───────────▼──────────────────────────────────────────────────────┐
│              PYTHON / DJANGO AI MICROSERVICE (Port 8000)          │
│                                                                    │
│  Django + DRF REST API │ BullMQ Worker Consumer                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ /ai/trust-score  │  │  /ai/resume      │  │  /ai/match      │ │
│  │ scikit-learn     │  │  PyMuPDF + NLP   │  │  SBERT embeds   │ │
│  │ XGBoost          │  │  Pandas EDA      │  │  TF/Keras       │ │
│  └─────────────────┘  └──────────────────┘  └─────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────┐│
│  │  /ai/career-assistant — LangChain + Gemini API / GPT-4o       ││
│  │  /ai/verify — HTTP ping + DNS lookup + lightweight scrape      ││
│  └───────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────┬─────────┘
                                                         │
       ┌─────────────────────────────────────────────────┘
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────┐  ┌───────┐  ┌───────────────┐  │
│  │  PostgreSQL   │  │ MongoDB  │  │ Redis │  │   AWS S3      │  │
│  │  (Supabase)   │  │         │  │       │  │               │  │
│  │  Users, Jobs  │  │ Resumes, │  │ Cache,│  │  Resume PDFs, │  │
│  │  Companies,   │  │ Analysis │  │ Queue,│  │  Company Docs │  │
│  │  Applications │  │ Reports  │  │ Sessions│  │               │  │
│  └──────────────┘  └──────────┘  └───────┘  └───────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. ⚙️ Technology Stack — Technical Specifications

### 3.1 Frontend

| Component | Technology | Version | Config Notes |
|-----------|-----------|---------|-------------|
| Core Library | React | 18.x | Strict Mode enabled |
| Framework | Next.js | 14.x | App Router; SSR for public pages, CSR for dashboard |
| Language | JavaScript | 5.x | Strict mode, no `any` |
| Styling | Tailwind CSS | 3.x | + shadcn/ui component library |
| State | Zustand | 4.x | Devtools enabled in dev |
| Forms | React Hook Form + Zod | Latest | Schema-first validation |
| HTTP Client | Axios | 1.x | Interceptors for JWT refresh |
| Charts | Recharts | 2.x | Dashboard visualizations |

### 3.2 Backend — Node.js Layer

| Component | Technology | Version | Config Notes |
|-----------|-----------|---------|-------------|
| Runtime | Node.js | 20.x LTS | — |
| Framework | Express.js | 4.x | Modular router structure |
| Language | JavaScript | 5.x | — |
| Auth | JSON Web Tokens (jsonwebtoken) | Latest | RS256 asymmetric signing |
| Session | express-session + Redis store | Latest | Used for admin sessions |
| Validation | Zod | 3.x | All route inputs validated |
| File Upload | Multer | Latest | Memory buffer → S3 upload |
| Job Queue | BullMQ | 3.x | Redis-backed; separate queues per AI task |
| Rate Limiting | express-rate-limit | Latest | Per-IP + per-user limits |
| Email | @sendgrid/mail | Latest | Transactional email |
| Logging | Winston | 3.x | JSON structured logs |
| Testing | Jest + Supertest | Latest | Unit + integration tests |

### 3.3 Backend — Python / Django Layer

| Component | Technology | Version | Config Notes |
|-----------|-----------|---------|-------------|
| Language | Python | 3.11+ | — |
| Web Framework | Django | 4.2 LTS | `django-environ` for config |
| REST API | Django REST Framework (DRF) | 3.14 | Token auth disabled; JWT via `djangorestframework-simplejwt` |
| ML Core | scikit-learn | 1.3+ | Pipelines for preprocessing + classification |
| Regression | scikit-learn | Linear, Ridge, SVR | Match score + salary estimation |
| Classification | scikit-learn + XGBoost | 2.0+ | Fake job detection |
| Deep Learning | TensorFlow / Keras | 2.x | Semantic embedding model |
| Data Analysis | Pandas + NumPy | 2.x / 1.x | EDA, data preprocessing |
| Visualization | Matplotlib + Seaborn | Latest | Internal EDA only (not user-facing) |
| Web Scraping | requests + BeautifulSoup (Phase 2) | Latest | Lightweight HTTP check only in MVP |
| NLP / Embeddings | sentence-transformers (SBERT) | Latest | `all-MiniLM-L6-v2` model |
| LLM Integration | LangChain + Google Gemini API | Latest | RAG pipeline for career assistant |
| Resume Parsing | PyMuPDF + python-docx | Latest | PDF + DOCX extraction |
| ML Serving | Django + DRF endpoints | — | Sync inference for MVP |
| Task Consumer | BullMQ Python consumer | — | Reads from Redis queue |
| Testing | pytest + pytest-django | Latest | — |

### 3.4 Databases

| DB | Technology | Host | Primary Use |
|----|-----------|------|------------|
| Sole Database | Neon Serverless PostgreSQL 15 | Neon Cloud | Users, Jobs, Companies, Applications, Verification, Resume Analyses, Chat Sessions |
| Cache / Queue | Redis 7 | Upstash / Railway | BullMQ queues, session store, rate limiter, Match Score cache |
| Object Storage | AWS S3 | AWS | Resume files (PDF/DOCX), company documents |

### 3.5 Infrastructure

| Component | Technology | Environment |
|-----------|-----------|------------|
| Frontend Hosting | Vercel | Production + Preview |
| Backend Hosting | Railway | Production |
| Python AI Service | Railway (Docker) | Production |
| CI/CD | GitHub Actions | All branches |
| Containerization | Docker + Docker Compose | Local dev + staging |
| Error Tracking | Sentry | All services |
| Product Analytics | PostHog | Frontend |
| DNS / CDN | Cloudflare | Production |

---

## 4. 🔐 Global Security Requirements

> These apply across ALL features. Feature-specific security requirements are listed per section below.

| ID | Security Requirement | PRD Reference |
|----|---------------------|---------------|
| SEC-GLOBAL-01 | All HTTP traffic redirected to HTTPS; TLS 1.2+ enforced | FR-AUTH-01 |
| SEC-GLOBAL-02 | All API endpoints require a valid JWT in the `Authorization: Bearer <token>` header except public routes: `GET /api/jobs`, `GET /api/companies/{id}`, `POST /api/auth/*` | FR-AUTH-03 |
| SEC-GLOBAL-03 | JWT signed using RS256 (asymmetric key pair); public key used for verification; private key stored in environment variable, never in code | FR-AUTH-03 |
| SEC-GLOBAL-04 | All user passwords hashed with bcrypt, cost factor ≥ 12; plaintext passwords never logged or stored | FR-AUTH-07 |
| SEC-GLOBAL-05 | Role-Based Access Control (RBAC): every protected route checks `req.user.role` against allowed roles (`CANDIDATE`, `EMPLOYER`, `ADMIN`); mismatch returns 403 | FR-ADMIN-04 |
| SEC-GLOBAL-06 | All incoming request bodies and query params validated with Zod schemas; invalid input returns 400 with structured error | PRD §6 |
| SEC-GLOBAL-07 | Rate limiting applied globally: 100 requests/minute per IP; stricter limits on auth routes (10 req/min) and LLM assistant (20 req/day per user) | FR-CA-09 |
| SEC-GLOBAL-08 | SQL injection prevented via parameterized queries (Prisma ORM / Supabase client — never raw string concatenation) | PRD §6 |
| SEC-GLOBAL-09 | SQL/JSON injection prevented via structured Prisma input parsing and parameterized JSON queries | PRD §6 |
| SEC-GLOBAL-10 | All file uploads virus-scanned before processing (ClamAV integration or AWS Macie); rejected if infected | FR-RA-01, FR-CV-01 |
| SEC-GLOBAL-11 | CORS configured to allow only the frontend domain; credentials allowed | PRD §6 |
| SEC-GLOBAL-12 | Sensitive environment variables stored in `.env` (gitignored); secrets injected via Railway/Vercel environment dashboard | PRD §6 |
| SEC-GLOBAL-13 | PII data (email, phone, resume content) stored with row-level security in PostgreSQL (Neon RLS); resume reports and chat histories scoped to user_id | PRD §6 |
| SEC-GLOBAL-14 | GDPR: candidates can request account deletion via `DELETE /api/candidates/me`; system must hard-delete PII within 30 days | PRD §6 |
| SEC-GLOBAL-15 | Account lockout: 5 consecutive failed logins → 15-minute lockout; tracked in Redis | FR-AUTH-01 (AC) |

---

## 5. 📐 Feature-by-Feature Technical Specifications

---

### Feature 5.0 — Admin Role & Admin Dashboard

**PRD Reference:** PRD §5.0 (FR-ADMIN-01 through FR-ADMIN-10)

---

#### 5.0.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-ADMIN-01 | Admin accounts are created via a Node.js CLI script (`npm run create-admin`) that accepts `--email` and `--password` flags, hashes the password with bcrypt, and inserts a record with `role: 'ADMIN'` into the `users` PostgreSQL table | FR-ADMIN-01 |
| TR-ADMIN-02 | Admin uses the same `/api/auth/login` endpoint as other users; the JWT payload includes `role: "ADMIN"` | FR-ADMIN-02 |
| TR-ADMIN-03 | Admin JWT access token TTL = 8 hours; no refresh token is issued for admin sessions; forced re-login after expiry | FR-ADMIN-03 |
| TR-ADMIN-04 | A middleware `requireAdmin` verifies `req.user.role === 'ADMIN'`; any route prefixed `/api/admin/*` uses this middleware; non-admin requests receive `{ error: "Forbidden", code: 403 }` | FR-ADMIN-04, FR-ADMIN-05 |
| TR-ADMIN-05 | Admin dashboard stats (total users, active listings, quarantined listings, verified companies, pending verifications) are computed via PostgreSQL aggregate queries and cached in Redis (TTL: 5 min) | FR-ADMIN-10 |

#### 5.0.B — Database Requirements

| TR ID | Requirement | Database | Schema |
|-------|------------|---------|--------|
| TR-ADMIN-DB-01 | `users` table must have a `role` column: `ENUM('CANDIDATE', 'EMPLOYER', 'ADMIN')` DEFAULT `'CANDIDATE'` | PostgreSQL | `users.role` |
| TR-ADMIN-DB-02 | Admin accounts are regular rows in `users` table with `role = 'ADMIN'`; no separate admin table | PostgreSQL | `users` |

#### 5.0.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/admin/dashboard` | JWT | ADMIN | Returns platform stats |
| GET | `/api/admin/quarantine` | JWT | ADMIN | Paginated list of quarantined listings |
| PATCH | `/api/admin/quarantine/{jobId}` | JWT | ADMIN | Body: `{ action: "APPROVE" \| "REMOVE" \| "RESUBMIT" }` |
| GET | `/api/admin/verifications` | JWT | ADMIN | Paginated list of PENDING verifications |
| PATCH | `/api/admin/verifications/{id}` | JWT | ADMIN | Body: `{ action: "APPROVE" \| "REJECT" \| "REQUEST_DOCS", reason?: string }` |

#### 5.0.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-ADMIN-SEC-01 | All `/api/admin/*` routes protected by `requireAdmin` middleware; any access without ADMIN role returns 403 | FR-ADMIN-04 |
| TR-ADMIN-SEC-02 | Admin CLI script requires server-side execution only; not exposed via any API endpoint | FR-ADMIN-01 |
| TR-ADMIN-SEC-03 | Admin actions (approve/reject) are logged to an `audit_log` table: `(admin_id, action, target_type, target_id, timestamp)` | FR-ADMIN-07, FR-ADMIN-09 |

---

### Feature 5.1 — Authentication & User Profiles

**PRD Reference:** PRD §5.1 (FR-AUTH-01 through FR-AUTH-08, FR-CP-01 through FR-CP-05, FR-EP-01 through FR-EP-05)

---

#### 5.1.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-AUTH-01 | Registration endpoint creates a user record in PostgreSQL, hashes password with `bcrypt.hash(password, 12)`, and dispatches an email verification job to the `email-queue` in Redis | FR-AUTH-01, FR-NOTIF-01 |
| TR-AUTH-02 | Google OAuth 2.0 implemented using `passport-google-oauth20`; on first login, user is created in DB with `email_verified: true`; user is redirected to role-selection screen if no role set | FR-AUTH-02 |
| TR-AUTH-03 | Login generates: access token (RS256 JWT, 15 min TTL, payload: `{sub, role, email}`) + refresh token (opaque string, stored in Redis with TTL 7 days, keyed by `refresh:{userId}`) | FR-AUTH-03 |
| TR-AUTH-04 | Token refresh: `POST /api/auth/refresh` validates refresh token against Redis; issues new access token; rotates refresh token | FR-AUTH-03, FR-AUTH-08 |
| TR-AUTH-05 | Failed login counter stored in Redis key `login_fail:{email}`; after 5 failures, key `login_locked:{email}` is set with 15-minute TTL; locked accounts return 429 | FR-AUTH-01 (AC) |
| TR-AUTH-06 | Password reset token: UUID generated, stored in Redis `pw_reset:{token}` with 30-minute TTL, email dispatched via `email-queue` | FR-AUTH-06 |
| TR-AUTH-07 | On logout: access token is added to a Redis blocklist `token_blocklist:{jti}` (TTL = remaining token lifetime); refresh token deleted from Redis | FR-AUTH-05 (AC) |
| TR-AUTH-08 | Candidate profile stored in `candidate_profiles` PostgreSQL table; employer profile in `employer_profiles` table | FR-CP-01, FR-EP-01 |
| TR-AUTH-09 | Profile completeness % calculated server-side: each required field assigned a weight; returned in `GET /api/candidates/me` | FR-CP-03 |
| TR-AUTH-10 | Resume file uploaded via Multer (memory buffer) → streamed to AWS S3 under `resumes/{candidateId}/{timestamp}.{ext}`; S3 URL stored in DB | FR-CP-02 |

#### 5.1.B — Database Requirements

| TR ID | Requirement | Database | Table / Collection |
|-------|------------|---------|-------------------|
| TR-AUTH-DB-01 | `users` table: `(id UUID PK, email VARCHAR UNIQUE NOT NULL, password_hash VARCHAR, role ENUM, email_verified BOOLEAN DEFAULT false, google_id VARCHAR, created_at TIMESTAMP, updated_at TIMESTAMP)` | PostgreSQL | `users` |
| TR-AUTH-DB-02 | `candidate_profiles` table: `(id UUID PK, user_id UUID FK→users.id, full_name VARCHAR, location VARCHAR, job_title VARCHAR, skills JSONB, years_experience INT, preferred_job_types JSONB, visibility ENUM('PUBLIC','PRIVATE'), resume_url VARCHAR, completeness_score INT, created_at TIMESTAMP)` | PostgreSQL | `candidate_profiles` |
| TR-AUTH-DB-03 | `employer_profiles` table: `(id UUID PK, user_id UUID FK→users.id, company_name VARCHAR, website VARCHAR, industry VARCHAR, company_size ENUM, location VARCHAR, description TEXT, logo_url VARCHAR, created_at TIMESTAMP)` | PostgreSQL | `employer_profiles` |
| TR-AUTH-DB-04 | Redis key patterns: `refresh:{userId}` (refresh token), `login_fail:{email}` (counter, TTL 15 min), `login_locked:{email}` (flag, TTL 15 min), `pw_reset:{token}` (TTL 30 min), `token_blocklist:{jti}` (TTL = token remaining life) | Redis | — |

#### 5.1.C — API Requirements

| Method | Route | Auth | Role | Request Body | Response |
|--------|-------|------|------|-------------|----------|
| POST | `/api/auth/register` | None | Any | `{ email, password, role }` | `201 { userId, message }` |
| POST | `/api/auth/login` | None | Any | `{ email, password }` | `200 { accessToken, refreshToken, user }` |
| POST | `/api/auth/refresh` | None | Any | `{ refreshToken }` | `200 { accessToken, refreshToken }` |
| POST | `/api/auth/logout` | JWT | Any | `{ refreshToken }` | `200 { message }` |
| POST | `/api/auth/forgot-password` | None | Any | `{ email }` | `200 { message }` |
| POST | `/api/auth/reset-password` | None | Any | `{ token, newPassword }` | `200 { message }` |
| GET | `/api/auth/google` | None | Any | — | Redirects to Google OAuth |
| GET | `/api/candidates/me` | JWT | CANDIDATE | — | Full candidate profile + completeness score |
| PUT | `/api/candidates/me` | JWT | CANDIDATE | `{ fullName, location, skills, ... }` | `200 { profile }` |
| POST | `/api/candidates/me/resume` | JWT | CANDIDATE | Multipart: `file` | `200 { resumeUrl, message }` |
| GET | `/api/employers/me` | JWT | EMPLOYER | — | Full employer profile |
| PUT | `/api/employers/me` | JWT | EMPLOYER | `{ companyName, website, ... }` | `200 { profile }` |
| POST | `/api/employers/me/logo` | JWT | EMPLOYER | Multipart: `file` | `200 { logoUrl }` |

#### 5.1.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-AUTH-SEC-01 | Email verification link contains a one-time token stored in Redis; token is invalidated immediately on use | FR-AUTH-01 |
| TR-AUTH-SEC-02 | OAuth state parameter validated to prevent CSRF on the OAuth callback | FR-AUTH-02 |
| TR-AUTH-SEC-03 | Refresh token rotation: each use of a refresh token issues a new one and invalidates the old; reuse of an old refresh token triggers immediate revocation of ALL user tokens | FR-AUTH-03 |
| TR-AUTH-SEC-04 | Resume files stored in a private S3 bucket; accessed only via pre-signed URLs (TTL: 15 min); URLs never stored in DB | FR-CP-02 |
| TR-AUTH-SEC-05 | Candidate `visibility: 'PRIVATE'` enforced at query level: `WHERE visibility = 'PUBLIC'` on all employer-facing candidate searches | FR-CP-05 |
| TR-AUTH-SEC-06 | Password reset tokens are single-use; token deleted from Redis immediately after use | FR-AUTH-06 |

---

### Feature 5.2 — Job Board

**PRD Reference:** PRD §5.2 (FR-JB-01 through FR-JB-11)

---

#### 5.2.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-JB-01 | Job creation endpoint validates all fields with Zod schema, inserts into `job_listings` PostgreSQL table with `status: 'PROCESSING'`, then dispatches a `trust-score` job to BullMQ queue | FR-JB-01, FR-JB-02 |
| TR-JB-02 | Job listing transitions: `PROCESSING → ACTIVE` (if Trust Score > 40) or `PROCESSING → QUARANTINED` (if Trust Score ≤ 40), updated by BullMQ worker after AI processing | FR-JB-02, FR-JB-04 |
| TR-JB-03 | Job search uses Elasticsearch full-text search on `title`, `description`, `requirements`; filtered queries for location, job_type, verification status, trust_score_range | FR-JB-05 |
| TR-JB-04 | Job listing response includes Match Score for authenticated candidates, fetched from Redis cache (`match:{candidateId}:{jobId}`) or computed on-demand if cache miss | FR-JB-06 |
| TR-JB-05 | Duplicate application check: `SELECT COUNT(*) FROM applications WHERE candidate_id = ? AND job_id = ? AND status != 'WITHDRAWN'` before inserting; returns 409 if exists | FR-JB-11 |
| TR-JB-06 | Pagination: `GET /api/jobs?page=1&limit=20`; uses PostgreSQL `OFFSET/LIMIT`; Elasticsearch `from/size` for search | FR-JB-10 |

#### 5.2.B — Database Requirements

| TR ID | Requirement | Database | Table |
|-------|------------|---------|-------|
| TR-JB-DB-01 | `job_listings` table: `(id UUID PK, employer_id UUID FK→employer_profiles.id, title VARCHAR NOT NULL, description TEXT NOT NULL, requirements TEXT, location VARCHAR, job_type ENUM('FULL_TIME','PART_TIME','REMOTE','CONTRACT'), salary_min INT, salary_max INT, status ENUM('PROCESSING','DRAFT','ACTIVE','CLOSED','QUARANTINED') DEFAULT 'PROCESSING', trust_score INT, trust_flags JSONB, created_at TIMESTAMP, updated_at TIMESTAMP)` | PostgreSQL | `job_listings` |
| TR-JB-DB-02 | `applications` table: `(id UUID PK, candidate_id UUID FK→candidate_profiles.id, job_id UUID FK→job_listings.id, status ENUM('APPLIED','SHORTLISTED','INTERVIEW_SCHEDULED','REJECTED','HIRED','WITHDRAWN') DEFAULT 'APPLIED', applied_at TIMESTAMP, updated_at TIMESTAMP, UNIQUE(candidate_id, job_id))` | PostgreSQL | `applications` |
| TR-JB-DB-03 | Elasticsearch index `job_listings_index`: maps `title`, `description`, `requirements`, `location`, `job_type`, `trust_score`, `employer_id`, `status`; sync from PostgreSQL via change-data-capture (CDC) or post-write hook | Elasticsearch | `job_listings_index` |
| TR-JB-DB-04 | Redis key pattern: `match:{candidateId}:{jobId}` → `{ score: float, breakdown: {...} }` TTL: 1 hour | Redis | — |

#### 5.2.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/jobs` | None (Match Score requires JWT) | Any | Paginated job listings. Query: `?page&limit&keyword&location&jobType&verified&minTrust&maxTrust` |
| POST | `/api/jobs` | JWT | EMPLOYER | Create job listing. Status starts as `PROCESSING`. |
| GET | `/api/jobs/{id}` | None | Any | Single listing. Includes Match Score if JWT present. |
| PUT | `/api/jobs/{id}` | JWT | EMPLOYER (owner) | Update listing. Re-triggers Trust Score if description changed. |
| DELETE | `/api/jobs/{id}` | JWT | EMPLOYER (owner) | Sets status to `CLOSED`. |
| GET | `/api/jobs/{id}/trust-score` | JWT | EMPLOYER (owner) / ADMIN | Trust Score value + flag explanations. |
| GET | `/api/jobs/{id}/applicants` | JWT | EMPLOYER (owner) | Applicant list sorted by Match Score. Supports `?sort=match_score\|applied_at`. |
| POST | `/api/jobs/{id}/apply` | JWT | CANDIDATE | Apply to job. Returns 409 if already applied. |
| DELETE | `/api/jobs/{id}/apply` | JWT | CANDIDATE | Withdraw application. |

#### 5.2.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-JB-SEC-01 | Employer ownership verified before allowing PUT/DELETE on a listing: `WHERE employer_id = req.user.employerId`; 403 if mismatch | FR-JB-08 |
| TR-JB-SEC-02 | Listings with `status != 'ACTIVE'` are excluded from `GET /api/jobs` for non-owner, non-admin requests | FR-JB-04 |
| TR-JB-SEC-03 | Trust Score signals and flags are only returned via `GET /api/jobs/{id}/trust-score` to EMPLOYER (owner) or ADMIN; candidates cannot access raw flag data | FR-FJD-10 |
| TR-JB-SEC-04 | Input sanitization on job description and requirements to prevent XSS before storing | FR-JB-01 |

---

### Feature 5.3 — AI Fake Job Detection System

**PRD Reference:** PRD §5.3 (FR-FJD-01 through FR-FJD-10)

---

#### 5.3.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-FJD-01 | BullMQ `trust-score-queue` worker dispatches each new job submission to the Python AI service via `POST /ai/trust-score`; Node.js queue producer adds job immediately after DB insert | FR-FJD-01 |
| TR-FJD-02 | Python Django endpoint `/ai/trust-score` receives `{jobId, title, description, salary_min, salary_max, company_domain, employer_id}` and runs the scoring pipeline | FR-FJD-01 |
| TR-FJD-03 | Trust Score pipeline steps: (1) NLP word count check with NLTK tokenizer, (2) Salary benchmark check against bundled `salary_benchmarks.json` dataset keyed by job category, (3) HTTP HEAD request to company website (timeout: 5 sec), (4) DNS lookup for domain validation, (5) Mass posting check via PostgreSQL count query | FR-FJD-02 |
| TR-FJD-04 | Trust Score calculated as: `Base(90) - Σ(penalty for each triggered signal) + bonus(+10 if VERIFIED company)`. Min = 0, Max = 100. Score and triggered flags written to `job_listings` table. | FR-FJD-03 |
| TR-FJD-05 | After scoring: if `trust_score ≤ 40` → update `status = 'QUARANTINED'`; else → `status = 'ACTIVE'`. Node.js notified via Redis pub/sub channel `job:scored:{jobId}` | FR-FJD-06 |
| TR-FJD-06 | Admin quarantine queue endpoint reads all `WHERE status = 'QUARANTINED'` with employer + flag data joined | FR-FJD-07 |
| TR-FJD-07 | Admin approve action → `status = 'ACTIVE'`; remove action → `status = 'REMOVED'`; resubmit → `status = 'DRAFT'` + email notification to employer | FR-FJD-08 |

#### 5.3.B — Database Requirements

| TR ID | Requirement | Database | Table / Source |
|-------|------------|---------|---------------|
| TR-FJD-DB-01 | `trust_score` INT and `trust_flags` JSONB columns on `job_listings` table; `trust_flags` stores array of triggered signal names and penalty values | PostgreSQL | `job_listings` |
| TR-FJD-DB-02 | `salary_benchmarks.json` static file bundled with Python service; structure: `{ "software_engineer": { "median": 80000, "currency": "INR" }, ... }`. Updated manually between deploys for MVP. | File system | Python service |
| TR-FJD-DB-03 | Mass posting check query: `SELECT COUNT(*) FROM job_listings WHERE employer_id = ? AND created_at > NOW() - INTERVAL '24 hours'`; penalty applied if count > 10 | PostgreSQL | `job_listings` |

#### 5.3.C — API Requirements

| Method | Route | Service | Auth | Description |
|--------|-------|---------|------|-------------|
| POST | `/ai/trust-score` | Python | Internal only (API key) | Receive job data, return `{ jobId, score, flags }` |
| GET | `/api/jobs/{id}/trust-score` | Node.js | JWT (EMPLOYER/ADMIN) | Returns `{ score, flags[], flagDescriptions[] }` |
| PATCH | `/api/admin/quarantine/{jobId}` | Node.js | JWT (ADMIN) | Body: `{ action }` |

#### 5.3.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-FJD-SEC-01 | Internal Node.js → Python service calls authenticated via a shared `X-Internal-API-Key` header (secret stored in env vars); Python service rejects calls without this header | FR-FJD-01 |
| TR-FJD-SEC-02 | Trust Score flags exposed to employers show only generic descriptions (e.g., "Description is too short") — not raw ML model scores or feature weights | FR-FJD-09, FR-FJD-10 |
| TR-FJD-SEC-03 | HTTP timeout on web-presence check is 5 seconds; failed checks are logged but do not block scoring pipeline | FR-FJD-02 |

---

### Feature 5.4 — AI Candidate Matching System

**PRD Reference:** PRD §5.4 (FR-CM-01 through FR-CM-08)

---

#### 5.4.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-CM-01 | When a candidate updates their profile or an employer updates a job listing, a `match-score` job is dispatched to BullMQ `match-score-queue` | FR-CM-08 |
| TR-CM-02 | Python endpoint `/ai/match` receives `{ candidateId, jobId, candidateProfile, jobRequirements }` and computes Match Score using SBERT `all-MiniLM-L6-v2` cosine similarity between candidate skills embedding and job requirements embedding | FR-CM-01 |
| TR-CM-03 | Match Score breakdown computed from 5 weighted factors: Skills overlap (40%), Experience match (25%), Title similarity (15%), Location preference (10%), Job type preference (10%) | FR-CM-02 |
| TR-CM-04 | Computed Match Score cached in Redis: `match:{candidateId}:{jobId}` → `{ score, breakdown }` TTL: 1 hour | FR-CM-06 |
| TR-CM-05 | Recommended Jobs feed: `GET /api/candidates/me/matches` fetches top-10 active listings by Match Score for the candidate; computed by comparing candidate embedding against all active job embeddings; results cached per candidate (TTL: 30 min) | FR-CM-04 |
| TR-CM-06 | Match Scores for job board page are batch-computed per candidate session: first request triggers async computation for top 50 visible listings; shown as loading state until cached | FR-CM-03 |

#### 5.4.B — Database Requirements

| TR ID | Requirement | Database | Storage |
|-------|------------|---------|---------|
| TR-CM-DB-01 | Candidate and job embeddings stored in **pgvector** extension on PostgreSQL: `candidate_embeddings(candidate_id, embedding vector(384))`, `job_embeddings(job_id, embedding vector(384))` | PostgreSQL + pgvector | — |
| TR-CM-DB-02 | Match Score cache: Redis key `match:{candidateId}:{jobId}` stores JSON blob; evicted after 1 hour or when profile/job changes | Redis | — |
| TR-CM-DB-03 | Recommended jobs cache: Redis key `recommended:{candidateId}` stores ordered list of `[{jobId, score}]`; TTL 30 min | Redis | — |

#### 5.4.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/candidates/me/matches` | JWT | CANDIDATE | Returns top-10 recommended jobs with Match Score + breakdown |
| GET | `/api/jobs/{id}/match` | JWT | CANDIDATE | Returns Match Score for a specific job (from cache or computed) |
| POST | `/ai/match` | Internal | Python | Compute Match Score; returns `{ score, breakdown }` |

#### 5.4.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-CM-SEC-01 | Match Scores are personal and candidate-specific; `GET /api/jobs/{id}/match` enforces that the requesting user's candidateId is used — never a query parameter | FR-CM-03 |
| TR-CM-SEC-02 | Private candidate profiles (`visibility: 'PRIVATE'`) are excluded from employer-facing applicant Match Score ranking | FR-CP-05 |

---

### Feature 5.5 — AI Resume Analyzer

**PRD Reference:** PRD §5.5 (FR-RA-01 through FR-RA-09)

---

#### 5.5.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-RA-01 | Resume upload: Multer middleware validates MIME type (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) and file size (≤ 5MB) before accepting | FR-RA-01 |
| TR-RA-02 | Accepted file streamed to AWS S3 (`resumes/{candidateId}/{timestamp}.{ext}`); S3 key stored in `resume_analyses` PostgreSQL table; also updates `candidate_profiles.resume_url` in PostgreSQL | FR-RA-01, FR-RA-09 |
| TR-RA-03 | Resume analysis job dispatched to Python via `POST /ai/resume/analyze` with `{ s3Key, candidateId, targetRole? }` | FR-RA-02 |
| TR-RA-04 | Python pipeline: (1) Download file from S3 (presigned URL), (2) Parse with PyMuPDF (PDF) or python-docx (DOCX), (3) Extract sections via regex + NLP, (4) Score each category (weights per PRD §5.5), (5) Generate suggestions using LLM prompt, (6) Detect integrity flags | FR-RA-02, FR-RA-03, FR-RA-06 |
| TR-RA-05 | Analysis result stored as a row in the `resume_analyses` PostgreSQL table; latest 3 documents per candidate retained (delete oldest when 4th is added) | FR-RA-07, FR-RA-08 |
| TR-RA-06 | Node.js BullMQ worker polls Python service for result (async); once complete, result stored in PostgreSQL and candidate notified via Redis pub/sub `resume:analyzed:{candidateId}` | FR-RA-04 |

#### 5.5.B — Database Requirements

| TR ID | Requirement | Database | Collection / Table |
|-------|------------|---------|-------------------|
| TR-RA-DB-01 | PostgreSQL table `resume_analyses`: `(id UUID, candidate_id UUID, file_url VARCHAR, overall_score INT, ats_score INT, strengths JSONB, weaknesses JSONB, suggestions JSONB, missing_keywords JSONB, integrity_flags JSONB, target_role VARCHAR, analyzed_at TIMESTAMPTZ)` | PostgreSQL | `resume_analyses` |
| TR-RA-DB-02 | Compound index `idx_ra_candidate_date` on `resume_analyses(candidate_id, analyzed_at DESC)` for fast lookup and history pagination | PostgreSQL | `resume_analyses` |
| TR-RA-DB-03 | `candidate_profiles.resume_url` updated in PostgreSQL when new resume uploaded (FR-RA-09 — single source of truth for active resume) | PostgreSQL | `candidate_profiles` |

#### 5.5.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/candidates/me/resume` | JWT | CANDIDATE | Multipart upload; triggers analysis; returns `{ resumeUrl, analysisId, status: "processing" }` |
| GET | `/api/candidates/me/resume/analysis` | JWT | CANDIDATE | Latest analysis report; query `?all=true` for all 3 stored reports |
| GET | `/api/candidates/me/resume/analysis/{id}` | JWT | CANDIDATE | Specific analysis report by ID |
| POST | `/ai/resume/analyze` | Internal | Python | Accepts `{ s3Key, candidateId, targetRole? }`; returns full analysis JSON |

#### 5.5.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-RA-SEC-01 | Resume files stored in **private** S3 bucket; Python service accesses via pre-signed URLs (TTL: 5 min for analysis pipeline) | FR-RA-01 |
| TR-RA-SEC-02 | File MIME type validated server-side (not just by extension); MIME sniffing done with `file-type` npm package | FR-RA-01 |
| TR-RA-SEC-03 | PostgreSQL `resume_analyses` rows are scoped by `candidate_id`; all queries include `WHERE candidate_id = req.user.candidateId` filter | FR-RA-07 |
| TR-RA-SEC-04 | LLM prompt injection prevention: resume content passed as data context, not as part of the system instruction; max input token limit enforced (8,192 tokens) | FR-RA-03 |

---

### Feature 5.6 — Company Verification System

**PRD Reference:** PRD §5.6 (FR-CV-01 through FR-CV-10)

---

#### 5.6.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-CV-01 | Verification request: employer uploads document (PDF ≤ 10MB) to S3 (`verifications/{employerId}/{timestamp}.pdf`); verification record created in PostgreSQL `company_verifications` table with `status: 'PENDING'` | FR-CV-01 |
| TR-CV-02 | Automated check pipeline (Node.js): (1) DNS lookup on domain using `dns.lookup()`; (2) HTTP HEAD request to website URL (timeout: 5 sec); (3) LinkedIn URL regex validation. Each check recorded as `pass/fail/timeout` in `verification_checks` JSONB column | FR-CV-02 |
| TR-CV-03 | Lightweight web presence check (Python `/ai/verify`): HTTP GET to homepage, checks `status === 200` and `body.length > 500`. Not BeautifulSoup-level parsing in MVP. | FR-CV-03 |
| TR-CV-04 | After automated checks (within 30 sec), verification record enters admin queue (`status` remains `PENDING`) | FR-CV-04 |
| TR-CV-05 | Admin APPROVE → `status = 'VERIFIED'`, `verified_at = NOW()`; update `employer_profiles.verified = true`; dispatch approval email | FR-CV-05, FR-CV-06 |
| TR-CV-06 | Admin REJECT → `status = 'REJECTED'`, `admin_notes = reason`; dispatch rejection email with reason | FR-CV-07 |

#### 5.6.B — Database Requirements

| TR ID | Requirement | Database | Table |
|-------|------------|---------|-------|
| TR-CV-DB-01 | `company_verifications` table: `(id UUID PK, employer_id UUID FK→employer_profiles.id, status ENUM('UNVERIFIED','PENDING','VERIFIED','REJECTED') DEFAULT 'UNVERIFIED', registration_number VARCHAR, document_url VARCHAR, website_url VARCHAR, linkedin_url VARCHAR, verification_checks JSONB, admin_notes TEXT, admin_id UUID FK→users.id, verified_at TIMESTAMP, created_at TIMESTAMP)` | PostgreSQL | `company_verifications` |
| TR-CV-DB-02 | `employer_profiles.verified BOOLEAN DEFAULT false` — set to `true` on admin approval; used for badge display on all listings without re-querying `company_verifications` | PostgreSQL | `employer_profiles` |

#### 5.6.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/companies/me/verify` | JWT | EMPLOYER | Submit verification request with document upload |
| GET | `/api/companies/me/verify/status` | JWT | EMPLOYER | Returns `{ status, checks, adminNotes? }` |
| GET | `/api/companies/{id}` | None | Any | Public company trust profile |
| GET | `/api/admin/verifications` | JWT | ADMIN | List PENDING verifications |
| PATCH | `/api/admin/verifications/{id}` | JWT | ADMIN | `{ action, reason? }` |

#### 5.6.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-CV-SEC-01 | Verification documents stored in private S3; admins access via pre-signed URLs (TTL: 30 min for review session) | FR-CV-01 |
| TR-CV-SEC-02 | Employer can only access their own verification record; `WHERE employer_id = req.user.employerId` enforced | FR-CV-02 |
| TR-CV-SEC-03 | HTTP checks use a fixed 5-second timeout; DNS lookup uses system resolver; neither follows redirects to unknown domains | FR-CV-02 |

---

### Feature 5.7 — AI Career Assistant

**PRD Reference:** PRD §5.7 (FR-CA-01 through FR-CA-09)

---

#### 5.7.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-CA-01 | Chat endpoint `POST /api/assistant/chat` receives `{ message, sessionId? }` from frontend; routes to Python `/ai/chat` | FR-CA-01 |
| TR-CA-02 | Intent classification: Python service classifies message against 5 intents (`RESUME_REVIEW`, `INTERVIEW_PREP`, `CAREER_PATH`, `SKILL_GAP`, `JD_OPTIMIZATION`) using keyword matching + zero-shot classifier; confidence threshold ≥ 0.75 for template response, else LLM fallback | FR-CA-02, FR-CA-03, FR-CA-04 |
| TR-CA-03 | Context injection: user profile (role, skills, experience), latest resume score, and last 3 applications fetched from DB and injected into LLM system prompt | FR-CA-05 |
| TR-CA-04 | LLM call via LangChain: `ChatGoogleGenerativeAI` (Gemini 1.5 Pro) primary; `ChatOpenAI` (GPT-4o) fallback; retry with exponential backoff (max 2 retries) | FR-CA-04 |
| TR-CA-05 | Session chat history: PostgreSQL `chat_sessions` table stores messages for current session in a `messages` JSONB array column. Session ID is a UUID; history is cleaned after 24 hours | FR-CA-06 |
| TR-CA-06 | Disclaimer appended to every LLM response by the Python service before returning to Node.js | FR-CA-07 |
| TR-CA-07 | Daily LLM rate limit: Redis key `llm_count:{userId}:{date}` incremented on each LLM call; if count ≥ 20, return `429` with message "Daily limit reached" | FR-CA-09 |

#### 5.7.B — Database Requirements

| TR ID | Requirement | Database | Collection |
|-------|------------|---------|-----------|
| TR-CA-DB-01 | PostgreSQL table `chat_sessions`: `(id UUID, user_id UUID, messages JSONB, created_at TIMESTAMPTZ)` | PostgreSQL | `chat_sessions` |
| TR-CA-DB-02 | Index `idx_cs_user_date` on `chat_sessions(user_id, created_at DESC)` for fast lookup and chronological sorting; background cron task purges sessions older than 24 hours | PostgreSQL | `chat_sessions` |
| TR-CA-DB-03 | Redis key `llm_count:{userId}:{YYYY-MM-DD}` (INT); TTL = midnight of next day (auto-reset daily) | Redis | — |

#### 5.7.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/assistant/chat` | JWT | Any | `{ message, sessionId? }` → `{ reply, sessionId, disclaimer }` |
| GET | `/api/assistant/history` | JWT | Any | `?sessionId=UUID` → `{ messages[] }` |
| POST | `/ai/chat` | Internal | Python | Full chat processing; returns `{ reply, sessionId }` |

#### 5.7.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-CA-SEC-01 | LLM prompt hardened against injection: user message passed as `Human:` turn only; system prompt is static + structured context; user cannot override system instructions | FR-CA-04 |
| TR-CA-SEC-02 | LLM daily rate limit enforced at the Node.js layer before calling Python (pre-checks Redis count); even if client bypasses frontend limit, backend blocks at 20 | FR-CA-09 |
| TR-CA-SEC-03 | Chat history is user-scoped; `GET /api/assistant/history` validates `session.user_id === req.user.id` | FR-CA-06 |
| TR-CA-SEC-04 | LLM API keys stored in environment variables only; never exposed in logs or responses | FR-CA-04 |

---

### Feature 5.8 — Dashboard

**PRD Reference:** PRD §5.8 (FR-DB-C01 through FR-DB-C03, FR-DB-E01 through FR-DB-E05)

---

#### 5.8.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-DB-01 | Candidate dashboard endpoint aggregates: profile completeness (computed field), latest resume score (PostgreSQL lookup), top-5 matches (Redis cache), last-10 applications (PostgreSQL join with job_listings + employer_profiles) | FR-DB-C01 |
| TR-DB-02 | Employer dashboard endpoint aggregates: verification status (PostgreSQL), active listing count, total applicant count, listing list with Trust Score and applicant counts | FR-DB-E01 |
| TR-DB-03 | Applicant list for a job: PostgreSQL JOIN of `applications` → `candidate_profiles`; sorted by Match Score (fetched from Redis or computed); employer can sort by `applied_at` | FR-DB-E03 |
| TR-DB-04 | Employer profile view of candidate (FR-DB-E05): returns full profile summary if `application.status >= SHORTLISTED`; otherwise returns `{ fullName: masked, title, skills, yearsExperience, resumeScore }` only | FR-DB-E05 |
| TR-DB-05 | Application status update triggers: Redis pub/sub notification + BullMQ email job dispatch | FR-DB-E04, FR-NOTIF-04 |
| TR-DB-06 | Status polling: frontend polls `GET /api/candidates/me/applications` every 5 seconds using `setInterval` in React `useEffect`; long-polling / WebSocket deferred to Phase 2 | FR-DB-C02 (AC) |

#### 5.8.B — Database Requirements

| TR ID | Requirement | Database | Table |
|-------|------------|---------|-------|
| TR-DB-DB-01 | Index on `applications(candidate_id, created_at DESC)` for candidate application history | PostgreSQL | `applications` |
| TR-DB-DB-02 | Index on `applications(job_id, match_score DESC)` for employer applicant list sort | PostgreSQL | `applications` |
| TR-DB-DB-03 | `applications.match_score FLOAT` column — denormalized Match Score stored at application time for consistent sort ordering (cache-independent) | PostgreSQL | `applications` |

#### 5.8.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/candidates/me/dashboard` | JWT | CANDIDATE | Aggregated dashboard data |
| GET | `/api/candidates/me/applications` | JWT | CANDIDATE | Last 10 applications with status |
| DELETE | `/api/candidates/me/applications/{id}` | JWT | CANDIDATE | Withdraw application (sets status to WITHDRAWN) |
| GET | `/api/employers/me/dashboard` | JWT | EMPLOYER | Aggregated employer dashboard data |
| GET | `/api/jobs/{id}/applicants/{applicantId}` | JWT | EMPLOYER | View candidate profile (scoped by application status) |
| PATCH | `/api/jobs/{id}/applicants/{applicantId}/status` | JWT | EMPLOYER | `{ status: "SHORTLISTED" \| "INTERVIEW_SCHEDULED" \| "REJECTED" \| "HIRED" }` |

#### 5.8.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-DB-SEC-01 | Candidate contact details (email, phone) revealed only after employer sets status to `SHORTLISTED` or above; enforced server-side via conditional field masking in the response | FR-DB-E05 |
| TR-DB-SEC-02 | Application withdrawal only by the owning candidate: `WHERE candidate_id = req.user.candidateId` | FR-DB-C03 |
| TR-DB-SEC-03 | Employer can only view applicants for jobs they own: `jobs.employer_id = req.user.employerId` join enforced on all applicant endpoints | FR-DB-E03 |

---

### Feature 5.9 — Email Notification Service

**PRD Reference:** PRD §5.9 (FR-NOTIF-01 through FR-NOTIF-06)

---

#### 5.9.A — Backend Service

| TR ID | Technical Requirement | PRD Ref |
|-------|----------------------|---------|
| TR-NOTIF-01 | All emails dispatched asynchronously via BullMQ `email-queue`; worker processes jobs using `@sendgrid/mail` Node.js SDK | FR-NOTIF-01 |
| TR-NOTIF-02 | Email templates stored as HTML strings in `src/email/templates/`; data injected via `handlebars` template engine | FR-NOTIF-05 |
| TR-NOTIF-03 | Notification types and their triggers: `VERIFY_EMAIL` (on register), `RESET_PASSWORD` (on forgot-password), `VERIFY_STATUS` (on admin action), `APP_STATUS` (on employer status change) | FR-NOTIF-01 through FR-NOTIF-04 |
| TR-NOTIF-04 | User notification preferences stored in `notification_preferences` PostgreSQL table; worker checks preferences before sending optional emails | FR-NOTIF-06 |
| TR-NOTIF-05 | SendGrid retry policy: if delivery fails, BullMQ retries up to 3 times with exponential backoff (1s, 5s, 30s) | FR-NOTIF-01 |

#### 5.9.B — Database Requirements

| TR ID | Requirement | Database | Table |
|-------|------------|---------|-------|
| TR-NOTIF-DB-01 | `notification_preferences` table: `(id UUID PK, user_id UUID FK→users.id, app_status_email BOOLEAN DEFAULT true, marketing_email BOOLEAN DEFAULT false, created_at TIMESTAMP)` | PostgreSQL | `notification_preferences` |
| TR-NOTIF-DB-02 | `email_log` table: `(id UUID PK, user_id UUID, type ENUM, sent_at TIMESTAMP, status ENUM('SENT','FAILED','BOUNCED'), sendgrid_message_id VARCHAR)` — audit trail for all sent emails | PostgreSQL | `email_log` |

#### 5.9.C — API Requirements

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/candidates/me/preferences` | JWT | CANDIDATE | Get notification preferences |
| PUT | `/api/candidates/me/preferences` | JWT | CANDIDATE | Update notification preferences |
| GET | `/api/employers/me/preferences` | JWT | EMPLOYER | Get notification preferences |
| PUT | `/api/employers/me/preferences` | JWT | EMPLOYER | Update notification preferences |

#### 5.9.D — Security Requirements

| TR ID | Security Requirement | PRD Ref |
|-------|---------------------|---------|
| TR-NOTIF-SEC-01 | Unsubscribe link uses a signed token (HMAC-SHA256 of `userId + type`); token verified server-side before updating preferences | FR-NOTIF-05 |
| TR-NOTIF-SEC-02 | Verification and password-reset emails are mandatory and cannot be disabled via preferences | FR-NOTIF-06 |
| TR-NOTIF-SEC-03 | SendGrid API key stored in environment variable only; never logged or exposed | FR-NOTIF-01 |

---

## 6. 🗃️ Complete Database Schema

### 6.1 PostgreSQL Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(20) NOT NULL CHECK (role IN ('CANDIDATE','EMPLOYER','ADMIN')),
  email_verified BOOLEAN DEFAULT false,
  google_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate Profiles
CREATE TABLE candidate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  job_title VARCHAR(255),
  skills JSONB DEFAULT '[]',
  years_experience INT,
  preferred_job_types JSONB DEFAULT '[]',
  visibility VARCHAR(10) DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC','PRIVATE')),
  resume_url VARCHAR(500),
  completeness_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Employer Profiles
CREATE TABLE employer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  website VARCHAR(500),
  industry VARCHAR(100),
  company_size VARCHAR(50),
  location VARCHAR(255),
  description TEXT,
  logo_url VARCHAR(500),
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Job Listings
CREATE TABLE job_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT,
  location VARCHAR(255),
  job_type VARCHAR(20) CHECK (job_type IN ('FULL_TIME','PART_TIME','REMOTE','CONTRACT')),
  salary_min INT,
  salary_max INT,
  status VARCHAR(20) DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','DRAFT','ACTIVE','CLOSED','QUARANTINED','REMOVED')),
  trust_score INT CHECK (trust_score BETWEEN 0 AND 100),
  trust_flags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_job_listings_status ON job_listings(status);
CREATE INDEX idx_job_listings_employer ON job_listings(employer_id);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_listings(id) ON DELETE CASCADE,
  status VARCHAR(25) DEFAULT 'APPLIED' CHECK (status IN ('APPLIED','SHORTLISTED','INTERVIEW_SCHEDULED','REJECTED','HIRED','WITHDRAWN')),
  match_score FLOAT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);
CREATE INDEX idx_applications_candidate ON applications(candidate_id, applied_at DESC);
CREATE INDEX idx_applications_job ON applications(job_id, match_score DESC);

-- Company Verifications
CREATE TABLE company_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID REFERENCES employer_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  registration_number VARCHAR(100),
  document_url VARCHAR(500),
  website_url VARCHAR(500),
  linkedin_url VARCHAR(500),
  verification_checks JSONB DEFAULT '{}',
  admin_notes TEXT,
  admin_id UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employer_id)
);

-- Candidate Embeddings (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE candidate_embeddings (
  candidate_id UUID PRIMARY KEY REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  embedding vector(384),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE job_embeddings (
  job_id UUID PRIMARY KEY REFERENCES job_listings(id) ON DELETE CASCADE,
  embedding vector(384),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  app_status_email BOOLEAN DEFAULT true,
  marketing_email BOOLEAN DEFAULT false,
  UNIQUE(user_id)
);

-- Email Log
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'SENT',
  sendgrid_message_id VARCHAR(255),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 MongoDB Collections

```javascript
// resume_analyses
{
  _id: ObjectId,
  candidate_id: String,   // UUID from PostgreSQL
  file_url: String,       // S3 key
  overall_score: Number,  // 0-100
  ats_score: Number,      // 0-100
  strengths: [String],
  weaknesses: [String],
  suggestions: [{ priority: Number, text: String }],
  missing_keywords: [String],
  integrity_flags: [String],
  target_role: String,    // optional
  analyzed_at: Date
}
// Index: { candidate_id: 1, analyzed_at: -1 }
// Max 3 documents per candidate (enforced at application layer)

// chat_sessions
{
  _id: ObjectId,
  session_id: String,     // UUID
  user_id: String,        // UUID from PostgreSQL
  messages: [{
    role: String,         // "user" | "assistant"
    content: String,
    timestamp: Date
  }],
  created_at: Date        // TTL index: expires after 24 hours
}
// Index: { session_id: 1 }
// TTL index: { created_at: 1 }, expireAfterSeconds: 86400
```

---

## 7. 🔌 API Design Standards

### 7.1 Request / Response Format

All APIs follow these standards:

```
Base URL:         https://api.trusthireai.com/api/v1
Content-Type:     application/json
Authentication:   Authorization: Bearer <JWT>
Internal calls:   X-Internal-API-Key: <secret>
```

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 142 }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "ValidationError",
  "code": 400,
  "message": "Description must be at least 100 words.",
  "details": [{ "field": "description", "issue": "too_short" }]
}
```

### 7.2 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET / PUT / PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body) |
| 400 | Validation error |
| 401 | Missing or invalid JWT |
| 403 | Valid JWT but insufficient role |
| 404 | Resource not found |
| 409 | Conflict (duplicate application, already verified) |
| 422 | Unprocessable entity (file wrong format) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | AI service unavailable |

### 7.3 Versioning

All routes prefixed with `/api/v1/`; version increment required for any breaking change.

---

## 8. ⚡ Performance Requirements

| ID | Requirement | Target | Mechanism |
|----|------------|--------|-----------|
| PERF-01 | Page load time | < 2 seconds | Next.js SSR for public pages; CDN caching |
| PERF-02 | API response time (non-AI) | < 300ms P95 | PostgreSQL indexes; Redis caching |
| PERF-03 | Trust Score computation | ≤ 60 seconds | BullMQ async; Python pipeline optimization |
| PERF-04 | Resume analysis | ≤ 60 seconds | Async queue; S3 streaming download |
| PERF-05 | Match Score (cached) | < 100ms | Redis lookup |
| PERF-06 | Match Score (cold) | ≤ 5 seconds | SBERT inference; pgvector ANN search |
| PERF-07 | Search results | < 2 seconds | Elasticsearch; query optimization |
| PERF-08 | Concurrent users (MVP) | 500 | Stateless Node.js; Redis session store |

---

## 9. 🧪 Testing Requirements

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit — Node.js | Jest | ≥ 80% for business logic functions |
| Integration — Node.js | Jest + Supertest | All API endpoints with valid + invalid inputs |
| Unit — Python | pytest | ≥ 80% for ML pipeline functions |
| Integration — Python | pytest + DRF test client | All `/ai/*` endpoints |
| E2E | Playwright | Critical paths: register, post job, apply, get analysis |
| Load | k6 | 500 concurrent users on `/api/jobs` and `/api/auth/login` |

---

## 10. 📁 Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [ProjectContext.md](./ProjectContext.md) | Master vision, tech stack, constraints | ✅ Active (v1.1.0) |
| [PRD.md](./PRD.md) | Product requirements (parent of this TRD) | ✅ Active (v1.1.0) |
| `DatabaseSchema.md` | Full ERD diagrams | 🔲 Pending |
| `APISpec.md` | Full OpenAPI 3.0 specification | 🔲 Pending |
| `SecurityPolicy.md` | Auth, privacy, GDPR compliance detail | 🔲 Pending |
| `TestingStrategy.md` | Full QA and testing plan | 🔲 Pending |
| `AIModels.md` | ML model training specs and evaluation | 🔲 Pending |

---

*© 2026 TrustHire AI. Confidential — Internal Use Only.*
*TRD Version 1.0.0 | Created: 2026-06-19 | Author: Engineering Team*
*References: [ProjectContext.md](./ProjectContext.md) | [PRD.md](./PRD.md)*
