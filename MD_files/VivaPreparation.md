# TrustHire AI — Viva & Project Defense Preparation

This document compiles conceptual, architectural, and design questions with their detailed answers to help you prepare for your semester project viva/evaluation.

---

## 📂 Table of Contents
1. [Database Architecture: Why PostgreSQL and MongoDB?](#1-database-architecture-why-postgresql-and-mongodb)
2. [Architecture: Role of JavaScript/Node.js vs. Django Python](#2-architecture-role-of-javascriptnodejs-vs-django-python)

---

## 1. Database Architecture: Why Neon Serverless PostgreSQL as the Sole Database?

### ❓ Question
**Why are we using Neon Serverless PostgreSQL as the sole database in TrustHire AI instead of a polyglot persistence architecture (PostgreSQL + MongoDB)?**

### 💡 Answer
We consolidated the database layer into a single, cloud-hosted **Neon Serverless PostgreSQL** database. This architecture provides a unified data platform that handles relational transactions, unstructured documents, and vector embeddings in a single database, avoiding the complexity of sync pipelines and multi-client connections.

#### 1. The Relational Core & Integrity (ACID compliance)
*   Core transactional data (users, jobs, applications, verification records) requires strict referential integrity.
*   For example, when a candidate applies to a job, PostgreSQL guarantees that both the candidate and job IDs are valid foreign keys, and blocks duplicates via a unique composite index. Cascade deletes (`ON DELETE CASCADE`) clean up dependent records, preventing orphaned data.

#### 2. Vector Search Capabilities (`pgvector`)
*   Our semantic candidate-job matching engine converts skills and descriptions into 384-dimensional SBERT embeddings.
*   Neon natively supports the `pgvector` extension, allowing us to perform high-speed cosine similarity searches and nearest-neighbor scans directly alongside traditional SQL filtering (e.g., matching jobs by distance/score while filtering for active, remote, or high-trust roles in one query).

#### 3. Unstructured AI Data Handling (PostgreSQL `JSONB`)
*   Instead of MongoDB, we use PostgreSQL's native `JSONB` data type to store semi-structured and hierarchical AI outputs:
    *   **Resume Analysis Reports:** Detailed ATS feedback, lists of strengths/weaknesses, and prioritization suggestions are stored as nested JSON within the database. This allows a single-fetch operation without complex `JOIN`s, matching MongoDB's read efficiency.
    *   **Conversational Chat Logs:** Conversational transcripts are stored as JSONB arrays of message objects. We index these fields for quick retrieval and clean old sessions via background SQL cleanup tasks.

#### 🗣️ Quick Viva Defense Summary
*   **Why not separate PostgreSQL and MongoDB?** While MongoDB is excellent for documents, maintaining two separate databases creates massive overhead. It requires managing two database clients (Prisma + Mongoose), double the hosting configurations, and complex manual referential integrity logic in the backend. PostgreSQL `JSONB` gives us the exact same document-like flexibility and quick read performance, while `pgvector` satisfies the AI embeddings search—all within a single Neon database.
*   **How does this cover MongoDB syllabus topics?** PostgreSQL's `JSONB` supports advanced JSON operators and indexing (GIN indexes) that map directly to MongoDB queries (like checking array containment or matching nested keys). We demonstrate understanding of NoSQL concepts by implementing document modeling techniques within a relational engine.

---

## 2. Architecture: Role of JavaScript/Node.js vs. Django Python

### ❓ Question
**What do all the JavaScript (.js / .jsx) files do in the project, and when and why will we use Python/Django in the project?**

### 💡 Answer
This project is built using a **hybrid/microservices architecture** that separates the web interface, business logic, and heavy AI tasks into the languages best suited for them: **JavaScript (Next.js/Node.js/Express)** and **Python (Django)**.

#### 1. The Role of the JavaScript (.js / .jsx) Files
JavaScript controls the **Frontend Web App** and the **Core Business Logic API** of the platform:

* **Frontend Layer (`/frontend` — Next.js 14 & React):**
  * **`.jsx` files (Components & Routes):** These are React files. They define the user interface elements (e.g., job boards, chat windows, dashboards) and use Next.js's App Router to move between pages.
  * **`api.js`:** The Axios client that communicates with the backend, handling automatic token refresh and JWT storage.
  * **`*.store.js`:** Zustand stores that handle global client state management (like tracking who is logged in and caching candidate profile statistics).
* **Backend Layer (`/backend` — Node.js & Express):**
  * **`routes/` & `controllers/`:** These files define the REST API routes and database handlers. They handle routing, user profiles CRUD, job creation, and job application state changes.
  * **`middleware/`:** Handles security, request rate limits, input validations (using Zod), and checking if a user is logged in as a candidate, employer, or admin.
  * **`config/`:** Manages connections to databases (Prisma for PostgreSQL, Mongoose for MongoDB, Redis client) and dispatches queue tasks (BullMQ).
  * **`index.js`:** The main server entry point that coordinates middleware, starts the Express server, and handles clean shutdowns.

#### 2. When and Why We Will Use Python/Django
Python/Django will act as a separate **AI Microservice** (running on port `8000` or in a container):

* **When will it be used?** 
  Whenever the Node.js backend receives a request that requires machine learning processing, it pushes a task payload into a **Redis job queue (BullMQ)**. The Python service consumes these tasks, computes the result, and writes them back to the database. Specifically, it handles:
  1. **Computing Trust Scores:** Validating job descriptions (word counts, salary benchmark regressions, and company DNS lookup checks) to detect fraudulent postings.
  2. **Analyzing Resumes:** Parsing PDF/DOCX resumes (PyMuPDF) and calling Large Language Models (Gemini API) to generate detailed reports.
  3. **Job-to-Candidate Matching:** Running SBERT text embedding models (`sentence-transformers/all-MiniLM-L6-v2`) to compute semantic matching scores.
  4. **AI Career Assistant Chatbot:** Running LangChain pipelines to classify user messages, fetch context, and stream replies.
* **Why use Django for this instead of Node.js?**
  * **Python's AI/ML Ecosystem:** The machine learning models we use (SBERT, sentence-transformers, scikit-learn, PyMuPDF) are written in Python. Running these libraries natively in Node.js via child processes is inefficient and slow.
  * **Computational Separation (CPU vs. I/O Bound):** Express is Single-Threaded and handles I/O operations (like database queries, network requests, and API serving) incredibly fast. AI calculations are **CPU-intensive**. Running heavy AI models inside Node.js would freeze the entire server for other users. Separating it into Django keeps the core server responsive.
