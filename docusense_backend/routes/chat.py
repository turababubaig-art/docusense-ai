from __future__ import annotations
from fastapi import APIRouter, HTTPException, Request
from models.chat import ChatRequest
router=APIRouter(tags=["chat"])
@router.post("/chat",summary="Ask a question using document evidence")
async def chat(request:Request,payload:ChatRequest):
    record=None
    if payload.document_id:
        record=request.app.state.repository.get_document(payload.document_id)
        if not record: raise HTTPException(404,"Document not found.")
    try:return await request.app.state.chat_service.ask(payload.question,record,payload.context)
    except ValueError as exc: raise HTTPException(422,str(exc)) from exc
@router.post("/documents/{document_id}/ask",summary="Ask a specific document")
async def ask_document(document_id:str,payload:ChatRequest,request:Request):
    payload.document_id=document_id; return await chat(request,payload)
@router.post("/ai/enrich/{document_id}",summary="AI enrichment of an existing analysis")
async def enrich(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    if not request.app.state.ai.available: return {"status":"error","mode":"provider_unavailable","message":"AI provider is not configured."}
    context=str(record.get("analysis",{}))[:request.app.state.settings.max_context_chars]
    try: result=await request.app.state.ai.structured_analysis(context); return {"status":"success","mode":"ai","data":result}
    except Exception as exc: raise HTTPException(502,"AI enrichment failed.") from exc
