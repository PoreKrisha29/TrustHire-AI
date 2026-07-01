# TrustHire AI — Project Context Document

> **Version:** 1.1.0
> **Created:** 2026-06-19
> **Last Updated:** 2026-06-19 (Syllabus Alignment Update)
> **Status:** Active — Master Reference Document
> **Purpose:** This document is the single source of truth for all product, technical, and strategic decisions. All future documentation must reference and align with this file.
> **Syllabus Note:** Tech stack and AI/ML pipeline are aligned with semester syllabus covering Python/ML, Django, Node.js, Express, React, MongoDB, and MERN stack. *(Note: MongoDB document-storage concepts are adapted onto PostgreSQL JSONB columns for unified Neon serverless storage).*

---

## 🌟 Vision

To become the world's most trusted AI-powered recruitment ecosystem — where every job posting is genuine, every candidate is fairly evaluated, and every hire is a confident, data-backed decision.

We envision a future where the hiring process is free from fraud, bias, and inefficiency; where companies find the right talent fast, and candidates land roles that truly match their skills and aspirations.

---

## 🎯 Mission

TrustHire AI's mission is to restore trust and efficiency to the modern hiring process by deploying intelligent AI systems that detect fraud, validate authenticity, match talent precisely, and empower both candidates and employers with actionable insights — all within a single, unified platform.

---

## 🔴 Problem Statement

The global recruitment industry is broken in four critical ways:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **Fake Job Openings** | Thousands of ghost listings waste candidate time, collect personal data fraudulently, and erode platform trust. Estimates suggest 10–20% of job postings on major platforms are fake or misleading. |
| 2 | **Candidate-Job Mismatch** | Keyword-based filtering leads to poor matches. Employers are overwhelmed with irrelevant applications; qualified candidates are overlooked. |
| 3 | **Resume Screening Inefficiencies** | Recruiters spend 70–80% of their time manually screening resumes, creating bottlenecks that slow time-to-hire and introduce unconscious bias. |
| 4 | **Lack of Company Authenticity** | Candidates cannot reliably verify whether a company is legitimate, financially stable, or a good cultural fit before applying, leading to wasted effort and poor hires. |

**Root Cause:** Existing platforms (LinkedIn, Indeed, Naukri, etc.) are aggregators — they list jobs but do not intelligently validate, match, or guide. TrustHire AI acts as an intelligent layer that solves these problems at their source.

---

## 👥 Target Users

### Primary Users

#### 1. Job Seekers / Candidates
- **Segments:** Fresh graduates, mid-career professionals, career switchers, freelancers
- **Pain Points:** Wasting time on fake/irrelevant jobs, poor resume feedback, no clarity on company legitimacy
- **Goals:** Find relevant, genuine jobs faster; receive actionable career guidance

#### 2. Employers / Hiring Managers
- **Segments:** Startups, SMEs, large enterprises, staffing agencies
- **Pain Points:** Resume overload, poor applicant quality, slow screening cycles
- **Goals:** Hire qualified candidates faster, reduce cost-per-hire, improve match quality

#### 3. HR / Talent Acquisition Teams
- **Pain Points:** Manual screening inefficiencies, difficulty verifying candidate credentials
- **Goals:** Automate repetitive tasks, improve pipeline quality, get data-driven insights

### Secondary Users
- **Recruiters & Headhunters** — Using the platform as a sourcing and matching tool
- **Career Coaches** — Leveraging AI career assistant data for client guidance
- **Compliance & Legal Teams** — Using company verification data for due diligence

---

## ⚙️ Core Features

### 1. 🔍 AI Fake Job Detection System
- Analyzes job postings using NLP to flag suspicious patterns (vague descriptions, unrealistic salaries, non-existent companies)
- Cross-references company data against public registries, LinkedIn, and web presence
- Assigns a **Trust Score** (0–100) to every job listing before it goes live
- Auto-removes or quarantines listings below a configurable trust threshold
- Provides transparency to candidates: each listing shows its trust badge and reason

### 2. 🤝 AI Candidate Matching System
- Goes beyond keyword matching — uses semantic understanding of skills, experience, career trajectory, and role requirements
- Bi-directional matching: matches candidates to jobs AND jobs to candidates
- Incorporates soft skills, work style preferences, and cultural fit signals
- Provides a **Match Score** with a transparent breakdown for both parties
- Learns and improves from recruiter feedback and hiring outcomes

### 3. 📄 AI Resume Analyzer
- Parses and scores resumes against industry benchmarks and specific job requirements
- Provides detailed, actionable feedback: missing skills, weak phrasing, formatting issues, ATS compatibility
- Suggests real-time improvements and alternative phrasings
- Detects potential resume fraud (fabricated credentials, inflated dates)
- Supports multiple formats: PDF, DOCX, LinkedIn profile import

### 4. ✅ Company Verification System
- Multi-layer verification: business registration, GST/tax ID, domain ownership, social media presence, employee reviews
- Assigns companies a **Verified Badge** with tier levels (Basic, Standard, Premium)
- Displays a public-facing Company Trust Profile visible to all candidates
- Flags companies with suspicious patterns: sudden mass hiring, no web footprint, mismatched details
- Integration with MCA (India), Companies House (UK), SEC (US) and equivalent registries

### 5. 🤖 AI Career Assistant
- Conversational AI chatbot for candidates and employers
- For candidates: resume tips, interview prep, career path suggestions, skill gap analysis
- For employers: job description optimization, salary benchmarking, hiring best practices
- Powered by an LLM fine-tuned on recruitment domain data
- Context-aware: personalizes advice based on user's profile, industry, and goals

---

## 🚀 MVP Scope

The MVP focuses on delivering core trust and matching value with the minimum viable feature set to validate the product with real users.

### MVP Features (Phase 1 — Target: 3–4 months)

| Feature | MVP Scope |
|---------|-----------|
| **AI Fake Job Detection** | Rule-based + basic ML model; Trust Score on job listings; manual review queue |
| **AI Candidate Matching** | Semantic matching using pre-trained embeddings; Match Score display |
| **AI Resume Analyzer** | Upload & parse resume; structured feedback report; ATS score |
| **Company Verification** | Self-declaration + document upload; basic web/domain verification; Verified Badge (Basic tier) |
| **AI Career Assistant** | Chatbot with pre-defined intents + LLM fallback for open-ended queries |
| **Auth & Profiles** | Email/social login; separate candidate & employer onboarding flows |
| **Job Board** | Post, browse, search, and filter verified job listings |
| **Dashboard** | Candidate: applications, matches, resume score; Employer: listings, applicants, trust score |

### MVP Out-of-Scope
- Mobile apps (web-first)
- Payment gateway / subscription billing
- Advanced analytics and reporting
- API marketplace for third-party integrations
- Multi-language support

---

## 🔮 Non-MVP Features (Phase 2+)

| Feature | Description |
|---------|-------------|
| **Video Interview AI** | Automated AI-driven screening interviews with sentiment and skill analysis |
| **Blockchain Credential Verification** | Immutable, decentralized verification of educational and professional credentials |
| **Skills Assessment Engine** | In-platform coding, aptitude, and domain-knowledge tests |
| **Predictive Hiring Analytics** | Forecast time-to-hire, attrition risk, and culture fit using historical data |
| **Mobile Apps** | Native iOS and Android applications |
| **Enterprise API** | White-label API for ATS integrations (Workday, Greenhouse, Lever) |
| **Salary Intelligence** | Real-time market salary benchmarking by role, region, and experience |
| **Diversity & Inclusion Module** | Bias detection in job descriptions; anonymized screening mode |
| **Multi-language Support** | Localization for key markets (Hindi, Arabic, Spanish, etc.) |
| **Referral & Network Graph** | Trusted referral system using candidate professional networks |

---

## 🛠️ Tech Stack

### Frontend
| Layer | Technology | Rationale |
|-------|-----------|----------|
| Core Library | **React 18** (Fundamentals + Hooks) | Component model, state, side-effects — *Syllabus: React Fundamentals & React Hooks* |
| Framework | **Next.js 14** (App Router) | SSR, SEO, routing built on top of React |
| API Integration | **React Hooks** (`useState`, `useEffect`, `useFetch`) | Handles REST API calls from frontend — *Syllabus: React Hooks & API Integration* |
| Data Format | **JSON** (JavaScript Object Notation) | Universal data exchange format between frontend & backend — *Syllabus: JSON* |
| Styling | **Tailwind CSS** + **shadcn/ui** | Rapid, consistent UI development |
| State Management | **Zustand** | Lightweight global state management |
| Forms | **React Hook Form** + **Zod** | Validation and type safety |
| Charts | **Recharts** | Dashboard analytics and data visualization |

### Backend — JavaScript / Node.js Layer
| Layer | Technology | Rationale |
|-------|-----------|----------|
| Runtime | **Node.js** + Core Modules (`fs`, `http`, `path`, `events`) | Server-side JS runtime — *Syllabus: Node.js Intro & Core Modules* |
| Server | **Node.js HTTP Module** → **Express.js** | Manual server creation → framework abstraction — *Syllabus: Node.js Modules & Server Creation* |
| Framework | **Express.js** (Fundamentals + Advanced) | Routing, middleware, error handling — *Syllabus: Express JS Fundamentals & Advanced* |
| State & Sessions | **Express Sessions** + **JWT** | State management across requests — *Syllabus: Express State Management & API* |
| REST APIs | **Express.js REST API** | CRUD endpoints, route handlers, status codes — *Syllabus: REST APIs & Backend Services* |
| API Format | **JSON** | Request/response data interchange — *Syllabus: JSON* |
| Auth | **NextAuth.js** / **Firebase Auth** | OAuth, JWT, session management |
| Job Queue | **BullMQ** (Redis-backed) | Async AI processing tasks |

### Backend — Python / Django Layer (AI Microservice)
| Layer | Technology | Rationale |
|-------|-----------|----------|
| Web Framework | **Django** (Backend-First Development) | Rapid backend scaffolding for ML API — *Syllabus: Django Framework* |
| ORM & Users | **Django Models** + **Django Auth** | Database schema, user management — *Syllabus: Django Models and Users* |
| REST API Layer | **Django REST Framework (DRF)** | Exposes ML model endpoints as REST services — *Syllabus: REST APIs & Backend Services* |
| ML Serving | **FastAPI** (Python microservice) | High-performance serving for real-time ML inference |

### AI / ML Pipeline
| Component | Technology | Rationale |
|-----------|-----------|----------|
| **Data Analysis & EDA** | **Pandas** + **NumPy** | Data ingestion, cleaning, exploratory analysis — *Syllabus: Data Analysis with Pandas & EDA* |
| **Data Visualization** | **Matplotlib** + **Seaborn** | Visual EDA: distribution plots, heatmaps, correlation matrices — *Syllabus: Data Visualization with Python* |
| **ML Introduction** | **scikit-learn** (pipelines, preprocessing) | Core ML library, feature engineering, model selection — *Syllabus: Introduction to ML with Python* |
| **Regression Models** | **Linear Regression**, **Ridge**, **SVR** (scikit-learn) | Salary prediction, match score estimation — *Syllabus: Regression – Model Training & Evaluation* |
| **Classification Models** | **Logistic Regression**, **Random Forest**, **SVM**, **XGBoost** | Fake job detection, resume authenticity classification — *Syllabus: Classification – Model Training & Evaluation* |
| **Deep Learning** | **TensorFlow** / **Keras** | Neural networks for semantic matching, NLP embeddings — *Syllabus: Introduction to Deep Learning* |
| **Web Scraping & Data Ingestion** | **BeautifulSoup** + **Scrapy** + **requests** | Scrape company web presence, public registries, job boards for verification — *Syllabus: Web Scraping, APIs & Data Ingestion* |
| **Embeddings** | **sentence-transformers** (SBERT) | Semantic candidate-job matching |
| **Resume Parsing** | **PyMuPDF** + custom NLP pipeline | Accurate extraction from PDFs/DOCX |
| **LLM Backbone** | **Google Gemini API** / **OpenAI GPT-4o** | State-of-the-art NLP for career assistant |
| **Career Assistant** | **LangChain** + **RAG pipeline** | Context-aware, grounded conversational AI |
| **ML Serving** | **FastAPI** + **Django REST Framework** | Expose trained models as REST endpoints |

### Database & Storage
| Layer | Technology | Rationale |
|-------|-----------|----------|
| Sole Database | **Neon Serverless PostgreSQL** | Consolidated cloud-native relational database; stores structured tables, vector embeddings, and nested JSON documents |
| Vector DB | **pgvector** (Neon Native) | Semantic search and SBERT matching embeddings storage |
| Document Storage | **PostgreSQL JSONB** | Relational JSON columns for resume analysis reports and chat histories (replacing MongoDB) |
| SQL Client/ORM | **Prisma** / **Django ORM** | Schema migrations and backend database queries |
| Cache | **Redis** | Session management, job queue, rate limiting, and match score caching |
| File Storage | **AWS S3** / **Supabase Storage** | Resume and document storage |
| Search | **PostgreSQL Full-Text Search** | Built-in indexing for text search on job listings and candidates (replacing Elasticsearch) |

### Infrastructure & DevOps
| Layer | Technology |
|-------|-----------|
| Hosting | **Vercel** (frontend) + **Railway** / **AWS EC2** (backend) |
| CI/CD | **GitHub Actions** |
| Monitoring | **Sentry** (errors) + **PostHog** (analytics) |
| Containerization | **Docker** + **Docker Compose** |
| DNS & CDN | **Cloudflare** |

---

## ⚠️ Constraints

### Technical Constraints
- **AI Accuracy:** Early ML models may have false positives/negatives in fake job detection — requires a human-in-the-loop review mechanism
- **Data Cold Start:** Matching algorithms need sufficient user data to improve; MVP will rely more on rule-based and pre-trained models
- **LLM Cost:** High-volume LLM API calls are expensive; requires aggressive caching, rate limiting, and prompt optimization
- **Resume Parsing Accuracy:** Varied resume formats reduce parsing accuracy — must handle gracefully with fallback flows

### Business Constraints
- **Regulatory Compliance:** Must comply with GDPR (EU), IT Act (India), and local data privacy laws for storing PII
- **Company Verification Limitations:** Not all countries have open business registries; verification depth will vary by region
- **Bootstrap Budget:** Initial development must prioritize free/low-cost tiers of third-party services
- **Team Size:** Small founding team — features must be scoped for lean execution

### Market Constraints
- **Trust Building:** Competing against established platforms (LinkedIn, Indeed) requires demonstrable trust differentiation
- **Employer Adoption:** Employers must see clear ROI to switch from existing tools
- **Network Effect Dependency:** Platform value increases with user volume — chicken-and-egg challenge at launch

---

## 📊 Success Metrics

### Product Metrics (MVP KPIs)
| Metric | Target (6 months post-launch) |
|--------|-------------------------------|
| Registered Users (Candidates) | 5,000+ |
| Verified Companies | 200+ |
| Job Listings with Trust Score | 100% coverage |
| Fake Job Detection Rate | ≥ 90% precision |
| Candidate-Job Match Acceptance Rate | ≥ 40% |
| Resume Analysis Reports Generated | 3,000+ |
| AI Career Assistant Sessions | 2,000+ monthly |

### Business Metrics
| Metric | Target |
|--------|--------|
| Monthly Active Users (MAU) | 2,000+ at Month 6 |
| User Retention (30-day) | ≥ 35% |
| Time-to-First-Match (candidate) | < 48 hours |
| Employer Cost-per-Hire Reduction | 30% vs. traditional methods |
| NPS Score | ≥ 50 |

### Trust Metrics
| Metric | Target |
|--------|--------|
| % of listings with Verified Company badge | ≥ 60% at Month 6 |
| User-reported fake jobs post-publication | < 1% |
| Candidate satisfaction with match quality | ≥ 4.2 / 5 |

---

## 📚 Syllabus Alignment & Learning Map

This section maps every topic from the semester syllabus to its direct application in the TrustHire AI project. All syllabus topics are implemented as part of the project.

### Subject 1: Python, Machine Learning & Django Backend

| Unit | Syllabus Topic | TrustHire AI Application | Feature |
|------|---------------|--------------------------|--------|
| 1 | **Data Analysis with Pandas & EDA** | Analyzing job posting datasets, candidate profile data, salary trends | AI Fake Job Detection + Matching |
| 2 | **Data Visualization with Python** | EDA charts: job category distribution, fraud patterns, match score histograms | All AI Features (research & monitoring) |
| 3 | **Introduction to ML with Python** | scikit-learn pipelines: feature extraction, model selection, train-test split | All AI Models |
| 4 | **Regression – Model Training & Evaluation** | Predicting match scores, estimated salary ranges, trust score values | AI Candidate Matching + Job Trust Score |
| 5 | **Classification – Model Training & Evaluation** | Binary classifier: real vs. fake job; resume authentic vs. fraudulent | AI Fake Job Detection + Resume Analyzer |
| 6 | **Introduction to Deep Learning** | Neural network embeddings for semantic job-candidate matching; NLP text classification | AI Matching + Career Assistant |
| 7 | **Web Scraping, APIs & Data Ingestion** | Scraping company registries, LinkedIn presence, job boards for verification data | Company Verification System |
| 8 | **Django Framework (Backend-First)** | Django powers the Python ML microservice API layer | AI Microservice Backend |
| 9 | **Django Models and Users** | Django ORM models for ML job queue, user authentication in Python service | AI Microservice Backend |
| 10 | **REST APIs & Backend Services** | Django REST Framework exposes all ML model endpoints consumed by Node.js backend | All AI Features |

### Subject 2: JavaScript, Node.js, React & MERN Stack

| Unit | Syllabus Topic | TrustHire AI Application | Feature |
|------|---------------|--------------------------|--------|
| 1 | **JSON (JavaScript Object Notation)** | All API request/response payloads; config files; data exchange format | Entire Platform |
| 2 | **Node.js – Intro & Core Modules** | Platform server runtime; `fs` for file handling, `http` for server, `events` for async | Core Backend |
| 3 | **Node.js Modules & Server Creation** | Custom middleware modules; HTTP server scaffolding before Express | Core Backend |
| 4 | **Express JS Fundamentals** | Routing for `/jobs`, `/candidates`, `/companies`, `/auth` endpoints | Job Board + Auth |
| 5 | **Express State Management & API** | Session handling, JWT middleware, API versioning | Auth & Profiles |
| 6 | **Express – Advanced Concepts** | Rate limiting, error handling middleware, file upload with Multer | Resume Analyzer + API Security |
| 7 | **React Fundamentals & Core Concepts** | Candidate dashboard, job board UI, company profiles built with React components | Frontend — All Pages |
| 8 | **React Hooks & API Integration** | `useEffect` for fetching job matches; `useState` for form handling; custom hooks for AI polling | Frontend — All Features |
| 9 | **MongoDB – Queries & Operators** | Storing resume data, AI analysis reports, and session logs in PostgreSQL `JSONB` using SQL JSON operators to fulfill MongoDB query logic | Resume Analyzer + Analytics |
| 10 | **Mongoose & MERN Integration** | Schema modeling and full-stack integration adapted to Neon Postgres `JSONB` (mapping MERN syllabus items to unified SQL) | Core Platform |

> ✅ **Coverage Status: 100% — All 20 syllabus units are implemented in TrustHire AI**

---

## 🗓️ Roadmap Overview

```
Phase 1 — MVP (Months 1–4)
  ├── Core platform scaffolding
  ├── AI Fake Job Detection (v1)
  ├── Resume Analyzer (v1)
  ├── Company Verification (Basic)
  ├── Candidate Matching (v1)
  └── AI Career Assistant (v1)


```

---

## 📁 Document Hierarchy

This document is the **root** of all TrustHire AI documentation. All other documents must reference `ProjectContext.md`.

```
ProjectContext.md               ← YOU ARE HERE (Master Reference)
├── PRD.md                      ← Product Requirements Document
├── TechArchitecture.md         ← System Design & Architecture
├── AIModels.md                 ← AI/ML Model Specifications
├── APISpec.md                  ← API Endpoints & Contracts
├── UIUXDesign.md               ← Design System & Wireframes
├── DatabaseSchema.md           ← Data Models & ERD
├── SecurityPolicy.md           ← Auth, Privacy, Compliance
├── TestingStrategy.md          ← QA & Testing Plan
└── LaunchChecklist.md          ← Go-to-Market Plan
```

---

*© 2026 TrustHire AI. Confidential — Internal Use Only.*
*Last updated: 2026-06-19 | Maintained by: Founding Team*
