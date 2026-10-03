# DocuSense AI — Modular FastAPI Backend

This backend refactors the supplied 2,930-line `main.py` into a modular architecture while preserving the existing frontend-facing endpoints. The supplied backend already contained PDF/DOCX/TXT/MD/CSV/image extraction, selective OCR, deterministic risk detection, entity extraction, summaries, smart extraction, Supabase persistence, batch analysis, Excel reporting, search, comparison, analytics and chat. The new project keeps those capabilities behind dedicated services and compatibility routes.

## Install

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Linux/macOS:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Configure

Set Supabase values when persistence/auth is required. For OpenAI-compatible analysis use `AI_PROVIDER=openai` and set `OPENAI_API_KEY`. RapidAPI remains supported with `AI_PROVIDER=rapidapi`, `RAPIDAPI_KEY`, `RAPIDAPI_HOST`, and `RAPIDAPI_ENDPOINT` for compatibility with the supplied backend.

OCR is selective for PDF pages with little extracted text. For Windows install Tesseract OCR and set `TESSERACT_PATH` if it is not installed in a standard location.

## Run

```bash
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Swagger: `http://127.0.0.1:8000/docs`
OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## React integration

Keep the frontend API base URL pointed at `http://127.0.0.1:8000`. Existing compatibility routes include `/upload`, `/analyze`, `/analyze/batch`, `/documents`, `/documents/{document_id}`, `/documents/{document_id}/intelligence`, `/documents/{document_id}/timeline`, `/documents/{document_id}/clauses`, `/documents/{document_id}/financials`, `/documents/{document_id}/review`, `/documents/{document_id}/ask`, `/documents/{document_id}/smart-extract`, `/search`, `/analytics`, `/chat`, `/compare`, `/ai/enrich/{document_id}`, `/metrics`, `/health`, and `/system/capabilities`.

## Supabase

Run `sql/schema.sql` in the Supabase SQL editor. The schema creates document, page, chunk, entity, risk, clause, financial, timeline, embedding and job tables with user/document indexes and pgvector support.

## Production deployment

Use a process manager/container, persistent object storage for uploaded files, Supabase/Postgres for structured persistence, and Redis for distributed rate limiting/job coordination. The included in-process task manager is intentionally suitable for local/single-instance operation; it exposes the same job abstraction that can be replaced with a Redis/Celery/RQ worker without changing route contracts.

## Important behavior

The deterministic analyzer never claims that keyword presence alone proves legal danger. Findings include the detected phrase, context, page where available, source and a heuristic confidence. External AI is used only when configured. When it is unavailable, the system does not fabricate AI output.
