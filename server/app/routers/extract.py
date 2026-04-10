from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.models import ExtractRequest, ExtractResponse, RowWarning

logger = logging.getLogger(__name__)
from app.services.chunker import chunk_pages
from app.services.dedupe import deduplicate_rows
from app.services.llm_service import llm_service
from app.services.schema_mapper import coerce_rows
from app.state import uploaded_pdfs
from app.models import UsageStats

router = APIRouter(prefix="/api", tags=["extract"])


@router.post("/extract", response_model=ExtractResponse)
def extract_data(payload: ExtractRequest) -> ExtractResponse:
    stored = uploaded_pdfs.get(payload.fileId)
    if not stored:
        raise HTTPException(status_code=404, detail="fileId not found")

    pages = stored.pages
    page_offset = 1

    if payload.pageRange:
        start, end = payload.pageRange
        if end > len(pages):
            raise HTTPException(status_code=400, detail="pageRange exceeds available pages")
        pages = pages[start - 1 : end]
        page_offset = start

    chunks = chunk_pages(pages=pages, chunk_size_tokens=settings.chunk_size_tokens, start_page=page_offset)
    
    logger.info(f"Total chunks created: {len(chunks)} (with token chunk size: {settings.chunk_size_tokens})")

    extracted: list[dict] = []
    parsing_warnings: list[RowWarning] = []
    
    total_usage = UsageStats()

    for chunk in chunks:
        success = False
        last_error = "unknown"
        for _ in range(settings.max_retries):
            try:
                rows, usage = llm_service.extract_rows_from_chunk(
                    schema=payload.schema_params,
                    chunk_text=chunk.text,
                    start_page=chunk.start_page,
                    end_page=chunk.end_page,
                    provider_config=payload.aiProvider
                )
                
                if usage:
                    total_usage.prompt_tokens += usage.prompt_tokens
                    total_usage.completion_tokens += usage.completion_tokens
                    total_usage.total_tokens += usage.total_tokens
                
                extracted.extend(rows)
                success = True
                break
            except Exception as exc:
                last_error = str(exc)
                logger.error(f"Try {_ + 1}: LLM extraction failed for chunk {chunk.start_page}-{chunk.end_page}: {last_error}")
        if not success:
            logger.error(f"Chunk {chunk.start_page}-{chunk.end_page} permanently failed after {settings.max_retries} retries.")
            parsing_warnings.append(
                RowWarning(
                    index=-1,
                    reason=(
                        f"Chunk {chunk.start_page}-{chunk.end_page} failed after "
                        f"{settings.max_retries} retries: {last_error}"
                    ),
                )
            )

    coerced_rows, type_warnings = coerce_rows(extracted, payload.schema_params)
    unique_rows = deduplicate_rows(coerced_rows)

    return ExtractResponse(rows=unique_rows, warnings=[*parsing_warnings, *type_warnings], usage=total_usage)

