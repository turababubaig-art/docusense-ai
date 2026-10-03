from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "DocuSense AI"
    app_version: str = "6.0.0"
    environment: str = "development"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8000

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    supabase_url: str | None = None
    supabase_key: str | None = None
    supabase_service_key: str | None = None

    ai_provider: str = "none"
    openai_api_key: str | None = None
    ai_model: str = "gpt-4.1-mini"
    ai_base_url: str | None = None
    ai_timeout_seconds: float = 60.0
    ai_temperature: float = 0.0
    ai_max_output_tokens: int = 4000
    rapidapi_key: str | None = None
    rapidapi_host: str | None = None
    rapidapi_endpoint: str | None = None

    upload_dir: Path = Path("uploads")
    max_file_size_mb: int = 25
    max_document_pages: int = 1000
    file_retention_hours: int = 24
    allowed_extensions: str = ".pdf,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"

    chunk_size: int = 1000
    chunk_overlap: int = 150
    max_context_chars: int = 24000
    max_chat_context_chars: int = 24000
    search_index_limit: int = 12000

    ocr_enabled: bool = True
    tesseract_path: str | None = None
    ocr_workers: int = 4
    fast_pdf_engine: str = "fitz"

    batch_concurrency: int = 4
    max_batch_files: int = 20

    rate_limit_requests: int = 120
    rate_limit_window_seconds: int = 60

    redis_url: str | None = None
    cache_ttl_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False)

    @property
    def max_file_size(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @property
    def cors_origin_list(self) -> List[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def extension_set(self) -> set[str]:
        return {x.strip().lower() for x in self.allowed_extensions.split(",") if x.strip()}


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings
