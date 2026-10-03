from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, Field

class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    original_filename: str
    extension: str
    mime_type: str | None = None
    size_bytes: int = Field(ge=0)
    sha256: str
    pages: int = Field(default=0, ge=0)
    language: str = "Unknown"
    status: str = "queued"
    created_at: str
    updated_at: str
    user_id: str | None = None

class DocumentPage(BaseModel):
    document_id: str
    page: int = Field(ge=1)
    text: str = ""
    characters: int = Field(default=0, ge=0)
    words: int = Field(default=0, ge=0)
    ocr: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)

class DocumentChunk(BaseModel):
    document_id: str
    chunk_id: str
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)
    text: str
    token_count: int = Field(ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)

class UploadResponse(BaseModel):
    status: str
    document_id: str
    filename: str
    size_bytes: int
    pages: int
    characters: int
    words: int
    language: str
    preview: str
    page_data: list[dict[str, Any]] = Field(default_factory=list)
