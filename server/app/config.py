from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    mistral_api_key: str = os.getenv("MISTRAL_API_KEY", "")
    llm_model: str = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    llm_max_tokens: int = int(os.getenv("LLM_MAX_TOKENS", "8192"))
    max_pdf_size_mb: int = int(os.getenv("MAX_PDF_SIZE_MB", "50"))
    chunk_size_tokens: int = int(os.getenv("CHUNK_SIZE_TOKENS", "30000"))
    max_retries: int = int(os.getenv("MAX_RETRIES", "3"))
    upload_dir: Path = Path(os.getenv("UPLOAD_DIR", "./uploads"))


settings = Settings()

