from __future__ import annotations
from pydantic import BaseModel, Field

class EntityItem(BaseModel):
    type: str
    value: str
    page: int | None = None
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    role: str | None = None
