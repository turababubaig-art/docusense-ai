from __future__ import annotations
from fastapi import APIRouter, HTTPException, Request
from models.document import DocumentMetadata
from pydantic import BaseModel, Field
class CompareRequest(BaseModel): document_ids:list[str]=Field(...,min_length=2,max_length=10)
router=APIRouter(tags=["comparison"])
@router.post("/compare",summary="Compare multiple documents")
async def compare(payload:CompareRequest,request:Request):
    records=[request.app.state.repository.get_document(x) for x in payload.document_ids]
    records=[x for x in records if x]
    if len(records)<2: raise HTTPException(404,"At least two requested documents must exist to compare them.")
    return {"status":"success","document_count":len(records),"comparison":request.app.state.comparison_service.compare(records)}
@router.post("/documents/compare",summary="Compare multiple documents")
async def compare_documents(payload:CompareRequest,request:Request): return await compare(payload,request)
