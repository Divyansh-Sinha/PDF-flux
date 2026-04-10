# PDF → Database AI Extraction App — Technical Specification

## 1. Product Overview

A web application that allows users to:
1. Connect their database (MySQL, PostgreSQL, SQLite, MSSQL)
2. Upload any PDF (question papers, invoices, reports, legal docs, etc.)
3. Define or select a target DB schema/table(s)
4. Use an LLM to intelligently parse the PDF content and map it to the schema
5. Preview the extracted data and insert it into the database

**Key Insight:** This is NOT a table-detection tool. It is an AI-powered semantic extraction + schema mapping pipeline. The PDF may contain no tables at all — the LLM reads the content and structures it according to a user-defined schema.

---

## 2. Tech Stack (Recommended)

### Frontend
- **Framework:** Next.js 14 (App Router) or React + Vite
- **Styling:** Tailwind CSS
- **PDF Viewer:** PDF.js (Mozilla) — for rendering PDF in browser
- **State Management:** Zustand or React Context
- **API calls:** Axios or fetch with React Query

### Backend
- **Runtime:** Node.js (Express) or Python (FastAPI) — FastAPI preferred for ML tasks
- **PDF Text Extraction:** `pdfplumber` (Python) or `pdf-parse` (Node)
- **OCR (for scanned PDFs):** Tesseract via `pytesseract` or `pdf2image` + Tesseract
- **LLM:** Anthropic Claude API (`claude-sonnet-4-20250514`) or OpenAI GPT-4o
- **DB ORM:** SQLAlchemy (Python) or Prisma (Node) — supports multi-DB
- **Job Queue:** Celery + Redis (for large PDFs processed async)
- **File Storage:** Local disk or S3-compatible (MinIO for self-hosted)

### Database Support
- PostgreSQL
- MySQL / MariaDB
- SQLite
- Microsoft SQL Server

---

## 3. Architecture

```
[Browser]
    │
    ├── PDF Upload ──────────────────────────────────────┐
    ├── DB Connection Form                               │
    ├── Schema Editor / Table Selector                   │
    └── Preview & Confirm UI                             │
                                                         ▼
[Backend API]                                    [File Storage]
    │                                            (temp PDF store)
    ├── /api/connect-db     → Test DB connection
    ├── /api/upload-pdf     → Store PDF, extract raw text
    ├── /api/get-schema     → Fetch existing DB tables/columns
    ├── /api/extract        → LLM extraction pipeline
    │       │
    │       ├── 1. PDF Text Extraction (pdfplumber / OCR)
    │       ├── 2. Chunking (by page or semantic boundary)
    │       ├── 3. Schema-Aware Prompt Construction
    │       ├── 4. LLM Call (Claude / GPT-4o)
    │       ├── 5. JSON Response Parsing + Validation
    │       └── 6. Return structured rows to frontend
    │
    └── /api/insert         → Validate + insert rows into user's DB
```

---

## 4. Core Features

### 4.1 Database Connection
- Input: host, port, username, password, database name, DB type
- Action: Test connection before saving
- Security: Credentials stored in session only (never persisted to disk)
- Show: existing tables with column names and types after connection

### 4.2 PDF Upload
- Accept: `.pdf` files up to 50MB
- Show: PDF rendered inline using PDF.js
- Extract: raw text per page using pdfplumber
- Handle: scanned PDFs with OCR fallback (detect if page has no extractable text)

### 4.3 Schema Definition (The Core UX)
Three modes:
1. **Select existing table** — pick a table from connected DB, auto-load its columns
2. **Define new schema** — user types column names, picks types (text, int, date, float, boolean)
3. **AI-suggest schema** — send first 2 pages to LLM, get a suggested schema back

### 4.4 LLM Extraction Pipeline

**Step 1 — Chunking**
- Split PDF text into chunks of ~3000 tokens each
- Respect page boundaries; do not split mid-sentence if possible
- Add page number metadata to each chunk

**Step 2 — Prompt Construction**
```
System: You are a data extraction engine. Extract structured data from the document 
and return ONLY a valid JSON array. No explanation, no markdown, no preamble.

Schema: {
  "table": "questions",
  "columns": [
    {"name": "question_number", "type": "integer"},
    {"name": "question_text", "type": "text"},
    {"name": "option_a", "type": "text"},
    {"name": "option_b", "type": "text"},
    {"name": "option_c", "type": "text"},
    {"name": "option_d", "type": "text"},
    {"name": "subject", "type": "text"},
    {"name": "marks", "type": "integer"}
  ]
}

Document chunk (Page {N}):
{raw_text}

Return: JSON array of objects matching the schema. Use null for missing fields.
```

**Step 3 — Response Validation**
- Parse JSON strictly; retry chunk if parse fails (up to 3 retries)
- Validate each field against its declared type
- Coerce types where safe (e.g., "2" → 2 for integer)
- Flag rows where >50% fields are null — show as warnings in preview

**Step 4 — Deduplication**
- Hash each extracted row
- Remove exact duplicates across chunks (common when LLM sees overlapping context)

### 4.5 Preview & Edit
- Show extracted rows in an editable data table
- Allow user to: edit cells, delete rows, add rows manually
- Show confidence warnings (rows with many nulls)
- Show total row count before insert

### 4.6 Database Insert
- Generate parameterized INSERT statements (never string interpolation — SQL injection prevention)
- Options: Insert new rows only / Upsert (update if exists) / Replace all
- Transaction: wrap all inserts in a single transaction; rollback on failure
- Show: success count, failed rows, error details

---

## 5. Technical Challenges & Mitigations

| Challenge | Mitigation |
|---|---|
| Scanned PDFs with no text layer | Detect empty text → auto-run OCR via Tesseract |
| LLM output not valid JSON | Retry with stricter prompt; use `response_format: json` if available |
| PDF too large for context window | Chunk by page (3000 tokens/chunk), process sequentially |
| Context lost across chunks | Prepend last N rows of previous chunk as context |
| Ambiguous column mapping | Ask user to confirm mapping in preview step |
| SQL injection | Always use parameterized queries via ORM |
| DB credentials security | Never log or persist; use session-scoped encrypted store |
| Multi-table extraction | Allow user to define multiple schemas; run separate LLM pass per table |

---

## 6. API Endpoints

```
POST /api/db/connect
  Body: { host, port, user, password, dbname, type }
  Returns: { success, tables: [{ name, columns: [{ name, type }] }] }

POST /api/pdf/upload
  Body: multipart/form-data (file)
  Returns: { fileId, pageCount, textExtracted: boolean, ocrUsed: boolean }

POST /api/schema/suggest
  Body: { fileId, pages: [1, 2] }
  Returns: { suggestedSchema: [{ name, type }] }

POST /api/extract
  Body: { fileId, schema: { table, columns }, pageRange?: [start, end] }
  Returns: { jobId } (async) OR { rows, warnings } (sync for small PDFs)

GET /api/extract/:jobId
  Returns: { status, progress, rows, warnings }

POST /api/insert
  Body: { rows, table, mode: "insert"|"upsert"|"replace" }
  Returns: { inserted, failed, errors }
```

---

## 7. Data Flow Diagram

```
PDF Upload
    │
    ▼
Text Extraction (pdfplumber)
    │
    ├── Text found? ──YES──► Chunk text by page
    │
    └── NO ──► OCR (Tesseract) ──► Chunk text
                    │
                    ▼
            Schema Definition (user input or AI suggestion)
                    │
                    ▼
            LLM Extraction (per chunk)
            ┌──────────────────────────┐
            │  Prompt = Schema + Chunk │
            │  → Claude API            │
            │  → Parse JSON response   │
            │  → Validate types        │
            └──────────────────────────┘
                    │
                    ▼
            Merge + Deduplicate rows
                    │
                    ▼
            Preview Table (editable)
                    │
                    ▼
            User confirms → DB Insert (transaction)
                    │
                    ▼
            Success / Error Report
```

---

## 8. Environment Variables

```env
# LLM
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-4-20250514
LLM_MAX_TOKENS=4096

# App
MAX_PDF_SIZE_MB=50
CHUNK_SIZE_TOKENS=3000
MAX_RETRIES=3

# Storage
UPLOAD_DIR=./uploads
# OR for S3:
S3_BUCKET=pdf-extractor
S3_ENDPOINT=http://localhost:9000

# Redis (for async jobs)
REDIS_URL=redis://localhost:6379
```

---

## 9. Project Structure (FastAPI + Next.js)

```
/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Landing / DB connect
│   │   ├── upload/page.tsx    # PDF upload + viewer
│   │   ├── schema/page.tsx    # Schema definition
│   │   ├── preview/page.tsx   # Extracted data preview
│   │   └── result/page.tsx    # Insert result
│   └── components/
│       ├── DBConnectForm.tsx
│       ├── PDFViewer.tsx
│       ├── SchemaEditor.tsx
│       ├── DataPreviewTable.tsx
│       └── InsertConfirm.tsx
│
├── backend/                   # FastAPI app
│   ├── main.py
│   ├── routers/
│   │   ├── db.py              # DB connection endpoints
│   │   ├── pdf.py             # Upload + extraction endpoints
│   │   └── insert.py          # Insert endpoints
│   ├── services/
│   │   ├── pdf_extractor.py   # pdfplumber + OCR
│   │   ├── chunker.py         # Text chunking logic
│   │   ├── llm_service.py     # Claude API calls
│   │   ├── schema_mapper.py   # JSON validation + type coercion
│   │   └── db_service.py      # SQLAlchemy multi-DB handler
│   └── workers/
│       └── extraction_worker.py  # Celery async worker
│
├── docker-compose.yml
└── README.md
```

---

## 10. Open Source Libraries

| Library | Language | Purpose |
|---|---|---|
| `pdfplumber` | Python | PDF text + table extraction |
| `pytesseract` | Python | OCR for scanned PDFs |
| `pdf2image` | Python | Convert PDF pages to images for OCR |
| `anthropic` | Python/Node | Claude API client |
| `sqlalchemy` | Python | Multi-DB ORM |
| `celery` | Python | Async job queue |
| `redis` | — | Job queue broker |
| `pdf.js` | JS | PDF rendering in browser |
| `react-table` / `tanstack-table` | JS | Editable preview table |
| `zod` | TS | Schema validation on frontend |

---

## 11. Suggested MVP Scope (Phase 1)

Focus on making the core loop work:
1. Connect PostgreSQL only (simplest driver)
2. Upload PDF → extract text (pdfplumber, no OCR yet)
3. User defines schema manually (no AI suggestion yet)
4. LLM extraction → JSON → Preview table
5. Insert to DB

**Phase 2:** Add OCR, multi-DB support, AI schema suggestion, upsert modes
**Phase 3:** Async jobs, batch PDFs, user auth, history log
