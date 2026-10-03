from __future__ import annotations
from fastapi import APIRouter, Query, Request, HTTPException
router=APIRouter(tags=["search"])
@router.get("/documents/{document_id}/search",summary="Search inside a document")
async def document_search(document_id:str,request:Request,q:str=Query(...,min_length=1,max_length=500),limit:int=Query(10,ge=1,le=100)):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    pages=record.get("analysis",{}).get("page_data",[])
    chunks=[{"document_id":document_id,"page_start":p.get("page"),"page_end":p.get("page"),"text":p.get("text","")} for p in pages]
    return {"status":"success","document_id":document_id,"query":q,"results":request.app.state.search_service.keyword_search(chunks,q,limit)}
@router.get("/search",summary="Search all documents")
async def global_search(request:Request,q:str=Query(...,min_length=1,max_length=500),limit:int=Query(20,ge=1,le=100)):
    results=[]
    for record in request.app.state.repository.list_documents(limit=500):
        a=record.get("analysis",{}); chunks=[{"text":a.get("summary","")+" "+" ".join(a.get("key_points",[])),"document_id":record.get("id")}]
        hits=request.app.state.search_service.keyword_search(chunks,q,1)
        if hits: results.append({"document_id":record.get("id"),"filename":record.get("filename"),"score":hits[0]["score"],"category":a.get("category"),"risk_level":a.get("risk_level")})
    results.sort(key=lambda x:(-x["score"],x["filename"])); return {"status":"success","query":q,"results":results[:limit]}
