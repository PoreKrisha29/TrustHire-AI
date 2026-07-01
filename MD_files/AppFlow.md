# TrustHire AI — Application Flow Document

> **Version:** 1.0.0
> **Created:** 2026-06-19
> **Status:** Active — MVP Phase 1
> **Parent Documents:**
> - [ProjectContext.md](./ProjectContext.md) — Vision, features, tech stack
> - [PRD.md](./PRD.md) — Product requirements (v1.1.0)
> - [TRD.md](./TRD.md) — Technical requirements (v1.0.0)
> - [Schema.md](./Schema.md) — Database schema (v1.0.0)
> **Audience:** Engineering, Design, QA, Product — anyone building or testing the platform

---

## 1. 📋 Document Purpose

This document maps every major user journey and system process in TrustHire AI MVP using Mermaid diagrams. It answers the question: **"What happens when?"** — for every actor, interaction, and AI pipeline in the platform.

---

## 2. 🗺️ Platform Overview — System Context

```mermaid
flowchart TD
    C([🎓 Candidate]) --> FE[Next.js Frontend]
    E([🏢 Employer]) --> FE
    A([🔐 Admin]) --> FE

    FE -->|REST JSON over HTTPS| NB[Node.js Express Backend]

    NB -->|Sync queries| PG[(PostgreSQL\nUsers · Jobs · Applications)]
    NB -->|Document queries| MG[(MongoDB\nResume Reports · Chat)]
    NB -->|Cache / Queue| RD[(Redis\nSessions · BullMQ · Match Cache)]
    NB -->|File upload| S3[(AWS S3\nResumes · Company Docs)]
    NB -->|Internal API| PY[Python Django AI Service]
    NB -->|Email jobs| EQ[BullMQ Email Queue]
    EQ -->|Sends email| SG[SendGrid]

    PY -->|Trust Score| NB
    PY -->|Match Score| NB
    PY -->|Resume Analysis| NB
    PY -->|Career Assistant| NB
    PY -->|LLM calls| LLM[Gemini API / GPT-4o]
    PY -->|Read files| S3
```

---

## 3. 👤 Candidate Journey

### 3.1 Full Candidate Lifecycle

```mermaid
flowchart TD
    START([🎓 New Candidate\nVisits TrustHire AI]) --> REG

    REG[Register with Email\nor Google OAuth]
    REG --> VER{Email\nVerified?}
    VER -->|No| WAIT[Check inbox for\nverification email]
    WAIT --> VER
    VER -->|Yes| ROLE[Select Role: CANDIDATE]

    ROLE --> ONBOARD[Onboarding Flow:\nComplete Profile]
    ONBOARD --> PROFILE[Fill: Name · Location\nJob Title · Skills\nExperience · Job Preferences]

    PROFILE --> UPLOAD[Upload Resume\nPDF or DOCX]
    UPLOAD --> ANALYSIS[AI Analyzes Resume\nGenerates ATS Report]

    ANALYSIS --> DASH[Candidate Dashboard\nProfile Completeness %]

    DASH --> BROWSE{What does\ncandidate do?}

    BROWSE -->|Browse Jobs| BOARD[Job Board\nSee Trust Score on each listing]
    BROWSE -->|Get Recommendations| REC[Recommended Jobs Feed\nTop 10 by Match Score]
    BROWSE -->|Use AI Assistant| CHAT[AI Career Assistant\nResume tips · Interview prep]

    BOARD --> FILTER[Filter by:\nLocation · Job Type · Verified\nTrust Score range]
    FILTER --> VIEW[View Listing\nSee Match Score + Trust Badge]
    REC --> VIEW

    VIEW --> APPLY{Already\nApplied?}
    APPLY -->|Yes| BADGE[Show Disabled\nApplied Badge]
    APPLY -->|No| DO_APPLY[One-click Apply\nUsing profile data]

    DO_APPLY --> CONFIRM[Confirmation:\nApplication Submitted]
    CONFIRM --> TRACK[Track in Dashboard:\nApplication History]

    TRACK --> STATUS{Employer\nUpdates Status}
    STATUS -->|Shortlisted| EMAIL_SL[Receive Email:\nYou have been Shortlisted]
    STATUS -->|Interview| EMAIL_IV[Receive Email:\nInterview Scheduled]
    STATUS -->|Rejected| EMAIL_RJ[Receive Email:\nApplication Update]
    STATUS -->|Hired| EMAIL_HR[Receive Email:\nCongratulations]

    EMAIL_SL --> TRACK
    EMAIL_IV --> TRACK
    EMAIL_RJ --> TRACK

    CHAT --> INTENT{Query\nType?}
    INTENT -->|Resume Review| RES_TIP[Get Personalized\nResume Improvement Tips]
    INTENT -->|Interview Prep| INT_TIP[Get Role-specific\nInterview Questions]
    INTENT -->|Career Path| CAR_TIP[Get Career Path\nSuggestions]
    INTENT -->|Skill Gap| GAP[See Missing Skills\nfor Target Role]
```

---

### 3.2 Candidate Onboarding Detail

```mermaid
flowchart LR
    A[Land on Homepage] --> B[Click: Get Started]
    B --> C{Choose\nSign-up Method}
    C -->|Email| D[Enter Email + Password\nSelect Role: Candidate]
    C -->|Google| E[Google OAuth\nConsent Screen]

    D --> F[Receive Verification\nEmail within 60 sec]
    F --> G[Click Email Link\nAccount Activated]
    E --> H[Auto-verified\nGo to Role Selection]
    H --> I[Select Role: CANDIDATE]

    G --> J[Onboarding Step 1:\nBasic Info]
    I --> J

    J --> K[Onboarding Step 2:\nSkills + Experience]
    K --> L[Onboarding Step 3:\nJob Preferences]
    L --> M[Onboarding Step 4:\nUpload Resume]

    M --> N{Resume\nUploaded?}
    N -->|Yes| O[AI Analysis Triggered\nReport in 60 sec]
    N -->|Skip| P[Profile Completeness 80%\nPrompt to upload later]

    O --> Q[Dashboard\nProfile Completeness 100%]
    P --> Q
    Q --> R[🎯 Start Browsing Jobs]
```

---

## 4. 🏢 Employer / Recruiter Journey

### 4.1 Full Employer Lifecycle

```mermaid
flowchart TD
    START([🏢 New Employer\nVisits TrustHire AI]) --> REG

    REG[Register with Email\nor Google OAuth]
    REG --> ROLE[Select Role: EMPLOYER]
    ROLE --> PROF[Complete Company Profile:\nName · Website · Industry\nSize · Location · Description]
    PROF --> LOGO[Upload Company Logo]
    LOGO --> DASH[Employer Dashboard]

    DASH --> ACTION{What does\nemployer do?}

    ACTION -->|Post a Job| POST[Create Job Listing:\nTitle · Description · Requirements\nLocation · Type · Salary]
    ACTION -->|Verify Company| VERIFY[Submit Verification\nRequest]
    ACTION -->|Browse Candidates| BROWSE[View Matched\nApplicants]

    POST --> TRUST[AI Trust Score\nPipeline Triggered]
    TRUST --> TRUST_RESULT{Trust Score\nResult}
    TRUST_RESULT -->|Score 41-100| ACTIVE[Listing ACTIVE\nVisible on Job Board]
    TRUST_RESULT -->|Score 0-40| QUARANTINE[Listing QUARANTINED\nAdmin Review Required]

    QUARANTINE --> ADMIN_ACT{Admin\nDecision}
    ADMIN_ACT -->|Approve| ACTIVE
    ADMIN_ACT -->|Reject| NOTIFY_E[Employer Notified:\nReason + Instructions]
    ADMIN_ACT -->|Resubmit| EDIT[Employer Edits\nListing]
    EDIT --> POST
    NOTIFY_E --> EDIT

    ACTIVE --> APPLICANTS[Candidates Apply\nMatch Scores Computed]
    APPLICANTS --> REVIEW[View Applicants\nSorted by Match Score]

    REVIEW --> CANDIDATE_VIEW[Click Candidate Name\nView Profile Summary]
    CANDIDATE_VIEW --> STATUS_SET{Set Application\nStatus}
    STATUS_SET -->|Shortlisted| SHORT[Status: Shortlisted\nCandidate Contact Revealed\nEmail Sent to Candidate]
    STATUS_SET -->|Rejected| REJECT[Status: Rejected\nEmail Sent to Candidate]
    SHORT --> INTERVIEW[Status: Interview Scheduled\nEmail Sent to Candidate]
    INTERVIEW --> HIRE_DEC{Hiring\nDecision}
    HIRE_DEC -->|Hire| HIRED[Status: Hired\nEmail Sent to Candidate]
    HIRE_DEC -->|Reject| REJECT

    VERIFY --> AUTO_CHECK[Automated Checks:\nDNS · HTTP · LinkedIn]
    AUTO_CHECK --> ADMIN_Q[Admin Verification Queue]
    ADMIN_Q --> VER_RESULT{Admin\nDecision}
    VER_RESULT -->|Approved| BADGE[Verified Badge Granted\nAll listings show badge]
    VER_RESULT -->|Rejected| REJ_EMAIL[Rejection Email\nWith Reason + Steps]
    VER_RESULT -->|More Docs| MORE[Request More\nDocuments]
```

---

### 4.2 Job Posting Flow Detail

```mermaid
flowchart LR
    A[Employer clicks\nPost New Job] --> B[Fill Job Form:\nTitle · Description · Requirements\nLocation · Type · Salary]

    B --> C{Form\nValid?}
    C -->|No| D[Show Validation Errors:\nTitle too short · Missing type\netc.]
    D --> B

    C -->|Yes| E[Submit to\nPOST /api/jobs]
    E --> F[Job saved to DB\nstatus = PROCESSING]
    F --> G[BullMQ dispatches\ntrust-score job]
    G --> H[Employer sees:\nListing Under Review]
    H --> I[Python AI Service\nComputes Trust Score]
    I --> J{Trust Score\nResult}
    J -->|Score greater than 40| K[status = ACTIVE\nListing visible on job board\nEmployer notified]
    J -->|Score 40 or less| L[status = QUARANTINED\nEmployer sees flag reason\nAdmin queue entry created]
```

---

## 5. 📄 Resume Upload Flow

```mermaid
flowchart TD
    A([Candidate clicks\nUpload Resume]) --> B[Select File\nPDF or DOCX]

    B --> C{Client-side\nValidation}
    C -->|Wrong format| D[Error: Unsupported file format\nPlease upload PDF or DOCX]
    C -->|File too large| E[Error: File exceeds 5MB limit]
    C -->|Valid| F[POST /api/candidates/me/resume\nMultipart form-data]

    D --> B
    E --> B

    F --> G[Node.js Multer\nReceives file in memory buffer]
    G --> H{Server-side\nMIME Validation}
    H -->|Invalid MIME| I[400 Error: Invalid file type]
    H -->|Valid| J[Stream to AWS S3\nresumes/candidateId/timestamp.pdf]

    J --> K[S3 upload success\nS3 key stored]
    K --> L[Update PostgreSQL:\ncandidate_profiles.resume_url = S3 key]
    L --> M[Confirm to candidate:\nYour profile resume has been updated]

    M --> N[Dispatch to BullMQ\nresume-analysis-queue]
    N --> O[Candidate sees:\nAnalyzing your resume...]

    O --> P[BullMQ Worker\ncalls Python service]
    P --> Q[POST /ai/resume/analyze\nsend s3Key + candidateId + targetRole?]

    Q --> R[Python downloads\nresume from S3 via presigned URL]
    R --> S{File Type?}
    S -->|PDF| T[PyMuPDF\nExtract raw text]
    S -->|DOCX| U[python-docx\nExtract raw text]

    T --> V[NLP Pipeline:\nIdentify sections via regex\nContact · Experience · Education\nSkills · Projects · Certs]
    U --> V

    V --> W[Score each section\nApply weights per PRD]
    W --> X[Detect integrity flags:\nOverlapping dates\nGaps over 12 months\nInconsistent formatting]
    X --> Y{Target role\nprovided?}
    Y -->|Yes| Z[Keyword gap analysis:\nCompare skills vs role requirements\nGenerate missing_keywords list]
    Y -->|No| AA[Skip keyword\ngap analysis]

    Z --> AB[LLM generates\nprioritized improvement suggestions]
    AA --> AB

    AB --> AC[Store in MongoDB\nresume_analyses collection\nMax 3 per candidate - delete oldest]

    AC --> AD[Redis pub/sub:\nresume:analyzed:candidateId]
    AD --> AE[Node.js notified\nResult available]
    AE --> AF[Candidate dashboard\nupdated with report]
    AF --> AG([Candidate views\nResume Analysis Report])
```

---

## 6. 🤖 ATS Analysis Flow

```mermaid
sequenceDiagram
    actor Candidate
    participant Frontend as Next.js Frontend
    participant Node as Node.js Backend
    participant S3 as AWS S3
    participant Queue as BullMQ Queue
    participant Python as Python AI Service
    participant LLM as Gemini API
    participant MongoDB as MongoDB

    Candidate->>Frontend: Upload Resume (PDF/DOCX)
    Frontend->>Frontend: Client-side validation (format, size)

    Frontend->>Node: POST /api/candidates/me/resume
    Note over Node: Multer buffers file in memory

    Node->>Node: Server-side MIME type check
    Node->>S3: Stream upload to private bucket
    S3-->>Node: Upload success + S3 key

    Node->>Node: Update candidate_profiles.resume_url in PostgreSQL
    Node-->>Frontend: 200 OK - "Your profile resume has been updated"
    Frontend-->>Candidate: Resume uploaded confirmation banner

    Node->>Queue: Dispatch resume-analysis job {s3Key, candidateId, targetRole?}
    Frontend-->>Candidate: "Analyzing your resume..." loading state

    Queue->>Python: Worker picks up job
    Python->>S3: GET pre-signed URL (TTL 5 min)
    S3-->>Python: Pre-signed download URL
    Python->>S3: Download file bytes

    alt PDF
        Python->>Python: PyMuPDF — extract raw text + layout
    else DOCX
        Python->>Python: python-docx — extract structured text
    end

    Python->>Python: Section parser (regex + NLP)
    Note over Python: Extract: Contact, Experience, Education, Skills, Projects, Certs

    Python->>Python: Score each section (weighted)
    Note over Python: Contact 10%, Experience 30%, Skills 25%, Education 15%, ATS 20%

    Python->>Python: Integrity flag detection
    Note over Python: Overlapping dates, 12+ month gaps, inconsistent formatting

    opt Target role provided
        Python->>Python: Keyword gap analysis vs role benchmark
    end

    Python->>LLM: Prompt with resume data + context
    Note over LLM: "Generate 5 prioritized improvement suggestions for this resume"
    LLM-->>Python: Suggestions list (JSON)

    Python->>MongoDB: Insert into resume_analyses
    Note over MongoDB: Delete oldest if candidate has 3 existing reports

    Python-->>Node: Analysis complete {analysisId, scores, suggestions}
    Node->>Node: Redis pub/sub notify resume:analyzed:{candidateId}

    Node-->>Frontend: Server-Sent Event or polling response
    Frontend-->>Candidate: Dashboard updates with full ATS Report

    Note over Candidate,MongoDB: Total end-to-end time target: ≤ 60 seconds
```

### ATS Score Breakdown (Visual)

```mermaid
flowchart LR
    R[Resume Text\nExtracted] --> S1[Contact Info\n10% weight]
    R --> S2[Work Experience\n30% weight]
    R --> S3[Skills Relevance\n25% weight]
    R --> S4[Education & Certs\n15% weight]
    R --> S5[ATS Formatting\n20% weight]

    S1 --> TOTAL[Overall Score\n0–100]
    S2 --> TOTAL
    S3 --> TOTAL
    S4 --> TOTAL
    S5 --> TOTAL

    TOTAL --> ATS[ATS Compatibility\nSub-score]
    TOTAL --> STRENGTH[Strengths List]
    TOTAL --> WEAK[Weaknesses List]
    TOTAL --> SUGGEST[Improvement\nSuggestions]
    TOTAL --> FLAGS[Integrity Flags]
```

---

## 7. 🔍 Fraud Score (Trust Score) Flow

### 7.1 Overview Flow

```mermaid
flowchart TD
    A([Employer submits\nJob Listing]) --> B[POST /api/jobs\nNode.js receives request]

    B --> C{Zod Schema\nValidation}
    C -->|Invalid| D[400 Error\nReturn validation errors]
    C -->|Valid| E[Insert into job_listings\nstatus = PROCESSING]

    E --> F[BullMQ:\nDispatch to trust-score-queue]
    F --> G[Employer sees:\nYour listing is under review]

    G --> H[BullMQ Worker\nPicks up job]
    H --> I[POST /ai/trust-score\nPython AI Service]

    I --> J[Signal Detection Pipeline]

    J --> J1{Check 1:\nDescription\nword count}
    J --> J2{Check 2:\nSalary vs\nbenchmark}
    J --> J3{Check 3:\nWeb presence\nHTTP ping}
    J --> J4{Check 4:\nDomain vs\ncompany name}
    J --> J5{Check 5:\nMass posting\nlast 24 hours}
    J --> J6{Check 6:\nCompany\nverified?}

    J1 -->|less than 100 words| P1[Penalty: minus 20]
    J1 -->|100+ words| N1[No penalty]
    J2 -->|greater than 3x median| P2[Penalty: minus 20]
    J2 -->|Normal range| N2[No penalty]
    J3 -->|No web presence| P3[Penalty: minus 25]
    J3 -->|Site reachable| N3[No penalty]
    J4 -->|Domain mismatch| P4[Penalty: minus 15]
    J4 -->|Domain matches| N4[No penalty]
    J5 -->|More than 10 listings/24h| P5[Penalty: minus 10]
    J5 -->|Normal volume| N5[No penalty]
    J6 -->|Company verified| B1[Bonus: plus 10]
    J6 -->|Unverified| B0[No bonus]

    P1 & P2 & P3 & P4 & P5 & N1 & N2 & N3 & N4 & N5 & B1 & B0 --> CALC[Calculate Final Score\nBase 90 minus penalties plus bonuses\nMin = 0, Max = 100]

    CALC --> SCORE{Trust Score\nResult}

    SCORE -->|Score 71-100| HIGH[HIGH TRUST\nstatus = ACTIVE\nGreen badge on listing]
    SCORE -->|Score 41-70| MED[MEDIUM TRUST\nstatus = ACTIVE\nYellow badge on listing]
    SCORE -->|Score 0-40| LOW[LOW TRUST\nstatus = QUARANTINED\nAdmin review required]

    HIGH --> NOTIFY_OK[Notify employer:\nListing is live]
    MED --> NOTIFY_OK
    LOW --> NOTIFY_WARN[Notify employer:\nTop 3 flags shown\nFix and resubmit option]
    LOW --> ADMIN_Q[Entry in\nAdmin Quarantine Queue]
```

---

### 7.2 Trust Score — Detailed Sequence Diagram

```mermaid
sequenceDiagram
    actor Employer
    participant Frontend as Next.js Frontend
    participant Node as Node.js Backend
    participant DB as PostgreSQL
    participant Queue as BullMQ
    participant Python as Python AI Service
    participant DNS as DNS Resolver
    participant Web as Company Website
    participant Admin as Admin Dashboard

    Employer->>Frontend: Fill and submit job listing form
    Frontend->>Frontend: Client-side Zod validation

    Frontend->>Node: POST /api/jobs {title, description, salary, ...}
    Node->>Node: Server-side Zod validation
    Node->>DB: INSERT job_listings (status=PROCESSING, trust_score=NULL)
    DB-->>Node: Job ID returned

    Node->>Queue: Enqueue trust-score job {jobId, title, description, salary, domain, employerId}
    Node-->>Frontend: 202 Accepted {jobId, status: "processing"}
    Frontend-->>Employer: "Your listing is under review"

    Queue->>Python: Worker picks up job
    Note over Python: Signal detection starts

    Python->>Python: Check 1 — Word count (NLTK tokenizer)
    Note over Python: penalty -20 if description < 100 words

    Python->>Python: Check 2 — Salary vs benchmark (salary_benchmarks.json)
    Note over Python: penalty -20 if salary > 3x category median

    Python->>Web: HTTP HEAD request (timeout: 5 sec)
    alt Website reachable (HTTP 200)
        Web-->>Python: 200 OK
    else Timeout or unreachable
        Python->>Python: Record "Unable to Verify" for web check
        Note over Python: penalty -25 applied
    end

    Python->>DNS: DNS lookup on company domain
    alt Domain resolves
        DNS-->>Python: IP address found
        Python->>Python: Check domain vs company name match
        Note over Python: penalty -15 if domain mismatch
    else No DNS record
        Python->>Python: penalty -25 (no web presence)
    end

    Python->>DB: Count listings by employer in last 24h
    DB-->>Python: Count returned
    Note over Python: penalty -10 if count > 10

    Python->>DB: Check employer verified status
    DB-->>Python: verified = true/false
    Note over Python: bonus +10 if verified

    Python->>Python: Compute final score
    Note over Python: Base(90) - Σ(penalties) + bonus. Clamp 0-100.

    Python->>DB: UPDATE job_listings SET trust_score=X, trust_flags=[...], status=?
    Note over DB: status=ACTIVE if score>40, QUARANTINED if score≤40

    Python-->>Node: {jobId, score, flags, status}
    Note over Node: Redis pub/sub: job:scored:{jobId}

    alt Score > 40
        Node-->>Frontend: Listing is now live
        Frontend-->>Employer: "Your job listing is live! Trust Score: X"
    else Score ≤ 40
        Node-->>Frontend: Listing flagged
        Frontend-->>Employer: "Flagged for: [top 3 reasons]. Please review and resubmit."
        Node->>Admin: Entry added to Quarantine Queue
        Admin->>Admin: Reviews listing + flags
    end

    Note over Employer,Admin: Total pipeline time target: ≤ 60 seconds
```

---

### 7.3 Trust Score Calculation — State Diagram

```mermaid
stateDiagram-v2
    [*] --> PROCESSING : Employer submits listing

    PROCESSING --> ACTIVE : Trust Score 41-100
    PROCESSING --> QUARANTINED : Trust Score 0-40
    PROCESSING --> DRAFT : Employer saves as draft

    DRAFT --> PROCESSING : Employer submits

    QUARANTINED --> ACTIVE : Admin Approves
    QUARANTINED --> REMOVED : Admin Removes
    QUARANTINED --> DRAFT : Admin Requests Resubmission

    ACTIVE --> CLOSED : Employer closes listing
    ACTIVE --> QUARANTINED : Re-evaluation triggers re-score (score drops)

    CLOSED --> [*]
    REMOVED --> [*]
```

---

## 8. 🤝 Candidate Matching Flow

```mermaid
sequenceDiagram
    actor Candidate
    participant Frontend as Next.js Frontend
    participant Node as Node.js Backend
    participant Redis as Redis Cache
    participant Queue as BullMQ
    participant Python as Python AI Service
    participant DB as PostgreSQL + pgvector

    Candidate->>Frontend: Open Job Board (logged in)
    Frontend->>Node: GET /api/jobs?page=1 (with JWT)
    Node->>DB: Fetch active listings (paginated)
    DB-->>Node: 20 job listings

    loop For each listing (batch)
        Node->>Redis: GET match:{candidateId}:{jobId}
        alt Cache hit
            Redis-->>Node: Cached match score
        else Cache miss
            Node->>Queue: Enqueue match-score job {candidateId, jobId}
        end
    end

    Queue->>Python: Worker picks up match jobs
    Python->>DB: Fetch candidate embedding (pgvector)
    Python->>DB: Fetch job embedding (pgvector)

    Python->>Python: Cosine similarity (SBERT embeddings)
    Python->>Python: Weighted score calculation
    Note over Python: Skills 40% + Experience 25% + Title 15% + Location 10% + Type 10%

    Python->>Redis: SET match:{candidateId}:{jobId} (TTL 1h)
    Python-->>Node: {jobId, score, breakdown}

    Node-->>Frontend: Job listings with Match Scores
    Frontend-->>Candidate: Job board with % Match badge on each card

    Candidate->>Frontend: Hover on Match Score badge
    Frontend-->>Candidate: Tooltip: breakdown of score factors

    Candidate->>Frontend: Click Recommended Jobs
    Frontend->>Node: GET /api/candidates/me/matches
    Node->>Redis: GET recommended:{candidateId}
    alt Cache hit (TTL 30min)
        Redis-->>Node: Top 10 jobs
    else Cache miss
        Node->>Python: Compute top-10 ANN search
        Python->>DB: pgvector ANN search — find closest job embeddings to candidate
        DB-->>Python: Top 10 job IDs by cosine similarity
        Python-->>Node: Ranked job list
        Node->>Redis: SET recommended:{candidateId} (TTL 30min)
    end
    Node-->>Frontend: Recommended jobs feed
    Frontend-->>Candidate: Personalized job recommendations
```

---

## 9. ✅ Company Verification Flow

```mermaid
flowchart TD
    A([Employer completes\ncompany profile]) --> B[Click: Get Verified]
    B --> C[Fill verification form:\nRegistration Number\nWebsite URL · LinkedIn URL]
    C --> D[Upload document:\nBusiness Registration Certificate\nPDF max 10MB]

    D --> E{Client-side\nvalidation}
    E -->|PDF too large| F[Error: File exceeds 10MB]
    E -->|Valid| G[POST /api/companies/me/verify\nMultipart + JSON data]

    F --> D

    G --> H[Upload doc to S3\nverifications/employerId/timestamp.pdf]
    H --> I[Insert company_verifications\nstatus = PENDING]
    I --> J[Start automated checks\nwithin 30 sec]

    J --> K[Check 1:\nDNS lookup on domain]
    J --> L[Check 2:\nHTTP ping to website\ntimeout 5 sec]
    J --> M[Check 3:\nLinkedIn URL\nformat validation]
    J --> N[Check 4:\nHTTP GET homepage\ncheck body length greater than 500 chars]

    K --> O[Record result:\npass / fail / timeout]
    L --> O
    M --> O
    N --> O

    O --> P[Update verification_checks JSONB\nAll results stored]
    P --> Q[Status remains PENDING\nEnters admin review queue]
    Q --> R[Employer sees:\nVerification Pending Review]

    R --> S[Admin opens\nVerification Queue]
    S --> T[Admin reviews:\nDocument + automated check results]
    T --> U{Admin\nDecision}

    U -->|Approve| V[status = VERIFIED\nverified_at = NOW\nadmin_id = adminId]
    U -->|Reject| W[status = REJECTED\nadmin_notes = reason]
    U -->|Request More Docs| X[Notify employer\nRequest specific document]

    V --> Y[employer_profiles.verified = true\nAll listings show Verified Badge]
    Y --> Z[Send approval email\nto employer via SendGrid]

    W --> AA[Send rejection email\nWith reason + instructions]
    AA --> AB[Employer can resubmit\nAfter corrections]
    AB --> C

    X --> AB
```

---

## 10. 🤖 AI Career Assistant Flow

```mermaid
flowchart TD
    A([User opens\nAI Chat Widget]) --> B[POST /api/assistant/chat\nwith message + sessionId]

    B --> C[Node.js: Check daily\nLLM quota in Redis\nllm_count:userId:date]
    C --> D{Daily limit\nreached?}
    D -->|Yes - 20 queries hit| E[Return 429:\nDaily limit reached\nCome back tomorrow]
    D -->|No| F[Increment Redis counter\nForward to Python]

    F --> G[POST /ai/chat\nPython AI Service]
    G --> H[Inject user context:\nProfile + Resume Score\nRecent Applications]
    H --> I[Intent Classifier\nKeyword + zero-shot NLP]

    I --> J{Intent\nDetected?}

    J -->|RESUME_REVIEW\nconfidence 75%+| K[Template Response\nUsing actual resume score + weaknesses]
    J -->|INTERVIEW_PREP\nconfidence 75%+| L[Template Response\nRole-specific tips from knowledge base]
    J -->|CAREER_PATH\nconfidence 75%+| M[Template Response\nBased on current skills + experience]
    J -->|SKILL_GAP\nconfidence 75%+| N[Template Response\nMissing keywords from latest analysis]
    J -->|JD_OPTIMIZE\nEmployer only| O[Template Response\nJob description improvement tips]
    J -->|No match\nor low confidence| P[LLM Fallback:\nGemini / GPT-4o]

    K --> Q[Append user context\nto template]
    L --> Q
    M --> Q
    N --> Q
    O --> Q
    P --> R{LLM Call\nSuccessful?}
    R -->|Yes| S[LLM Response]
    R -->|Timeout / Error| T[Fallback message:\nI am having trouble right now\nPlease try again]

    S --> Q
    Q --> U[Append Disclaimer:\nThis is AI-generated advice\nPlease verify with a professional]

    U --> V[Store message in MongoDB\nchat_sessions collection]
    V --> W[Return response\nto Node.js]
    W --> X[Node.js returns\nto Frontend]
    X --> Y([User sees AI\nresponse in chat])

    I --> Z{Out-of-scope\nquestion?}
    Z -->|Yes| AA[Return graceful redirect:\nI specialize in recruitment guidance\nCan I help you with that?]
    AA --> Y
```

---

## 11. 🔐 Authentication Flow

```mermaid
flowchart TD
    A([User visits\nTrustHire AI]) --> B{New or\nReturning?}

    B -->|New User| C[Click: Register]
    B -->|Returning| D[Click: Login]

    C --> E{Choose\nAuth Method}
    E -->|Email| F[Enter email + password\nSelect role]
    E -->|Google| G[Google OAuth 2.0\nConsent screen]

    F --> H{Password\nStrength Check}
    H -->|Weak| I[Error: 8+ chars\n1 uppercase · 1 number\n1 special character]
    H -->|Strong| J[POST /api/auth/register]
    I --> F

    G --> K[Google returns OAuth token]
    K --> L[POST /api/auth/google/callback]
    L --> M{User exists?}
    M -->|No| N[Create user\nemail_verified = true\nGo to role selection]
    M -->|Yes| O[Issue JWT tokens]

    J --> P[Create user in DB\nbcrypt hash password\nSend verification email]
    P --> Q[Redirect to:\nCheck your email]
    Q --> R[User clicks\nemail link]
    R --> S[POST /api/auth/verify-email\nValidate token from Redis]
    S --> T{Token\nValid?}
    T -->|Expired| U[Error: Link expired\nRequest new verification email]
    T -->|Valid| V[email_verified = true\nRedirect to onboarding]

    N --> V
    V --> O

    D --> W[Enter email + password]
    W --> X{Account\nLocked?}
    X -->|Yes - Redis lock| Y[Error: Account locked\nTry again in 15 minutes]
    X -->|No| Z[POST /api/auth/login]

    Z --> AA{Credentials\nCorrect?}
    AA -->|No| AB[Increment fail counter\nin Redis]
    AB --> AC{5+ failures?}
    AC -->|Yes| AD[Set login_locked:email\n15 min TTL]
    AC -->|No| AE[Error: Invalid credentials]
    AE --> W
    AD --> Y

    AA -->|Yes| O
    O --> AF[Issue: Access Token JWT RS256\n15 min TTL]
    AF --> AG[Issue: Refresh Token\nStored in Redis - 7 days TTL]
    AG --> AH[Return tokens\nto frontend]
    AH --> AI([User lands on\ntheir Dashboard])

    AI --> AJ{Token\nExpires?}
    AJ -->|Access token 15 min| AK[POST /api/auth/refresh\nSilent refresh]
    AK --> AL{Refresh token\nstill valid?}
    AL -->|Yes| AM[New access token issued\nRefresh token rotated]
    AM --> AI
    AL -->|No - 7 days| AN[Redirect to login:\nSession expired]
    AN --> D
```

---

## 12. 📊 Application Status Flow

```mermaid
stateDiagram-v2
    direction LR

    [*] --> APPLIED : Candidate applies\nvia job board

    APPLIED --> SHORTLISTED : Employer shortlists
    APPLIED --> REJECTED : Employer rejects
    APPLIED --> WITHDRAWN : Candidate withdraws

    SHORTLISTED --> INTERVIEW_SCHEDULED : Employer schedules interview
    SHORTLISTED --> REJECTED : Employer rejects

    INTERVIEW_SCHEDULED --> HIRED : Employer hires
    INTERVIEW_SCHEDULED --> REJECTED : Employer rejects after interview

    HIRED --> [*] : Terminal state
    REJECTED --> [*] : Terminal state
    WITHDRAWN --> [*] : Terminal state

    note right of SHORTLISTED
        Candidate contact details
        (email, phone) revealed
        to employer at this point
    end note

    note right of APPLIED
        Candidate sees "Applied" badge
        on job listing (disabled Apply button)
    end note
```

### Email Notifications per Status Change

| Transition | Email Sent To | Subject |
|-----------|--------------|---------|
| Applied → Shortlisted | Candidate | "Great news! You've been shortlisted at [Company]" |
| Applied / Shortlisted → Rejected | Candidate | "Update on your application at [Company]" |
| Shortlisted → Interview Scheduled | Candidate | "Interview scheduled at [Company]" |
| Interview Scheduled → Hired | Candidate | "Congratulations! You've been hired at [Company]" |

---

## 13. 🔄 System Data Flow Summary

```mermaid
flowchart LR
    subgraph USER_ACTIONS["User Actions"]
        C1[Candidate\nRegister / Apply / Chat]
        E1[Employer\nPost Job / Verify]
        A1[Admin\nApprove / Reject]
    end

    subgraph NODE["Node.js Backend"]
        RT[Express Routers]
        MW[JWT + RBAC Middleware]
        VL[Zod Validation]
        QP[BullMQ Producer]
    end

    subgraph PYTHON["Python AI Service"]
        TS[Trust Score\nscikit-learn + rules]
        RA[Resume Analyzer\nPyMuPDF + NLP]
        CM[Candidate Matching\nSBERT + pgvector]
        CA[Career Assistant\nLangChain + Gemini]
        CV[Company Verify\nHTTP + DNS]
    end

    subgraph DATA["Data Layer"]
        PG[(PostgreSQL)]
        MG[(MongoDB)]
        RD[(Redis)]
        S3[(AWS S3)]
    end

    subgraph NOTIFY["Notifications"]
        SG[SendGrid\nEmails]
    end

    USER_ACTIONS --> NODE
    NODE --> DATA
    NODE --> QP
    QP -->|async jobs| PYTHON
    PYTHON --> DATA
    PYTHON --> NODE
    NODE --> NOTIFY
```

---

## 14. 📁 Related Documents

| Document | Purpose | Status |
|----------|---------|--------|
| [ProjectContext.md](./ProjectContext.md) | Master context, vision, tech stack | ✅ Active (v1.1.0) |
| [PRD.md](./PRD.md) | Product requirements | ✅ Active (v1.1.0) |
| [TRD.md](./TRD.md) | Technical requirements | ✅ Active (v1.0.0) |
| [Schema.md](./Schema.md) | Database schema, ER diagram | ✅ Active (v1.0.0) |
| `APISpec.md` | Full OpenAPI 3.0 specification | 🔲 Pending |
| `UIUXDesign.md` | Wireframes + design system | 🔲 Pending |
| `SecurityPolicy.md` | Auth, privacy, GDPR compliance | 🔲 Pending |

---

*© 2026 TrustHire AI. Confidential — Internal Use Only.*
*AppFlow Version 1.0.0 | Created: 2026-06-19 | Author: Product & Engineering Team*
*References: [ProjectContext.md](./ProjectContext.md) | [PRD.md](./PRD.md) | [TRD.md](./TRD.md) | [Schema.md](./Schema.md)*
