from __future__ import annotations

from typing import Any, Generic, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

class APIError(BaseModel):
    code: str
    message: str

class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    error: APIError | None = None
    request_id: str | None = None
    model_config = ConfigDict(extra="allow")

class Evidence(BaseModel):
    document_id: str | None = None
    page: int | None = Field(default=None, ge=1)
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)

class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int = Field(ge=0, le=100)
    stage: str
    document_id: str | None = None
    error: str | None = None
    created_at: str
    updated_at: str
