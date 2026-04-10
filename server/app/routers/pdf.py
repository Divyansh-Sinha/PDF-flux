from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import settings
from app.models import PDFUploadResponse
from app.services.pdf_extractor import extract_text_by_page
from app.state import StoredPDF, uploaded_pdfs

router = APIRouter(prefix="/api/pdf", tags=["pdf"])


@router.post("/upload", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> PDFUploadResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    max_size = settings.max_pdf_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_pdf_size_mb}MB limit")

    file_id = str(uuid.uuid4())
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    dest = Path(settings.upload_dir) / f"{file_id}.pdf"
    dest.write_bytes(content)

    try:
        pages = extract_text_by_page(dest)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {exc}") from exc

    uploaded_pdfs[file_id] = StoredPDF(file_id=file_id, path=dest, pages=pages)
    text_extracted = any(page.strip() for page in pages)

    return PDFUploadResponse(
        fileId=file_id,
        pageCount=len(pages),
        textExtracted=text_extracted,
        ocrUsed=False,
    )


@router.get("/{file_id}/preview")
def get_pdf_preview(file_id: str) -> dict:
    pdf = uploaded_pdfs.get(file_id)
    if pdf is None:
        raise HTTPException(status_code=404, detail="File not found")

    previews = []
    for i, page_text in enumerate(pdf.pages, start=1):
        snippet = page_text.strip()[:350].replace("\n", " ")
        previews.append({
            "page": i,
            "snippet": snippet if snippet else "(no text detected on this page)"
        })

    return {"fileId": file_id, "pages": previews}
