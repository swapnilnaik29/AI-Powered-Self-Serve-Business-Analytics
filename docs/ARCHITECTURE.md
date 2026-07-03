# Architecture Deep Dive

This document details the architectural layers and service boundaries of the Self-Serve Analytics BI platform. It is intended for onboarding engineers to understand how a natural language question becomes a PDF report.

## High-Level Pipeline

The core of the application is a synchronous, sequential pipeline managed by `PipelineService`. When a user submits a query, it flows through these discrete steps:

1. **Query Understanding (`QueryUnderstandingService`)**
   - Uses OpenAI to determine the intent of the query.
   - Detects if the query is a "data question" (requires SQL) or a "meta question" (asking about definitions/glossary).
   
2. **Schema Retrieval (`SchemaRetrievalService`)**
   - Connects to the Vector Store (FAISS).
   - Embeds the user query and retrieves the top-K relevant tables/columns from the Data Catalog.
   - Outputs a contextualized schema string to inject into the LLM prompt.

3. **NL2SQL Translation (`NL2SQLService`)**
   - Prompts the LLM with the user query and the retrieved schema context.
   - Asks the LLM to generate valid DuckDB SQL (handling `JOIN`s, time-series, aggregations).
   
4. **SQL Execution (`SQLExecutionService`)**
   - Connects to the in-memory DuckDB instance.
   - Executes the generated SQL against the `users` and `payments` tables.
   - Returns a Pandas DataFrame.

5. **Chart Generation (`ChartService`)**
   - Analyzes the DataFrame (columns, data types, cardinality).
   - Uses an LLM or heuristics to determine the best chart type (bar, line, scatter, pie).
   - Generates a Vega-Lite JSON specification.

6. **Answer Synthesis (`AnswerSynthesisService`)**
   - Takes the raw query, the SQL, and the resulting DataFrame snippet.
   - Generates a natural language summary of the findings (e.g., "The total revenue for Enterprise users is $4.2M...").

## Component Layering

### 1. Presentation Layer (Angular)
- Strict separation of smart and dumb components.
- `DashboardComponent` acts as the orchestrator.
- `QueryInputComponent` handles user input.
- `ResultPanelComponent` renders the Markdown response and uses `vega-embed` to render the interactive chart from the JSON spec.

### 2. API / Routing Layer (FastAPI)
- Controllers located in `routers/`.
- No business logic lives here. Endpoints simply authenticate the user, parse the request schema, and pass it to the corresponding service.

### 3. Service Layer (Business Logic)
- Located in `services/`.
- Services are highly decoupled. For example, `ChartService` does not know where the DataFrame came from; it only knows how to turn a DataFrame into a Vega-Lite spec.

### 4. Integration Layer
- Located in `integrations/`.
- Wrappers around external dependencies.
- `LLMClient`: Wraps the `openai` SDK. Handles retries and token limits.
- `VectorStore`: Wraps FAISS and SentenceTransformers.

### 5. Data Access Layer
- Located in `repositories/` and `models/`.
- SQLAlchemy handles persistent application data (users, saved queries, feedback).
- DuckDB handles ephemeral analytical workloads.

## Special Flows

### Export Engine (`ExportService`)
When a user requests a PDF:
1. The frontend sends the query ID and the Vega-Lite JSON spec.
2. `ExportService` uses `vl-convert-python` to safely convert the JSON spec into a PNG buffer *in Python*, avoiding the need for headless browsers (Puppeteer).
3. ReportLab injects the PNG and the text summary into a formatted PDF document.
