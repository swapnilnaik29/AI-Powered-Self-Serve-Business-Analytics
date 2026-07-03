# Functionality Implemented

This document summarizes the functionality currently implemented in the production-style refactor.

## 1) Architecture Implemented

### Backend (FastAPI)

- Layered structure implemented under `backend/app/`:
  - `routers/` -> HTTP endpoints
  - `services/` -> business logic
  - `repositories/` -> database access
  - `models/` -> SQLAlchemy ORM models
  - `schemas/` -> Pydantic request/response contracts
  - `core/` -> config, security, DI, DB session, logging, exceptions
  - `middleware/` -> audit logging and rate limiting
  - `integrations/` -> LLM and vector store adapters

### Frontend (Angular)

- Feature-based and shared structure implemented under `frontend/src/app/`:
  - `core/` -> auth, interceptors, API service, shared models
  - `features/` -> dashboard, auth, history, glossary, catalog, admin
  - `shared/components/` -> reusable UI components

## 2) Backend Features Implemented

## Authentication and Security

- JWT-based auth:
  - register/login/refresh/me
- Password hashing with bcrypt
- Role model in user:
  - `admin`, `analyst`, `viewer`
- Route-level authorization helpers:
  - current user, admin only, analyst-or-admin

## Query Pipeline (End-to-End)

- Natural language query pipeline implemented:
  1. Schema retrieval (RAG context from data catalog)
  2. Query understanding
  3. Hypothesis generation
  4. NL-to-SQL generation
  5. SQL safety validation
  6. SQL execution via DuckDB over payments dataframe
  7. Hypothesis testing (for complex queries)
  8. Answer synthesis
  9. Confidence scoring
  10. Chart decision + chart spec generation
  11. Follow-up question suggestions
  12. Query/audit persistence

## Data and Governance

- SQLAlchemy models implemented for:
  - users
  - query logs
  - feedback
  - business glossary
  - data catalog
  - governance rules
- Catalog sync from SQLite schema
- PII masking logic in schema context for non-admin users
- Governance rule CRUD endpoints (RBAC/PII/row_filter types)

## Feedback and Export

- Query feedback submission (`thumbs up/down`, optional SQL correction/comment)
- Feedback export as JSONL
- Query export formats:
  - PDF
  - Excel
  - HTML

## Ops and Reliability

- Centralized settings via `.env` + pydantic settings
- CORS middleware (local dev origins configured)
- Audit middleware for request logging
- In-memory rate-limiting middleware
- Global exception handlers with structured API error responses

## Testing

- Backend tests implemented and passing:
  - router tests (auth, health, glossary)
  - service tests (confidence, nl2sql safety)
  - repository tests (user repository)

## 3) Frontend Features Implemented

## Auth Experience

- Login and register pages
- Auth guard + admin guard
- Access token attachment interceptor
- Token refresh flow on 401
- Logout flow and user role-aware navbar

## Dashboard Experience

- Natural language query input
- Result panel:
  - answer text
  - tabular data preview
- SQL viewer with copy button
- Confidence badge + confidence reason
- Hypothesis panel + strongest hypothesis card
- Follow-up suggestion chips (click-to-query)
- Feedback widget (up/down + optional correction/comment)
- Chart rendering component for backend chart spec

## Management Pages

- Query history page:
  - pagination
  - export buttons (PDF/Excel/HTML)
- Business glossary page:
  - list for authenticated users
  - admin create/update/delete
- Data catalog page:
  - grouped by table
  - admin sync action
- Governance admin page:
  - create/update/delete rules

## 4) API Surface Implemented

## Health

- `GET /api/v1/health`

## Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`

## Queries

- `POST /api/v1/queries`
- `GET /api/v1/queries`
- `GET /api/v1/queries/{id}`

## Feedback

- `POST /api/v1/queries/{id}/feedback`
- `GET /api/v1/feedback/export`

## Glossary

- `GET /api/v1/glossary`
- `POST /api/v1/glossary`
- `PUT /api/v1/glossary/{id}`
- `DELETE /api/v1/glossary/{id}`

## Catalog

- `GET /api/v1/catalog`
- `POST /api/v1/catalog`
- `PUT /api/v1/catalog/{id}`
- `POST /api/v1/catalog/sync`

## Governance

- `GET /api/v1/governance/rules`
- `POST /api/v1/governance/rules`
- `PUT /api/v1/governance/rules/{id}`
- `DELETE /api/v1/governance/rules/{id}`

## Export

- `GET /api/v1/queries/{id}/export?format=pdf|excel|html`

## 5) Seeded Defaults

Seed script (`backend/seed/seed_data.py`) provides:

- Payments sample data in SQLite
- Default admin user:
  - `admin@analytics.local`
  - `admin123!` (for local development only)
- Initial business glossary entries
- Initial data catalog entries for `payments`

## 6) Current Scope Notes

- The old root prototype files (`app.py`, legacy pipeline modules) still exist in repository root, but the production flow runs from:
  - `backend/app/main.py` (FastAPI backend)
  - `frontend/` (Angular frontend)
- Frontend uses Zone.js bootstrap and backend CORS includes localhost and 127.0.0.1 for local development.

