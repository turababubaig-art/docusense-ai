from __future__ import annotations
from pathlib import Path
from fastapi import APIRouter,HTTPException,Request
from fastapi.responses import FileResponse
router=APIRouter(tags=["exports"])
async def create_risk_report(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document analysis not found.")
    path=request.app.state.settings.upload_dir/"reports"/f"{Path(record.get('filename','document')).stem}_risk_report_{document_id}.xlsx"
    request.app.state.export_service.risk_report(record.get("analysis",{}),path)
    return FileResponse(path,filename=path.name,media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
@router.post("/analyze/{document_id}/risk-report",summary="Generate an Excel risk report")
async def risk_report(document_id:str,request:Request): return await create_risk_report(document_id,request)
@router.get("/documents/{document_id}/export/xlsx",summary="Export document analysis as Excel")
async def export_xlsx(document_id:str,request:Request): return await create_risk_report(document_id,request)
