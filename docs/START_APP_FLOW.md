# Start Application Flow

This document explains how to set up, test, and run the full application (FastAPI backend + Angular frontend) in local development.

## 1) Prerequisites

- macOS/Linux terminal
- Python 3.9+
- Node.js + npm
- Internet access for package installation

## 2) Project Structure (Relevant)

- `backend/` -> FastAPI application
- `frontend/` -> Angular application
- `backend/seed/seed_data.py` -> seeds analytics DB + admin/glossary/catalog defaults

## 3) Backend Setup and Start

From project root:

```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt
```

Seed the database (safe to run multiple times):

```bash
PYTHONPATH="$(pwd)" python3 -m seed.seed_data
```

Start backend server:

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify backend health:

```bash
curl localhost:8000/api/v1/health
```

Expected:

```json
{"status":"healthy","services":{"database":"connected","llm":"available"}}
```

## 4) Frontend Setup and Start

Open a second terminal from project root:

```bash
cd frontend
npm install
npm run start -- --host 0.0.0.0 --port 4200
```

Access frontend:

- `http://localhost:4200`
- `http://127.0.0.1:4200`

## 5) Run Tests / Validation

### Backend tests

```bash
cd backend
PYTHONPATH="$(pwd)" python3 -m pytest tests -v
```

### Frontend production build check

```bash
cd frontend
npm run build
```

## 6) Typical Startup Order

1. Start backend (`:8000`)
2. Start frontend (`:4200`)
3. Open frontend in browser
4. Login/register and run queries

## 7) Known Startup Issues and Fixes

### Issue: `ImportError: email-validator is not installed`

Install into your active Python environment:

```bash
pip install email-validator
```

If using local venv:

```bash
./venv/bin/pip install email-validator
```

### Issue: Angular error `NG0908: Angular requires Zone.js`

Fix:

1. Ensure `zone.js` is installed:
   ```bash
   cd frontend && npm install zone.js
   ```
2. Ensure `frontend/src/main.ts` contains:
   ```ts
   import 'zone.js';
   ```

### Issue: Frontend opens but API calls fail due to CORS

Check `backend/.env` CORS setting includes all local origins:

```env
CORS_ORIGINS=["http://localhost:4200","http://127.0.0.1:4200","http://0.0.0.0:4200"]
```

Restart backend after updating `.env`.

## 8) Useful URLs

- Backend health: `http://127.0.0.1:8000/api/v1/health`
- Backend docs: `http://127.0.0.1:8000/api/docs`
- Frontend app: `http://127.0.0.1:4200`

## 9) Stop Services

- In each running terminal: `Ctrl + C`

