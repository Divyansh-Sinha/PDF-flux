# Phase 1 Backend (FastAPI, Python)

Implements the MVP loop from `pdf-to-db-technical-spec.md`:

1. PostgreSQL connection + schema introspection
2. PDF upload + text extraction (`pdfplumber`)
3. Manual schema-driven extraction via Anthropic LLM
4. Response validation/coercion + deduplication
5. Transactional insert (`insert` mode)

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Environment

Copy `.env.example` values into your environment before running:

- `ANTHROPIC_API_KEY`
- `LLM_MODEL`
- `LLM_MAX_TOKENS`
- `MAX_PDF_SIZE_MB`
- `CHUNK_SIZE_TOKENS`
- `MAX_RETRIES`
- `UPLOAD_DIR`

## API Endpoints

- `POST /api/db/connect`
- `POST /api/pdf/upload`
- `POST /api/extract`
- `POST /api/insert`
- `GET /health`

## Notes

- Credentials are only kept in memory (`connectionId` based), never persisted to disk.
- OCR, multi-DB, AI schema suggestion, upsert/replace modes, and async jobs are Phase 2+.
