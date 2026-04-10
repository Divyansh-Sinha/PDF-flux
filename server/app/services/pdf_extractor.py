from __future__ import annotations

from pathlib import Path

import pdfplumber


def extract_text_by_page(pdf_path: Path) -> list[str]:
    pages: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append((page.extract_text() or "").strip())
    return pages

