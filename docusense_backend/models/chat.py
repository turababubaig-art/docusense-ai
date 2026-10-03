from __future__ import annotations
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=5000)
    document_id: str | None = None
    context: str | None = Field(default=None, max_length=24000)

class Citation(BaseModel):
    page: int | None = None
    evidence: str
    score: float | None = None

class ChatResponse(BaseModel):
    status: str
    question: str
    document_id: str | None = None
    mode: str
    answer: str
    citations: list[Citation] = Field(default_factory=list)
