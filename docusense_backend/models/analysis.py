from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field

class RiskFinding(BaseModel):
    level: str
    title: str | None = None
    type: str
    keyword: str | None = None
    count: int = 0
    score_contribution: int = 0
    text: str = ""
    context: str = ""
    page: int | None = None
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    source: str = "deterministic"

class Clause(BaseModel):
    type: str
    title: str | None = None
    text: str = ""
    page: int | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    risk_level: str | None = None

class Entity(BaseModel):
    type: str
    value: str
    label: str | None = None
    page: int | None = None
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)
    role: str | None = None

class TimelineEvent(BaseModel):
    date: str | None = None
    event: str
    page: int | None = None
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)

class FinancialItem(BaseModel):
    value: str
    currency: str | None = None
    amount: float | None = None
    context: str = ""
    page: int | None = None
    evidence: str = ""
    confidence: float | None = Field(default=None, ge=0, le=1)

class AnalysisResult(BaseModel):
    status: str = "success"
    document_id: str
    filename: str
    pages: int
    word_count: int
    character_count: int
    language: str
    category: str
    risk_level: str
    risk_score: int
    summary: str
    executive_summary: str
    detailed_summary: str
    entities: list[dict[str, Any]] = Field(default_factory=list)
    findings: list[dict[str, Any]] = Field(default_factory=list)
    clauses: list[dict[str, Any]] = Field(default_factory=list)
    financials: list[dict[str, Any]] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    page_data: list[dict[str, Any]] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
