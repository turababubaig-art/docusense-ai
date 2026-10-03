from __future__ import annotations
from pydantic import BaseModel, Field

class RiskAnalysis(BaseModel):
    risk_level: str
    score: int = Field(ge=0)
    findings: list[dict]
    source: str
    disclaimer: str = "Risk signals are document-screening findings, not legal advice."
