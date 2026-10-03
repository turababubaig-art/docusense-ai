from __future__ import annotations
from pydantic import BaseModel, Field

class ClauseItem(BaseModel):
    type: str
    title: str
    text: str
    page: int | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    risk_level: str | None = None
