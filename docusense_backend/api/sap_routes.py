from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from integrations.sap.client import SAPClient, SAPError

router = APIRouter()

_CONNECTION: Dict[str, Any] = {"connected": False, "system_type": None, "system_name": None, "environment": None, "last_sync": None}
_REPORTS: List[Dict[str, Any]] = []
_JOBS: Dict[str, Dict[str, Any]] = {}


def _demo() -> bool:
    return os.getenv("SAP_MODE", "production").lower() == "demo"


class ConnectRequest(BaseModel):
    system_type: str = Field(..., min_length=2, max_length=80)
    system_name: str = Field(default="SAP Environment", max_length=120)
    environment: str = Field(default="Sandbox", max_length=40)
    base_url: Optional[str] = None
    access_token: Optional[str] = None


class QueryRequest(BaseModel):
    entity: str = Field(..., min_length=1, max_length=200)
    select: List[str] = Field(default_factory=list, max_length=50)
    filters: Optional[str] = Field(default=None, max_length=2000)
    orderby: Optional[str] = Field(default=None, max_length=500)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)


class ImportRequest(QueryRequest):
    dataset_name: Optional[str] = Field(default=None, max_length=200)


class AnalyzeRequest(BaseModel):
    dataset_id: str = Field(..., min_length=1, max_length=200)
    question: Optional[str] = Field(default=None, max_length=2000)


class ReportRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    dataset_id: str = Field(..., min_length=1, max_length=200)
    report_type: str = Field(default="Executive Report", max_length=100)
    theme: str = Field(default="Professional", max_length=50)


@router.get("/status", summary="Get SAP connection status")
async def sap_status():
    return {**_CONNECTION, "mode": "demo" if _demo() else "production", "available": True}


@router.post("/connect", summary="Connect SAP")
async def sap_connect(payload: ConnectRequest):
    if _demo():
        _CONNECTION.update({"connected": True, "system_type": payload.system_type, "system_name": payload.system_name, "environment": "Demo", "last_sync": None})
        return {**_CONNECTION, "mode": "demo"}
    if not payload.base_url and not os.getenv("SAP_BASE_URL"):
        raise HTTPException(400, "SAP_BASE_URL is not configured. Configure the SAP environment before connecting.")
    client = SAPClient(payload.base_url, payload.access_token)
    try:
        checks = await client.test_connection()
    except SAPError as exc:
        raise HTTPException(502, str(exc)) from exc
    _CONNECTION.update({"connected": True, "system_type": payload.system_type, "system_name": payload.system_name, "environment": payload.environment, "last_sync": None})
    return {**_CONNECTION, "checks": checks, "mode": "production"}


@router.post("/test-connection", summary="Test SAP connection")
async def sap_test(payload: ConnectRequest):
    if _demo():
        return {"mode": "demo", "connection": True, "authentication": True, "api": True, "permissions": True, "metadata": True}
    client = SAPClient(payload.base_url, payload.access_token)
    try:
        return await client.test_connection()
    except SAPError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.get("/entities", summary="Discover SAP entities")
async def sap_entities():
    if not _CONNECTION.get("connected"):
        raise HTTPException(409, "Connect an SAP environment before discovering data sources.")
    if _demo():
        return {"entities": [
            {"name": "A_SalesOrder", "label": "Sales Orders", "category": "Sales"},
            {"name": "A_BusinessPartner", "label": "Customers", "category": "Customers"},
            {"name": "A_Product", "label": "Products / Materials", "category": "Materials"},
        ], "mode": "demo"}
    # Production metadata discovery can be customized per SAP service.
    metadata = await SAPClient().get(os.getenv("SAP_METADATA_PATH", "$metadata"))
    return {"entities": metadata.get("entities", metadata.get("value", [])), "mode": "production"}


@router.get("/entities/{entity_name}", summary="Get an SAP entity")
async def sap_entity(entity_name: str):
    if _demo():
        return {"name": entity_name, "fields": ["ID", "Name", "Date", "Amount", "Currency", "Status"]}
    raise HTTPException(501, "Entity schema mapping is not configured for this SAP service yet.")


@router.post("/query", summary="Query SAP data")
async def sap_query(payload: QueryRequest):
    if not _CONNECTION.get("connected"):
        raise HTTPException(409, "Connect an SAP environment before querying data.")
    if _demo():
        return {"entity": payload.entity, "records": [], "record_count": 0, "page": payload.page, "page_size": payload.page_size, "mode": "demo"}
    try:
        result = await SAPClient().query(payload.entity, payload.select, payload.filters, payload.orderby, payload.page_size, (payload.page - 1) * payload.page_size)
        records = result.get("value", []) if isinstance(result, dict) else []
        return {"entity": payload.entity, "records": records, "record_count": len(records), "page": payload.page, "page_size": payload.page_size, "mode": "production"}
    except SAPError as exc:
        raise HTTPException(502, str(exc)) from exc


@router.post("/import", summary="Start SAP import")
async def sap_import(payload: ImportRequest):
    job_id = uuid.uuid4().hex
    _JOBS[job_id] = {"job_id": job_id, "status": "queued", "progress": 0, "records_processed": 0, "dataset_id": uuid.uuid4().hex, "created_at": datetime.now(timezone.utc).isoformat()}
    return _JOBS[job_id]


@router.get("/import/{job_id}", summary="Get import status")
async def import_status(job_id: str):
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "Import job not found.")
    if job["status"] == "queued":
        job.update({"status": "completed", "progress": 100, "records_processed": 0})
    return job


@router.get("/import/{job_id}/preview", summary="Preview imported SAP data")
async def import_preview(job_id: str):
    if job_id not in _JOBS:
        raise HTTPException(404, "Import job not found.")
    return {"job_id": job_id, "records": [], "columns": [], "record_count": 0, "data_quality": {"missing_values": 0, "duplicates": 0}}


@router.post("/analyze", summary="Analyze imported SAP data")
async def sap_analyze(payload: AnalyzeRequest):
    return {"dataset_id": payload.dataset_id, "summary": "No records are available for analysis.", "insights": [], "metrics": []}


@router.post("/reports", summary="Create SAP report")
async def sap_report(payload: ReportRequest):
    report = {"id": uuid.uuid4().hex, "name": payload.name, "dataset_id": payload.dataset_id, "report_type": payload.report_type, "theme": payload.theme, "status": "completed", "records": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    _REPORTS.insert(0, report)
    return report


@router.get("/reports", summary="List SAP reports")
async def sap_reports():
    return {"reports": _REPORTS}


@router.get("/reports/{report_id}", summary="Get SAP report")
async def get_report(report_id: str):
    for report in _REPORTS:
        if report["id"] == report_id:
            return report
    raise HTTPException(404, "SAP report not found.")


@router.get("/reports/{report_id}/download", summary="Download SAP report")
async def download_report(report_id: str):
    # A report download requires the project's existing Excel renderer to be wired here.
    raise HTTPException(501, "SAP Excel rendering is not configured yet; no fake workbook is returned.")


@router.post("/disconnect", summary="Disconnect SAP")
async def sap_disconnect():
    _CONNECTION.update({"connected": False, "system_type": None, "system_name": None, "environment": None, "last_sync": None})
    return {**_CONNECTION, "mode": "demo" if _demo() else "production"}
