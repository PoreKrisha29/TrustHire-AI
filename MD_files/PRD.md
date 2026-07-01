# TrustHire AI — Product Requirements Document (PRD)

> **Version:** 1.1.0 (Post-Review Corrections Applied — 2026-06-19)
> **Created:** 2026-06-19
> **Status:** Active — MVP Phase 1
> **Parent Document:** [ProjectContext.md](./ProjectContext.md) ← All definitions, vision, and tech stack are inherited from this file.
> **Scope:** This PRD covers **MVP Phase 1 only** (Target: 3–4 months). Non-MVP features are explicitly excluded.
> **Audience:** Engineering Team, Design Team, QA Team, Founding Team

---

## 1. 📋 Document Purpose

This Product Requirements Document (PRD) defines the **functional requirements, user stories, acceptance criteria, and system behavior** for the TrustHire AI MVP. It translates the high-level vision in `ProjectContext.md` into precise, actionable specifications that guide engineering and design execution.

Every requirement in this document maps to a feature that is **within the MVP scope** as defined in `ProjectContext.md §MVP Scope`.

---

## 2. 🎯 Product Goals (MVP)

| Goal | Description | Success Signal |
|------|-------------|----------------|
| **G1 — Restore Trust** | Every job listing must carry a verified Trust Score before being visible | 100% of listings have a Trust Score |
| **G2 — Smart Matching** | Candidates see jobs ranked by semantic relevance, not just keywords | Match acceptance rate ≥ 40% |
| **G3 — Resume Intelligence** | Every candidate receives actionable resume feedback in < 60 seconds | 3,000+ reports generated in 6 months |
| **G4 — Company Authenticity** | Employers are encouraged to verify their company; verification is a **trust badge, not a posting gate** — unverified employers may post but listings are flagged | ≥ 60% of active listings carry a Verified Badge by Month 6 |
| **G5 — Career Guidance** | Candidates get AI-powered career help 24/7 | 2,000+ assistant sessions/month |
| **G6 — Smooth Onboarding** | Users complete registration and see value within 5 minutes | Onboarding drop-off rate < 30% |

---

## 3. 👤 User Personas

### Persona 1 — Aanya (Job Seeker)
- **Age:** 23 | **Background:** Fresh Computer Science graduate
- **Goal:** Land her first software developer job without wasting time on fake or irrelevant listings
- **Frustrations:** Applied to 40 jobs, got 3 responses; unsure if companies are real; resume keeps getting rejected by ATS
- **TrustHire AI Value:** Trust Score on every listing, AI resume feedback, matched job recommendations

### Persona 2 — Rohan (Hiring Manager)
- **Age:** 34 | **Background:** Engineering Manager at a 50-person startup
- **Goal:** Hire a senior backend developer within 3 weeks
- **Frustrations:** Receives 200+ applications, 80% are irrelevant; spends 10 hours/week screening
- **TrustHire AI Value:** AI-ranked candidate matches, resume pre-screening, verified company badge builds trust with candidates

### Persona 3 — Priya (HR Manager)
- **Age:** 29 | **Background:** Talent Acquisition at an SME
- **Goal:** Manage multiple open roles efficiently, reduce time-to-hire
- **Frustrations:** Manual screening is slow; no data on why candidates drop off; company profile looks unprofessional
- **TrustHire AI Value:** Dashboard with applicant pipeline, AI match scores, company verification profile

---

## 4. 🗺️ User Journey Overview

```
CANDIDATE FLOW
──────────────
Register → Build Profile → Upload Resume → Browse Verified Job Board
→ See Match Score per listing → Apply → Chat with AI Career Assistant
→ Track applications on Dashboard

EMPLOYER FLOW
─────────────
Register → Complete Company Verification → Post Job Listing
→ Listing receives Trust Score → Browse AI-matched Candidates
→ Review applicants ranked by Match Score → Dashboard pipeline view
```

---

## 5. ⚙️ Functional Requirements

---

### 5.0 — Admin Role & Admin Dashboard

> **Note:** The Admin role is a platform-internal role used by the TrustHire AI founding/ops team. Admins are **not** created through the public sign-up flow.

#### 5.0.1 Admin Authentication

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-ADMIN-01 | Admin accounts shall be created directly via a server-side CLI script — not through the public registration UI |
| FR-ADMIN-02 | Admins shall log in via the standard `/api/auth/login` endpoint using their email and password |
| FR-ADMIN-03 | Admin JWT tokens shall have a shorter expiry (8 hours) and shall not issue a long-lived refresh token |
| FR-ADMIN-04 | Admin role shall be identified by `role: "ADMIN"` in the JWT payload; all admin routes shall verify this role and return 403 Forbidden for non-admins |

#### 5.0.2 Admin Dashboard

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-ADMIN-05 | The admin dashboard shall be accessible only to users with `role: "ADMIN"` at route `/admin` |
| FR-ADMIN-06 | The admin dashboard shall display a **Quarantine Queue**: all job listings with Trust Score ≤ 40, showing listing title, employer, posted date, Trust Score, and flagged signals |
| FR-ADMIN-07 | Admins shall be able to take the following actions on quarantined listings: **Approve** (listing goes Active), **Remove** (listing permanently deleted), **Request Resubmission** (employer notified to correct and resubmit) |
| FR-ADMIN-08 | The admin dashboard shall display a **Verification Queue**: all company verification requests with status `PENDING`, showing company name, submission date, and automated check results |
| FR-ADMIN-09 | Admins shall be able to: **Approve** (company receives Verified Badge), **Reject** (employer notified with reason), **Request More Documents** (employer notified) |
| FR-ADMIN-10 | The admin dashboard shall display platform-level stats: Total Users, Total Active Listings, Total Quarantined Listings, Total Verified Companies, Total Pending Verifications |

**Acceptance Criteria:**

- [ ] A non-admin user attempting to access `/admin` receives a 403 Forbidden response
- [ ] The quarantine queue displays all listings with Trust Score ≤ 40
- [ ] Admin approves a quarantined listing → listing immediately appears on the public job board
- [ ] Admin rejects a company verification → employer receives a reason email within 5 minutes
- [ ] Admin platform stats refresh on page load

---

### 5.1 — Authentication & User Profiles

#### 5.1.1 Registration & Login

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-AUTH-01 | New user | Register with my email and password | I can create an account on TrustHire AI |
| US-AUTH-02 | New user | Register using Google OAuth | I can sign up quickly without creating a new password |
| US-AUTH-03 | Returning user | Log in with my credentials | I can access my dashboard |
| US-AUTH-04 | New user | Choose my role (Candidate / Employer) during sign-up | The platform shows me the right onboarding flow |
| US-AUTH-05 | Logged-in user | Log out securely | My session is terminated |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-AUTH-01 | The system shall support email + password registration with email verification |
| FR-AUTH-02 | The system shall support Google OAuth 2.0 social login |
| FR-AUTH-03 | The system shall issue a JWT access token (short-lived: 15 min) and a refresh token (7 days) on successful login |
| FR-AUTH-04 | The system shall require the user to select a role — `CANDIDATE` or `EMPLOYER` — during registration |
| FR-AUTH-05 | Passwords must meet minimum requirements: 8+ characters, 1 uppercase, 1 number, 1 special character |
| FR-AUTH-06 | The system shall support password reset via a time-limited email link (expires in 30 minutes) |
| FR-AUTH-07 | The system shall store passwords using bcrypt hashing (cost factor ≥ 12) |
| FR-AUTH-08 | When a JWT access token expires, the system shall silently attempt to refresh it using the stored refresh token. If the refresh token has also expired, the user shall be redirected to the login page with the message: "Your session has expired. Please log in again." |

**Acceptance Criteria:**

- [ ] A user can register with email and password and receives a verification email
- [ ] A user can register and log in via Google OAuth
- [ ] An unverified email account cannot post jobs or apply to listings
- [ ] A failed login after 5 attempts triggers a 15-minute account lockout
- [ ] JWT tokens are invalidated on logout

---

#### 5.1.2 Candidate Profile

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-CP-01 | Candidates shall complete a profile with: Full Name, Location, Job Title, Skills (tags), Years of Experience, Preferred Job Types |
| FR-CP-02 | Candidates shall be able to upload a resume (PDF or DOCX, max 5MB) |
| FR-CP-03 | The system shall display a **Profile Completeness** percentage (0–100%) |
| FR-CP-04 | Candidates shall be able to edit all profile fields at any time |
| FR-CP-05 | Candidate profiles shall include a visibility toggle: **Public** (visible to all employers and searches) / **Private** (hidden from all employer searches). *Note: A "Recruiters Only" tier requires a separate Recruiter user role — deferred to Phase 2.* |

**Acceptance Criteria:**

- [ ] A candidate with 0% profile completeness sees a guided prompt to complete their profile
- [ ] Resume upload supports PDF and DOCX formats; other formats are rejected with an error message
- [ ] Profile completeness increases as fields are filled
- [ ] A candidate can toggle their profile to Private and disappear from employer searches

---

#### 5.1.3 Employer Profile

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-EP-01 | Employers shall complete a company profile with: Company Name, Website, Industry, Company Size, Location, Description |
| FR-EP-02 | Employers shall upload a company logo (PNG/JPG, max 2MB) |
| FR-EP-03 | Employers shall upload verification documents (Business registration certificate, GST/Tax ID) |
| FR-EP-04 | The employer profile page shall be publicly visible to candidates |
| FR-EP-05 | Unverified employers can post jobs, but listings will be marked **Unverified** |

**Acceptance Criteria:**

- [ ] An employer who has not uploaded verification documents sees a banner: "Complete Verification to get a Verified Badge"
- [ ] Company logo renders correctly on all job listings posted by that employer
- [ ] Employer profile is publicly accessible at `/companies/{company-id}`

---

### 5.2 — Job Board

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-JB-01 | Candidate | Browse all job listings on a searchable board | I can discover open roles |
| US-JB-02 | Candidate | Filter jobs by title, location, type, and Trust Score | I only see relevant and trustworthy listings |
| US-JB-03 | Candidate | See a Trust Score badge on every listing | I know before clicking if the job is legitimate |
| US-JB-04 | Employer | Post a new job listing | Candidates can discover my open role |
| US-JB-05 | Employer | Edit or close a job listing I posted | I can update or remove outdated roles |
| US-JB-06 | Candidate | Apply to a job with one click (using my profile) | I don't need to re-enter information manually |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-JB-01 | Employers shall be able to create a job listing with: Title, Description, Requirements, Location, Job Type (Full-time/Part-time/Remote/Contract), Salary Range (optional) |
| FR-JB-02 | Every submitted job listing shall be automatically processed by the AI Fake Job Detection system before going live |
| FR-JB-03 | The system shall display each listing's **Trust Score** (0–100) as a color-coded badge: 🔴 0–40 (Low — quarantined, never shown to candidates), 🟡 41–70 (Medium — shown with caution indicator), 🟢 71–100 (High — shown normally) |
| FR-JB-04 | Listings with Trust Score **≤ 40** shall be quarantined for manual admin review and NOT shown to candidates (consistent with badge band boundary in FR-JB-03) |
| FR-JB-05 | Candidates shall be able to search listings by keyword, filter by: Location, Job Type, Company Verification status, Trust Score range |
| FR-JB-06 | Each listing shall display: Company Name, Company Verified Badge (if verified), Trust Score, Posted Date, Match Score (for logged-in candidates) |
| FR-JB-07 | Candidates shall apply to a job in one click using their existing profile data |
| FR-JB-08 | Employers shall be able to set a listing status to: Draft, Active, Closed |
| FR-JB-09 | A closed listing shall not appear in search results but shall remain accessible via direct URL |
| FR-JB-10 | The job board shall be paginated: 20 listings per page |
| FR-JB-11 | The system shall prevent a candidate from submitting more than one application to the same active job listing. A second attempt shall display the message: "You have already applied to this role." The Apply button shall be replaced with a disabled "Applied" badge on the listing. |

**Acceptance Criteria:**

- [ ] A newly posted job listing does not appear publicly until Trust Score processing is complete
- [ ] A listing with Trust Score < 40 goes to a "Pending Review" queue visible only to admins
- [ ] A candidate without a profile can view listings but is prompted to complete their profile before applying
- [ ] Search returns relevant results within 2 seconds
- [ ] A candidate can apply to a job and sees a confirmation: "Application Submitted Successfully"

---

### 5.3 — AI Fake Job Detection System

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-FJD-01 | Candidate | See a Trust Score on every job listing | I can instantly know if a job is legitimate |
| US-FJD-02 | Admin | Review flagged job listings | I can manually approve or remove suspicious listings |
| US-FJD-03 | Employer | Understand why my listing received a low Trust Score | I can correct the issues and resubmit |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-FJD-01 | The system shall automatically analyze every new job listing using an NLP classification pipeline (scikit-learn + rule engine) |
| FR-FJD-02 | The classifier shall detect the following fraud signals: vague/generic description (< 100 words), unrealistic salary claim (> 3× role-category benchmark using a **bundled static salary dataset** loaded at deployment — see Appendix A), company with no detectable web presence, mismatched company name vs. registered domain, mass posting (> 10 listings from same employer in 24 hours) |
| FR-FJD-03 | The system shall assign a **Trust Score** (integer, 0–100) based on weighted fraud signal penalties |
| FR-FJD-04 | The Trust Score shall be computed within **60 seconds** of job submission (accounts for async NLP processing, HTTP web-presence checks, and concurrent load — 30 seconds was not achievable under realistic conditions) |
| FR-FJD-05 | The system shall expose the Trust Score via API: `GET /api/jobs/{id}/trust-score` |
| FR-FJD-06 | Listings with Trust Score **≤ 40** shall be placed in a `QUARANTINED` status (boundary aligned with FR-JB-03 and FR-JB-04) |
| FR-FJD-07 | The admin dashboard shall display all `QUARANTINED` listings with the flagged signals highlighted |
| FR-FJD-08 | Admins shall be able to: Approve (override quarantine), Permanently Remove, or Request Employer Resubmission |
| FR-FJD-09 | Trust Score reasoning (up to 3 key flags) shall be visible to the posting employer via their dashboard |
| FR-FJD-10 | Candidates shall see only the Trust Score badge, not the raw flag details |

**Trust Score Calculation Model (MVP):**

| Signal | Penalty |
|--------|---------|
| Description < 100 words | −20 points |
| No company website found | −25 points |
| Salary > 3× industry median | −20 points |
| Company domain mismatch | −15 points |
| Mass posting detected | −10 points |
| Company verified on platform | +10 points |
| Base Score | 90 |

**Acceptance Criteria:**

- [ ] Every job listing displays a Trust Score badge within **60 seconds** of submission
- [ ] A test listing with 3+ fraud signals scores below 40 and is quarantined
- [ ] A quarantined listing is not visible to candidates or in search results
- [ ] An admin can approve a quarantined listing and it immediately becomes visible
- [ ] The employer sees a message: "Your listing has been flagged for [reason]. Please update and resubmit."

---

### 5.4 — AI Candidate Matching System

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-CM-01 | Candidate | See a Match Score on each job listing | I know which jobs I'm most suitable for |
| US-CM-02 | Candidate | See a ranked list of jobs recommended for me | I find the best opportunities without searching |
| US-CM-03 | Employer | See a ranked list of candidates who match my job listing | I focus on the best applicants first |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-CM-01 | The system shall compute a **Match Score** (0–100%) between a candidate profile and a job listing using semantic embeddings (sentence-transformers SBERT) |
| FR-CM-02 | The Match Score shall consider: Skills overlap, Years of experience vs. requirement, Job title similarity, Location preference, Job type preference |
| FR-CM-03 | Candidates shall see their personal Match Score on every listing on the Job Board (requires login) |
| FR-CM-04 | The system shall provide each candidate a **"Recommended Jobs"** feed — top 10 listings ranked by Match Score |
| FR-CM-05 | Employers shall see applicants ranked by Match Score on their job posting's applicant list |
| FR-CM-06 | Match Scores shall be computed asynchronously via BullMQ job queue and cached in Redis (TTL: 1 hour) |
| FR-CM-07 | A Match Score breakdown shall be visible on hover: showing score contribution from each factor |
| FR-CM-08 | Match Scores shall be recomputed when a candidate updates their profile or an employer updates the job listing |

**Acceptance Criteria:**

- [ ] A logged-in candidate sees a Match Score (e.g., "87% Match") on every visible job listing
- [ ] The Recommended Jobs feed shows a minimum of 5 listings if the candidate has a complete profile
- [ ] An employer's applicant list is sorted by Match Score (highest first) by default
- [ ] Match Score breakdown tooltip shows at least 3 contributing factors
- [ ] A candidate with a blank profile sees "Complete your profile to see Match Scores"

---

### 5.5 — AI Resume Analyzer

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-RA-01 | Candidate | Upload my resume and get instant AI feedback | I can improve it before applying |
| US-RA-02 | Candidate | Know my resume's ATS compatibility score | I understand why I'm being auto-rejected |
| US-RA-03 | Candidate | See specific suggestions to improve my resume | I know exactly what to fix |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-RA-01 | Candidates shall be able to upload a resume in PDF or DOCX format (max 5MB) |
| FR-RA-02 | The system shall parse the resume using PyMuPDF (PDF) or python-docx (DOCX) to extract: Contact Info, Work Experience, Education, Skills, Projects, Certifications |
| FR-RA-03 | The system shall generate a structured **Resume Analysis Report** containing: Overall Score (0–100), ATS Compatibility Score, Strengths (list), Weaknesses (list), Missing Keywords (compared to target role if provided), Improvement Suggestions (ordered by priority) |
| FR-RA-04 | The Resume Analysis Report shall be generated within 60 seconds of upload |
| FR-RA-05 | Candidates shall be able to specify a **target job role** to receive role-specific keyword gap analysis |
| FR-RA-06 | The system shall flag potential resume integrity issues: **overlapping employment dates**, **employment gaps > 12 months**, and **inconsistent date formatting**. *Note: Institution authenticity verification (e.g., checking if a university exists) requires external academic registry APIs — deferred to Phase 2.* |
| FR-RA-07 | The Resume Analysis Report shall be persistent — stored and accessible from the candidate's dashboard |
| FR-RA-08 | Candidates shall be able to re-upload and analyze an updated resume at any time. The new upload **replaces the candidate's active profile resume**. The system retains only the **last 3 analysis reports** per candidate (MVP storage constraint — full version history is Phase 2). |
| FR-RA-09 | A resume uploaded via the AI Resume Analyzer shall automatically become the candidate's active profile resume, replacing the previous one. The candidate shall see a confirmation banner: "Your profile resume has been updated." This resolves the dual-upload ambiguity between FR-CP-02 and FR-RA-01 — they are the **same file and same upload flow**. |

**Resume Score Breakdown:**

| Category | Weight |
|----------|--------|
| Contact Information completeness | 10% |
| Work Experience quality & clarity | 30% |
| Skills relevance & count | 25% |
| Education & Certifications | 15% |
| ATS formatting & keywords | 20% |

**Acceptance Criteria:**

- [ ] A resume upload processes and returns a report within 60 seconds
- [ ] The ATS score is displayed as a progress bar with a numeric value
- [ ] At least 3 actionable improvement suggestions are shown for any resume
- [ ] Uploading a non-PDF/DOCX file shows an error: "Unsupported file format. Please upload PDF or DOCX."
- [ ] A candidate can view their previous analysis reports from the dashboard
- [ ] Resume with overlapping job dates triggers an integrity flag in the report

---

### 5.6 — Company Verification System

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-CV-01 | Employer | Submit my company for verification | My listings show a Verified Badge to build candidate trust |
| US-CV-02 | Candidate | See which companies are verified | I only apply to legitimate employers |
| US-CV-03 | Admin | Review and approve company verification requests | I ensure only legitimate companies get a Verified Badge |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-CV-01 | Employers shall submit a **Verification Request** containing: Company Registration Number, Business Registration Certificate (PDF, max 10MB), Official Website URL, LinkedIn Company Page URL |
| FR-CV-02 | The system shall perform automated basic checks **within 30 seconds**: Domain ownership validation (DNS lookup), Website reachability (HTTP ping), LinkedIn URL format validation. Any individual check that times out (> 10 sec) shall be recorded as "Unable to Verify" rather than failing the entire submission — the request still proceeds to the admin queue. |
| FR-CV-03 | The system shall perform a **lightweight HTTP web-presence check**: verify the homepage returns HTTP 200 and the page body is non-empty (> 500 characters). *Full HTML scraping and content parsing with BeautifulSoup (e.g., detecting About page, contact info) is deferred to Phase 2 — it introduces fragility from bot-detection blocks and layout changes.* |
| FR-CV-04 | Post automated checks, the verification request shall enter a manual admin review queue |
| FR-CV-05 | Admins shall be able to: Approve (grant Verified Badge — Basic Tier), Reject with a reason, Request additional documents |
| FR-CV-06 | Upon approval, the employer's profile and all their job listings shall display a **✅ Verified Company** badge |
| FR-CV-07 | Upon rejection, the employer receives an email with the specific rejection reason and instructions to reapply |
| FR-CV-08 | Verification status shall be one of: `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED` |
| FR-CV-09 | A publicly visible **Company Trust Profile** shall display: Company Name, Verified Badge, Industry, Size, Location, Job listings count, Date Verified |
| FR-CV-10 | Unverified companies can post jobs, but their listings display an **⚠️ Unverified Company** warning |

**Acceptance Criteria:**

- [ ] An employer can submit a verification request from their dashboard
- [ ] The automated domain check completes within 10 seconds of submission
- [ ] The admin sees a verification queue with automated check results and uploaded documents
- [ ] A verified employer's badge appears on all their job listings immediately after admin approval
- [ ] A rejected employer receives an email within 5 minutes of admin action
- [ ] Candidates can filter the job board to show only "Verified Companies" listings

---

### 5.7 — AI Career Assistant

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-CA-01 | Candidate | Ask the AI assistant for resume improvement advice | I get personalized tips based on my actual resume |
| US-CA-02 | Candidate | Ask for interview preparation tips for a specific role | I feel more confident going into interviews |
| US-CA-03 | Candidate | Ask about career paths for my skill set | I understand what roles to target next |
| US-CA-04 | Employer | Ask the assistant to help write a better job description | I attract more relevant candidates |

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-CA-01 | The AI Career Assistant shall be available as a chat interface accessible from all pages via a floating button |
| FR-CA-02 | The assistant shall support the following **pre-defined intent categories**: Resume Review, Interview Prep, Career Path Advice, Skill Gap Analysis, Job Description Optimization (for employers) |
| FR-CA-03 | Queries matching pre-defined intents shall be answered using a template + data from the user's profile |
| FR-CA-04 | Queries outside pre-defined intents shall fall back to the LLM (Google Gemini API / GPT-4o) for open-ended responses |
| FR-CA-05 | The assistant shall be **context-aware**: it reads the logged-in user's profile, resume score, and recent applications to personalize responses |
| FR-CA-06 | Conversation history shall persist within a session (not across sessions in MVP) |
| FR-CA-07 | The assistant shall always include a **disclaimer**: "This is AI-generated advice. Please verify with a professional." |
| FR-CA-08 | The assistant shall gracefully handle out-of-scope questions: "I'm specialized in recruitment and career guidance. Can I help you with something related?" |
| FR-CA-09 | LLM responses shall be rate-limited per user: max 20 LLM queries per day (MVP constraint to control costs) |

**Acceptance Criteria:**

- [ ] The AI chat widget is visible on all pages after login
- [ ] Asking "How can I improve my resume?" returns personalized advice using the candidate's actual resume score
- [ ] Asking "Write a job description for a Python developer" (as employer) returns a structured JD
- [ ] An out-of-scope question receives a graceful redirect response
- [ ] A user who hits the 20-query daily limit sees: "You've reached your daily AI chat limit. Come back tomorrow!"
- [ ] Disclaimer text is visible on every AI response

---

### 5.8 — Dashboard

**User Stories:**

| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-DB-01 | Candidate | See all my job applications in one place | I can track where I've applied and the status |
| US-DB-02 | Candidate | See my resume analysis score prominently | I'm reminded to improve it |
| US-DB-03 | Candidate | See my top job matches | I can quickly act on the best opportunities |
| US-DB-04 | Employer | See all my job listings and applicant counts | I get an overview of my hiring pipeline |
| US-DB-05 | Employer | See applicants ranked by Match Score | I know who to interview first |

**Functional Requirements — Candidate Dashboard:**

| ID | Requirement |
|----|------------|
| FR-DB-C01 | The candidate dashboard shall display: Profile Completeness %, Resume Score (with link to full report), Top 5 Recommended Jobs, Recent Applications (last 10), AI Career Assistant shortcut |
| FR-DB-C02 | Each application entry shall show: Job Title, Company Name + Verified Badge, Application Date, Status (**Applied → Shortlisted → Interview Scheduled → Rejected / Hired**). Status is set by the employer (FR-DB-E04); default state for a new application is "Applied." |
| FR-DB-C03 | Candidates shall be able to withdraw an application from the dashboard |

**Functional Requirements — Employer Dashboard:**

| ID | Requirement |
|----|------------|
| FR-DB-E01 | The employer dashboard shall display: Company Verification Status + action CTA, Active Job Listings (count + list), Total Applicants (across all listings), Quick-access buttons: "Post New Job", "View Applicants" |
| FR-DB-E02 | Each listing entry shall show: Job Title, Status (Draft/Active/Closed), Trust Score badge, Applicant Count, Date Posted |
| FR-DB-E03 | Clicking a listing shall open an applicant list sorted by Match Score (high to low) |
| FR-DB-E04 | Employers shall be able to update an applicant's status: **Shortlisted / Interview Scheduled / Rejected / Hired**. Status changes are immediately reflected on the candidate's dashboard (aligned with FR-DB-C02 status values). |
| FR-DB-E05 | Employers shall be able to click an applicant's name to view their **candidate profile summary**: Full Name, Current Title, Skills, Years of Experience, Resume Score. Full contact details (email, phone number) are revealed **only after** the employer updates the applicant's status to Shortlisted or above. |

**Acceptance Criteria:**

- [ ] A new candidate sees their dashboard with prompts to complete profile, upload resume, and browse jobs
- [ ] Application status updates are reflected on the candidate's dashboard within 5 seconds via **client-side polling** (WebSocket real-time push is deferred to Phase 2)
- [ ] An employer's applicant list defaults to Match Score sort; employer can toggle to sort by Application Date
- [ ] Dashboard loads within 2 seconds on a standard connection

---

### 5.9 — Email Notification Service

> **Correction:** Multiple FRs across the PRD depend on email delivery (FR-AUTH-01, FR-AUTH-06, FR-CV-07) but no section defined the notification system. This section closes that gap.

**Functional Requirements:**

| ID | Requirement |
|----|------------|
| FR-NOTIF-01 | The system shall send an **email verification email** to every new user upon registration, containing a time-limited link (expires in 24 hours). Email service: **SendGrid** (MVP) / AWS SES (fallback). |
| FR-NOTIF-02 | The system shall send a **password reset email** containing a time-limited link (expires in 30 minutes) when triggered by FR-AUTH-06. |
| FR-NOTIF-03 | The system shall send a **company verification status email** to employers when their verification request is Approved or Rejected, within 5 minutes of admin action. The email shall include the reason (if rejected) and next steps. |
| FR-NOTIF-04 | The system shall send an **application status update email** to a candidate when an employer changes their application status (Shortlisted / Interview Scheduled / Rejected / Hired). |
| FR-NOTIF-05 | All outbound emails shall use a consistent TrustHire AI branded HTML template: Logo, message body, CTA button, and a GDPR-compliant unsubscribe link in the footer. |
| FR-NOTIF-06 | Candidates and employers shall be able to manage email notification preferences from their dashboard settings: opt-out of non-critical notifications (status updates) while critical emails (verification, password reset) remain mandatory. |

**Acceptance Criteria:**

- [ ] Registration triggers a verification email within 60 seconds of sign-up
- [ ] Password reset link expires after 30 minutes and shows an error if reused
- [ ] Employer receives verification status email within 5 minutes of admin action
- [ ] Candidate receives application status email within 5 minutes of employer action
- [ ] All emails render correctly in Gmail, Outlook, and Apple Mail
- [ ] Unsubscribe link in email footer correctly disables optional notifications

---

## 6. 🚫 Non-Functional Requirements

| Category | Requirement |
|----------|------------|
| **Performance** | All page loads complete within 2 seconds on a 10 Mbps connection |
| **AI Processing** | Trust Score computed ≤ 30 sec; Resume Report generated ≤ 60 sec; Match Score computed ≤ 5 sec (cached) |
| **Availability** | 99.5% uptime target for MVP (allows ~3.6 hours downtime/month) |
| **Scalability** | System must handle 500 concurrent users without degradation in MVP phase |
| **Security** | All passwords bcrypt-hashed; all API endpoints JWT-authenticated; HTTPS enforced everywhere |
| **Data Privacy** | User PII stored with row-level access control; GDPR-compliant deletion on user request |
| **Accessibility** | UI meets WCAG 2.1 AA standards (keyboard navigation, screen reader support, contrast ratios) |
| **Browser Support** | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| **Error Handling** | All API errors return structured JSON: `{ "error": "...", "code": "...", "message": "..." }` |
| **File Upload** | Max resume file size: 5MB; Max company document size: 10MB |

---

## 7. 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 + React 18)         │
│         React Components → Hooks → Zustand State             │
│         JSON API calls via React Hooks (useEffect/fetch)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JSON)
┌──────────────────────▼──────────────────────────────────────┐
│              BACKEND — Node.js / Express.js Layer            │
│     Routes: /auth  /jobs  /candidates  /companies  /apply    │
│     Middleware: JWT Auth, Rate Limiting, File Upload (Multer) │
│     Job Queue: BullMQ (async AI task dispatch)               │
└──────┬──────────────────────────────────────────┬───────────┘
       │ PostgreSQL / MongoDB                      │ REST API (JSON)
┌──────▼──────────┐                   ┌────────────▼────────────────┐
│   Databases      │                   │  Python / Django AI Service  │
│  - PostgreSQL    │                   │  - Django + DRF REST API     │
│  - MongoDB       │                   │  - Fake Job Detection (ML)   │
│  - Redis (cache) │                   │  - Resume Analyzer (NLP)     │
│  - AWS S3        │                   │  - Candidate Matching (SBERT)│
└──────────────────┘                   │  - Career Assistant (LLM)   │
                                       │  - Web Scraping (BeautifulSoup)│
                                       └──────────────────────────────┘
```

---

## 8. 🔌 API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| POST | `/api/auth/logout` | Invalidate session |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/forgot-password` | Trigger password reset email |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all active job listings (paginated) |
| POST | `/api/jobs` | Create a new job listing (Employer only) |
| GET | `/api/jobs/{id}` | Get single job listing |
| PUT | `/api/jobs/{id}` | Update a job listing (owner only) |
| DELETE | `/api/jobs/{id}` | Close/delete a listing |
| GET | `/api/jobs/{id}/trust-score` | Get Trust Score and signals |
| GET | `/api/jobs/{id}/applicants` | Get applicants (Employer only, Match Score sorted) |

### Candidates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/candidates/me` | Get current candidate profile |
| PUT | `/api/candidates/me` | Update candidate profile |
| POST | `/api/candidates/me/resume` | Upload resume |
| GET | `/api/candidates/me/resume/analysis` | Get resume analysis report |
| GET | `/api/candidates/me/matches` | Get recommended job matches |
| GET | `/api/candidates/me/applications` | Get application history |
| POST | `/api/jobs/{id}/apply` | Apply to a job |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies/{id}` | Get company profile (public) |
| PUT | `/api/companies/me` | Update company profile |
| POST | `/api/companies/me/verify` | Submit verification request |
| GET | `/api/companies/me/verify/status` | Check verification status |

### AI Career Assistant
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/assistant/chat` | Send a message, receive AI response |
| GET | `/api/assistant/history` | Get current session chat history |

---

## 9. 🗃️ Data Models (Summary)

### User
```json
{
  "id": "uuid",
  "email": "string",
  "password_hash": "string",
  "role": "CANDIDATE | EMPLOYER",
  "email_verified": "boolean",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Job Listing
```json
{
  "id": "uuid",
  "employer_id": "uuid",
  "title": "string",
  "description": "string",
  "requirements": "string",
  "location": "string",
  "job_type": "FULL_TIME | PART_TIME | REMOTE | CONTRACT",
  "salary_min": "number | null",
  "salary_max": "number | null",
  "status": "DRAFT | ACTIVE | CLOSED | QUARANTINED",
  "trust_score": "integer (0-100)",
  "trust_flags": ["array of flag strings"],
  "created_at": "timestamp"
}
```

### Resume Analysis (MongoDB Document)
```json
{
  "_id": "ObjectId",
  "candidate_id": "uuid",
  "file_url": "string (S3 URL)",
  "overall_score": "integer (0-100)",
  "ats_score": "integer (0-100)",
  "strengths": ["array"],
  "weaknesses": ["array"],
  "suggestions": ["ordered array"],
  "missing_keywords": ["array"],
  "integrity_flags": ["array"],
  "analyzed_at": "timestamp"
}
```

### Company Verification
```json
{
  "id": "uuid",
  "employer_id": "uuid",
  "status": "UNVERIFIED | PENDING | VERIFIED | REJECTED",
  "registration_number": "string",
  "document_url": "string (S3 URL)",
  "website_url": "string",
  "linkedin_url": "string",
  "auto_checks_passed": "boolean",
  "admin_notes": "string | null",
  "verified_at": "timestamp | null"
}
```

---

## 10. 🧪 Acceptance Testing Checklist

### Authentication & Profiles
- [ ] Register with email → receive verification email → verify → login ✅
- [ ] Register with Google OAuth → directed to role selection ✅
- [ ] 5 failed logins → account locked for 15 minutes ✅
- [ ] Candidate completes profile → completeness % increases ✅
- [ ] Employer uploads logo → appears on all job listings ✅

### Job Board
- [ ] Employer posts job → listing in "Processing" state → Trust Score badge appears ✅
- [ ] Listing with Trust Score < 40 → not visible to candidates ✅
- [ ] Candidate searches by keyword → relevant results returned ✅
- [ ] Candidate applies → confirmation message shown → appears in employer's applicant list ✅

### AI Fake Job Detection
- [ ] Job with vague description + no company website → quarantined ✅
- [ ] Admin approves quarantined listing → immediately visible on job board ✅
- [ ] Employer sees their Trust Score reasoning on dashboard ✅

### AI Candidate Matching
- [ ] Candidate with complete profile → sees Match Scores on job board ✅
- [ ] Candidate with empty profile → sees "Complete profile" prompt instead of Match Score ✅
- [ ] Employer's applicant list sorted by Match Score by default ✅

### AI Resume Analyzer
- [ ] Upload PDF resume → analysis report in < 60 seconds ✅
- [ ] Upload unsupported file type → error message shown ✅
- [ ] Analysis report shows Overall Score, ATS Score, Strengths, Weaknesses, Suggestions ✅

### Company Verification
- [ ] Employer submits verification → status shows "Pending Review" ✅
- [ ] Admin approves → Verified Badge appears on employer profile and all listings ✅
- [ ] Admin rejects → employer receives email with reason ✅

### AI Career Assistant
- [ ] Chat widget visible after login ✅
- [ ] "Improve my resume" → personalized advice using resume score ✅
- [ ] Out-of-scope question → graceful redirect response ✅
- [ ] 20+ queries in one day → daily limit message shown ✅

### Dashboard
- [ ] Candidate dashboard shows: Profile %, Resume Score, Top Matches, Applications ✅
- [ ] Employer dashboard shows: Listing count, Total applicants, Verification status ✅
- [ ] Dashboard loads in < 2 seconds ✅

---

## 11. 🚫 Explicitly Out of Scope (MVP)

The following features are **not** part of this PRD and must not be implemented in Phase 1:

| Feature | Why Deferred |
|---------|-------------|
| Mobile apps (iOS / Android) | Web-first approach for MVP; native apps in Phase 3 |
| Payment gateway / Subscription billing | Revenue model to be validated post-MVP |
| Advanced analytics & reporting | Requires sufficient data volume; Phase 2 feature |
| API marketplace / ATS integrations | Enterprise feature; Phase 2+ |
| Multi-language support | English-first for MVP; localization in Phase 3 |
| Video interview AI | Complex feature; Phase 2+ |
| Blockchain credential verification | Phase 3 innovation feature |
| Salary intelligence engine | Requires third-party salary data; Phase 2 |
| Diversity & Inclusion module | Phase 2 ethical AI feature |

---

## 12. ⚠️ Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| AI fake job detection false positives | Medium | High | Human-in-the-loop admin review queue; employer appeal mechanism |
| LLM API costs exceed budget | Medium | Medium | Rate limiting (20 queries/day/user); response caching; prompt optimization |
| Resume parser fails on complex formats | High | Medium | Graceful fallback: manual upload with structured form input |
| Low employer adoption at launch | High | High | Offer free verification for first 3 months; targeted outreach to SMEs |
| Data cold start for matching | High | Medium | Use pre-trained SBERT embeddings; no training data required for MVP |
| Verification queue backlog | Medium | Medium | Automated pre-screening reduces admin burden to high-confidence cases only |

---

## 13. 📊 Success Metrics (MVP — 6 Months)

> Inherited from `ProjectContext.md §Success Metrics` and mapped to specific features.

> ⚠️ **Targets revised downward from ProjectContext.md following MVP realism review.** Original targets assumed paid acquisition channels and significant brand recognition — neither exists at MVP launch. Targets below reflect organic growth from a bootstrap, first-launch product.

| Feature | KPI | **Revised MVP Target (Month 6)** | Original Target (Retired) |
|---------|-----|----------------------------------|---------------------------|
| Auth & Profiles | Registered Candidates | **500+** | ~~5,000+~~ — no paid acquisition in MVP |
| Company Verification | Verified Companies | **30+** | ~~200+~~ — manual admin review is a bottleneck |
| AI Fake Job Detection | Precision (real positives caught) | **≥ 85%** | ~~≥ 90%~~ — more realistic for MVP-stage model |
| AI Candidate Matching | Match Acceptance Rate | **≥ 35%** | ~~≥ 40%~~ |
| AI Resume Analyzer | Reports Generated | **300+** | ~~3,000+~~ |
| AI Career Assistant | Monthly Sessions | **200+** | ~~2,000+~~ |
| Job Board | Listings with Trust Score | **100% coverage** | ✅ Unchanged |
| Dashboard | 30-day User Retention | **≥ 25%** | ~~≥ 35%~~ |
| Overall Platform | NPS Score | **≥ 30** | ~~≥ 50~~ — "excellent" for a brand-new 6-month product |

---

## 14. 📁 Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [ProjectContext.md](./ProjectContext.md) | Master vision, tech stack, constraints | ✅ Active |
| `TechArchitecture.md` | System design, microservices, data flow | 🔲 Pending |
| `DatabaseSchema.md` | Full ERD and data model definitions | 🔲 Pending |
| `AIModels.md` | ML model specs, training data, evaluation | 🔲 Pending |
| `APISpec.md` | Full OpenAPI specification | 🔲 Pending |
| `UIUXDesign.md` | Wireframes, design system | 🔲 Pending |
| `SecurityPolicy.md` | Auth, privacy, compliance | 🔲 Pending |

---

*© 2026 TrustHire AI. Confidential — Internal Use Only.*
*PRD Version 1.1.0 | Created: 2026-06-19 | Last Updated: 2026-06-19 (22 Post-Review Corrections Applied) | Author: Product Team*
*References: [ProjectContext.md](./ProjectContext.md)*
