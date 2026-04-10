from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TextChunk:
    start_page: int
    end_page: int
    text: str


def estimate_tokens(text: str) -> int:
    # Rough estimate for English-like text.
    return max(1, len(text) // 4)


def chunk_pages(pages: list[str], chunk_size_tokens: int, start_page: int = 1) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    buffer: list[str] = []
    buffer_tokens = 0
    chunk_start = start_page
    current_page_number = start_page

    for page_text in pages:
        text = page_text.strip()
        token_count = estimate_tokens(text)
        if buffer and buffer_tokens + token_count > chunk_size_tokens:
            chunks.append(
                TextChunk(
                    start_page=chunk_start,
                    end_page=current_page_number - 1,
                    text="\n\n".join(buffer).strip(),
                )
            )
            buffer = []
            buffer_tokens = 0
            chunk_start = current_page_number

        buffer.append(f"[Page {current_page_number}]\n{text}")
        buffer_tokens += token_count
        current_page_number += 1

    if buffer:
        chunks.append(
            TextChunk(
                start_page=chunk_start,
                end_page=current_page_number - 1,
                text="\n\n".join(buffer).strip(),
            )
        )

    return chunks

