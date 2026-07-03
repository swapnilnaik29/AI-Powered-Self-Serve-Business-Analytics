# Self-Serve Analytics BI - Complete Architecture & Technical Walkthrough

## 1. PROJECT OVERVIEW
**What it is:** An AI-powered Self-Serve Business Intelligence (BI) platform that allows users to ask natural language questions and get back data, charts, and actionable insights.

**Business Problem:** Traditional BI tools (like Tableau or Looker) require SQL knowledge or complex dashboard configuration. Non-technical stakeholders (PMs, Execs) often have ad-hoc questions that require a data engineer to write a query, creating a bottleneck.

**Why it exists:** To democratize data access. It empowers anyone to "talk to their database" in plain English.

**Who the users are:** 
- *Analysts/Business Users:* Asking questions and exporting reports.
- *Admins:* Managing data governance, viewing global query history, and maintaining the business glossary.

**Value Proposition:** Instant answers. What used to take a Jira ticket and 2 days now takes 5 seconds.

**Differentiator:** It’s not just a wrapper generating SQL. It generates hypotheses, tests them against the data, provides a confidence score, synthesizes a human-readable answer, and dynamically generates Vega-Lite charts.

---

## 2. HIGH-LEVEL ARCHITECTURE
The system is a modern decoupled web application:
- **Frontend:** Angular 18+ SPA handling state, routing, and visualization (Vega-Lite).
- **Backend:** FastAPI (Python) serving a RESTful API.
- **Auth Layer:** JWT-based stateless authentication with Role-Based Access Control (RBAC).
- **AI Pipeline:** OpenAI GPT-4o-mini orchestrated by custom Python services for schema retrieval (RAG), intent parsing, and SQL generation.
- **Data Layer:** DuckDB (in-memory) executing analytical queries against cached DataFrames.
- **State/Logging:** Application SQLite DB (`analytics.db`) storing users, query history, the business glossary, and the data catalog.

**Subsystem Responsibilities:**
- *Frontend:* User intent capture, result rendering, and session management.
- *Backend Core:* Auth, request validation, routing, and database CRUD.
- *Pipeline:* The "brain" mapping English to SQL, executing it safely, and summarizing the result.

---

## 3. END-TO-END REQUEST FLOW
1. **App Load & Auth:** User navigates to the app. `authGuard` checks for a JWT. If none, redirects to Login.
2. **Dashboard Load:** User views the Dashboard UI.
3. **User Query:** User types "Show me revenue for last month" and hits enter.
4. **API Request:** Frontend `ApiService` sends a `POST /api/v1/queries` request.
5. **FastAPI Route:** `queries.py` router receives it, verifies the JWT, and extracts the `current_user`.
6. **Pipeline Init:** `PipelineService.run()` begins execution.
7. **Schema Retrieval (RAG):** `SchemaRetrievalService` uses FAISS (vector search) to find relevant tables/columns from the `DataCatalog` based on the query.
8. **Query Understanding:** `QueryUnderstandingService` asks the LLM to classify intent, complexity, and metrics.
9. **Governance/Glossary:** System fetches Business Glossary definitions (e.g., "Revenue = SUM(amount) WHERE status='SUCCESS'") and masks PII columns based on the user's role.
10. **NL2SQL:** `NL2SQLService` uses the context, schema, and glossary to generate DuckDB SQL.
11. **SQL Validation:** System checks for destructive keywords (DROP, DELETE) and ensures it's a safe SELECT query.
12. **Execution:** `SQLExecutionService` executes the SQL in DuckDB against cached Pandas DataFrames.
13. **Analysis & Synthesis:** `AnswerSynthesisService` checks for anomalies/outliers, computes insights (e.g., % change), and asks the LLM to write a human-friendly summary.
14. **Chart Generation:** `ChartService` decides if a line or bar chart is appropriate and generates a Vega-Lite JSON spec.
15. **Confidence Scoring:** `ConfidenceService` heuristics grade the result based on row count and query success.
16. **Logging:** The entire payload, including tokens used and latency, is saved to `query_logs` via the `QueryLogRepository`.
17. **Response:** Backend returns a `QueryResponse` JSON object.
18. **Render:** Angular binds the response to the `ResultPanel`, `ChartDisplay`, and `FollowupPanel`.

---

## 4. FRONTEND DEEP EXPLANATION
- **Angular Structure:** Uses the modern Standalone Components architecture (no NgModules).
- **Routing (`app.routes.ts`):** Protects routes using `authGuard` and `adminGuard`.
- **Auth Flow:** `AuthService` handles login, stores JWTs in `localStorage`, and `auth.interceptor.ts` automatically attaches the `Bearer` token to every outbound request.
- **Components:**
  - `DashboardComponent`: The smart container. Orchestrates the query flow.
  - `ResultPanelComponent`: Pure presentational component displaying the text answer and data table.
  - `ChartDisplayComponent`: Uses Vega-Embed to render the JSON chart spec dynamically.
  - `HistoryComponent`: Shows past queries. Admins see a "User" column.
- **State Flow:** Kept simple and maintainable via component inputs/outputs and injected singleton services (`ApiService`).

---

## 5. BACKEND DEEP EXPLANATION
- **FastAPI App (`main.py`):** Configures CORS, middleware (audit logging), global exception handlers, and mounts routers.
- **Routers (`/routers`):** API endpoints grouped by domain (auth, queries, catalog).
- **Services (`/services`):** The core business logic. Heavy lifting happens here. Keeps routers clean.
- **Repositories (`/repositories`):** Abstraction over SQLAlchemy. Keeps SQL/ORM logic out of services (e.g., `UserRepository`, `QueryLogRepository`).
- **Models (`/models`):** SQLAlchemy ORM entities mapping classes to DB tables.
- **Schemas (`/schemas`):** Pydantic models for request/response validation and strict typing.
- **Middleware:** `AuditMiddleware` logs every HTTP request, method, path, and execution time.

---

## 6. AI / QUERY PIPELINE DEEP DIVE
This is an **agentic pipeline**, not just a single zero-shot LLM call.
1. **Query Understanding:** Parses intent. *Why?* To know if it needs deep statistical hypothesis testing or just a simple lookup.
2. **Schema Retrieval (FAISS):** Vector search on the Data Catalog. *Why?* Context windows are limited and cost money. We only feed the LLM the tables it actually needs.
3. **Governance Enrichment:** Injects company-specific glossary terms. *Why?* LLMs don't know that "Revenue" specifically means `status='SUCCESS'` in your internal business logic.
4. **NL2SQL:** Generates the query. 
5. **Confidence Scoring:** *Why?* Builds trust. If a query fails or returns 0 rows, we explicitly tell the user confidence is "Low".
6. **Answer Synthesis:** *Why?* Executives don't want to read a raw data table; they want a one-sentence takeaway.

*Why this is better than direct SQL generation:* It prevents hallucinations, respects strict business logic (glossary), ensures data security (PII masking), and provides a polished, defensible UX.

---

## 7. DATA LAYER EXPLANATION
- **Synthetic Data (`seed_data.py`):** Generates fake users and payments so the app works out of the box for testing and demos.
- **App DB (`analytics.db`):** SQLite. Stores application state: Users, Passwords, Query Logs, Glossary, Catalog.
- **Analytics DB (`payments.db`):** SQLite. Stores the actual raw business data (Payments, Users).
- **In-Memory Execution (`df` / DuckDB):** `SQLExecutionService` loads the Analytics DB into Pandas DataFrames (`df`), then registers them with DuckDB. 
*Why?* DuckDB is an in-process analytical engine. It is blazing fast for OLAP (analytical) queries on DataFrames compared to standard SQLite.

---

## 8. TECH STACK EXPLANATION
- **Angular (Frontend):** Enterprise-grade SPA framework. Chosen for strong typing (TypeScript), opinionated structure, and built-in routing.
- **FastAPI (Backend):** High-performance Python framework. Chosen because Python is the undisputed king of AI/Data ecosystems, and FastAPI provides native async support and auto-documentation (Swagger).
- **DuckDB:** In-process SQL OLAP database. Chosen for high-speed aggregations on Pandas DataFrames.
- **OpenAI (GPT-4o-mini):** The LLM engine. Chosen for speed, cost-effectiveness, and high reasoning capability in SQL generation.
- **FAISS & Sentence Transformers:** Meta's local vector search library. Chosen for fast, free, local embedding similarity search (RAG) without needing a heavy managed vector database like Pinecone.
- **Altair / Vega-Lite:** Declarative visualization grammar. Chosen because the LLM can easily generate a JSON specification (Vega-Lite) which the frontend can blindly and safely render without running arbitrary JS.

---

## 9. DATABASE / STORAGE EXPLANATION
- **State vs. Analytics:** The architecture cleanly separates the application state (`analytics.db`) from the data warehouse (`payments.db`). 
- **Persisted Data:** Query logs (including exactly what SQL was run, the LLM token usage, latency, and the generated JSON chart spec) are saved forever for auditability.
- **Temporary Data:** The Pandas DataFrames are loaded into RAM for fast querying. Session IDs group queries together for potential conversational context.

---

## 10. EXPORT / CHART FLOW
1. **Creation:** `ChartService` prompts the LLM to choose a chart type (bar/line), then uses Python's `altair` library to generate a Vega-Lite JSON spec.
2. **Storage:** Saved as a JSON object in `query_logs.chart_spec`.
3. **Frontend Display:** Vega-Embed reads the JSON and renders an SVG/Canvas on the dashboard.
4. **Export (`export_service.py`):** 
   - *PDF:* Uses ReportLab. Converts the Vega-Lite JSON into a PNG buffer using `vl_convert`, then embeds the image into the PDF alongside a data table.
   - *HTML:* Uses Jinja2 templates. Injects the data table and the Vega-Lite JSON directly into a standalone HTML file.

---

## 11. SECURITY / GOVERNANCE
- **Auth:** JWT. Access token (short-lived, 30m) for API calls. Refresh token (7 days) to securely get new access tokens.
- **RBAC:** `role="admin"` vs `role="analyst"`. Admins can edit the Glossary, view the global catalog, and see global history.
- **Governance:** `mask_pii_in_context` strips columns marked `is_pii=True` (like email, phone numbers) from the LLM prompt if the user is an analyst. This physically prevents the LLM from knowing the column exists, neutralizing AI data exfiltration risks.
- **SQL Safety:** AST/Regex checks in `nl2sql_service.py` prevent `DELETE`, `DROP`, `UPDATE` execution, ensuring the LLM can never mutate data.

---

## 12. HOW TO EXPLAIN THIS TO A MANAGER
**30-Second Version:**
"I built an AI-powered BI platform that lets non-technical users ask questions in plain English and instantly get back data, charts, and insights. It uses Angular on the front, FastAPI on the back, and orchestrates an AI pipeline that securely translates English to DuckDB SQL."

**1-Minute Version:**
"This is a self-serve analytics platform to unblock our data team. Users ask questions, and a FastAPI backend uses RAG to fetch the relevant database schema and business glossary. It uses GPT-4 to write a secure SQL query, executes it locally via DuckDB for high performance, and returns a synthesized summary and dynamic chart to our Angular frontend. It has built-in RBAC and PII masking to ensure data governance."

**3-Minute Version:**
*(Combine the 1-minute version with the End-to-End Request Flow (Section 3) and Security (Section 11), highlighting the separation of App DB and Analytics DB).*

---

## 13. INTERVIEW QUESTIONS I SHOULD EXPECT
- **"Why DuckDB instead of just executing in SQLite?"**
  *To evaluate: Knowledge of OLTP vs OLAP.*
  *Answer:* SQLite is row-based (OLTP), great for application state. DuckDB is columnar (OLAP), optimized for aggregations, GROUP BYs, and scanning large datasets in memory.
- **"How do you prevent SQL Injection from the LLM?"**
  *To evaluate: Security awareness.*
  *Answer:* We restrict DB connections to read-only where possible, enforce `SELECT` only regex rules in the backend, and never execute user input directly.
- **"Why use RAG for the schema instead of passing the whole schema?"**
  *To evaluate: Understanding of LLM constraints.*
  *Answer:* Cost and context limits. Passing a 500-table schema wastes tokens and degrades LLM reasoning. FAISS retrieves only the top 5 relevant tables.

---

## 14. SPEAKING NOTES
- **Hook:** "This project democratizes data access. It turns plain English into actionable insights."
- **Core Loop:** "Query -> Intent -> RAG Schema -> SQL -> Execute -> Summarize -> Chart."
- **Tech highlights:** FastAPI (Speed), Angular (Structure), DuckDB (Analytics speed), FAISS (Local RAG).
- **Governance:** "It’s not a toy. It has real RBAC, PII masking, and business glossary injection so it understands company-specific metrics."
