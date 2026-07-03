# Self-Serve Analytics BI Platform

An enterprise-grade, AI-powered Business Intelligence platform that allows users to ask natural language questions and receive accurate SQL analytics, interactive charts, and deep business insights based on real banking datasets.

## 🏗 System Architecture

The application follows a decoupled modern architecture:

1. **Frontend**: Angular 21 application utilizing Angular Material for clean, Stripe-like UI aesthetics. It communicates with the backend via RESTful APIs.
2. **Backend**: FastAPI (Python) serving as the orchestration layer for all AI and data logic.
3. **Analytics Engine (DuckDB)**: An extremely fast in-memory SQL execution engine that runs analytical queries against pandas DataFrames.
4. **Metadata Store (SQLite)**: Stores users, queries history, business glossary, data catalog, and audit logs.
5. **AI Orchestration**: A multi-step LLM pipeline utilizing OpenAI (GPT-4) to parse intent, generate SQL, build charts, and synthesize answers.

---

## ⚙️ Pipeline Flow & Number of LLM Calls

When a user submits a query (e.g., *"What is the revenue by region?"*), it runs through a 14-step orchestration pipeline defined in `PipelineService`. 

**Total LLM Calls per Query:**
- **Standard Query**: ~5 LLM calls.
- **Complex Query (with Hypotheses)**: ~6 + N LLM calls (where N is the number of generated hypotheses).

### The Pipeline Steps:
1. **Schema & Glossary Retrieval**: Fetches the complete structural database schema and relevant business definitions.
2. **Query Understanding (LLM Call 1)**: Parses the user's natural language to determine the intent (e.g., trend, grouping, scalar).
3. **Hypothesis Generation (LLM Call 2 - Conditional)**: If the query intent is complex, the system generates analytical hypotheses.
4. **Hypothesis Testing (LLM Calls 3 to N+2)**: The system generates and executes exploratory SQL for each hypothesis to see if the data supports the theory.
5. **Main SQL Generation (LLM Call N+3)**: Generates the DuckDB SQL query to answer the user's specific prompt.
6. **SQL Validation**: Automatically checks the SQL against safety rules (e.g., blocks `DROP`, `DELETE`).
7. **Execution**: DuckDB executes the SQL against the loaded datasets.
8. **Chart Generation (LLM Call N+4)**: An LLM analyzes the dataset structure and returns a Vega-Lite JSON specification to render a chart.
9. **Answer Synthesis (LLM Call N+5)**: Analyzes the results and generates a natural language summary and business insight.
10. **Follow-up Generation (LLM Call N+6)**: Suggests 3 contextual follow-up questions.
11. **Data Provenance**: Maps out exactly which tables and columns were used to derive the answer.
12. **Audit Logging**: Saves the entire interaction securely to SQLite.

---

## 🛠 Service-by-Service Understanding (Technical Details)

### `PipelineService` (`pipeline_service.py`)
- **Role**: The central orchestrator. It sequentially calls every other AI service, manages the timing, collects the outputs, handles caching/errors, and logs the final result.

### `SchemaRetrievalService` (`schema_retrieval_service.py`)
- **Role**: Context provider. It queries the `data_catalog` table in SQLite. 
- **Technical Detail**: It currently bypasses vector search to inject the **entire** active schema into the prompt. Because the total dataset is ~86 columns, feeding the full structural map to the LLM ensures primary/foreign keys are never dropped, resulting in perfect multi-table joins.

### `QueryUnderstandingService` (`query_understanding_service.py`)
- **Role**: Intent router. It parses the query into structured JSON mapping the user's intent (`query_type`, `group_by`, `time_granularity`, `limit`, etc.) which acts as a guardrail for downstream SQL generation.

### `HypothesisService` (`hypothesis_service.py`)
- **Role**: Generates analytical theories. 
- **Technical Detail**: Before generating SQL, it looks at the user's prompt and the schema to formulate 2-3 logical hypotheses. Example: If the user asks *"Why did loan defaults increase?"*, it might generate hypotheses like:
  1. *Defaults increased due to a rise in High-Risk customer segments.*
  2. *Defaults are correlated with loans that have a higher interest rate.*

### `HypothesisTestingService` (`hypothesis_testing_service.py`)
- **Role**: Validates theories against raw data.
- **Technical Detail**: For every hypothesis generated, this service utilizes the `NL2SQLService` to write a specific SQL query to test that exact theory. It executes the SQL in DuckDB. If the query succeeds and returns meaningful correlations, the hypothesis is marked as "Tested/Supported".

### `NL2SQLService` (`nl2sql_service.py`)
- **Role**: The core SQL engine.
- **Technical Detail**: Combines the user query, the full schema context, business glossary terms, and the parsed intent to prompt the LLM to write DuckDB-compatible SQL. It enforces security rules via `_validate_safety()` (raising an exception if `DELETE` or `UPDATE` is found).

### `SQLExecutionService` (`sql_execution_service.py`)
- **Role**: The data runner.
- **Technical Detail**: Uses `duckdb.connect()` to register the loaded pandas DataFrames (`accounts`, `customers`, `loans`, `transactions`) as virtual tables. It runs the generated SQL and returns the resulting DataFrame.

### `ChartService` (`chart_service.py`)
- **Role**: Visualization generator.
- **Technical Detail**: Instructs the LLM to generate a robust `Vega-Lite` JSON specification based on the columns and data types of the execution result, which the Angular frontend uses to draw beautiful, responsive charts.

### `AnswerSynthesisService` (`answer_synthesis_service.py`)
- **Role**: Natural language generator.
- **Technical Detail**: Routes data to specific prompts (`SCALAR`, `COMPARISON`, `GROUPED`, or `NO_DATA`) based on the dataframe shape. It safely formats currencies and ensures edge cases (like empty `SUM()` arrays returning `NaN`) are handled gracefully without hallucination.

### `FollowUpService` (`follow_up_service.py`)
- **Role**: Engagement driver.
- **Technical Detail**: Looks at the recent query and resulting answer to generate 3 clickable follow-up questions that allow the user to dig deeper.

---

## 🧪 Testing of Services

The platform utilizes `pytest` to strictly validate backend logic.
- **Automated Tests**: Located in `backend/tests/`. There are currently 51 extensive tests covering API routes (`test_routers`) and internal AI logic (`test_services`).
- **Validation**: Tests use mocked LLM responses (via `unittest.mock`) to verify that the pipeline correctly handles edge cases, unsafe SQL rejection, zero-row graceful fallbacks, and schema integration without hitting the actual OpenAI API.
- **Execution**: Run via `pytest` or `python -m pytest` from the `backend/` directory.

---

## 👨‍💻 Developer Guide

### Environment Setup

1. **Clone & Virtual Environment**:
   ```bash
   cd backend
   python -m venv newvenv
   newvenv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

3. **Database Seeding**:
   The application requires the SQLite database and Data Catalog to be initialized from the CSV datasets.
   ```bash
   cd backend
   python -m seed.seed_data
   ```

4. **Running Locally**:
   Start the backend (FastAPI):
   ```bash
   cd backend
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

   Start the frontend (Angular):
   ```bash
   cd frontend
   npm start
   ```

5. **Default Admin Login**:
   - **Email**: `admin@analytics.com`
   - **Password**: `admin123!`

### Project Structure Highlights
- `backend/app/services/`: All AI and data orchestration logic.
- `backend/app/core/prompts.py`: Centralized location for every LLM prompt template. Edit these to tweak AI personality or rule enforcement.
- `backend/dataset/`: The raw `csv` files containing simulated banking data.
- `frontend/src/app/features/`: Contains Angular components for the Dashboard, Catalog, Admin, and Glossary views.