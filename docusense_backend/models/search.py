from __future__ import annotations
from pydantic import BaseModel, Field

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    document_id: str | None = None
    limit: int = Field(default=10, ge=1, le=100)
    semantic: bool = True

class SearchHit(BaseModel):
    score: float
    text: str
    page: int | None = None
    chunk_id: str | None = None
    document_id: str | None = None

class SearchResponse(BaseModel):
    status: str
    query: str
    results: list[SearchHit]
