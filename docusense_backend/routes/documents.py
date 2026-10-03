from __future__ import annotations
import hashlib
from datetime import datetime,timezone
from pathlib import Path
from typing import Any
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Query, UploadFile, Request
from fastapi.responses import FileResponse
from utils.files import save_upload
from utils.security import optional_user

router=APIRouter(prefix="/documents",tags=["documents"])

def now(): return datetime.now(timezone.utc).isoformat()

async def _process(request:Request,path:Path,filename:str,size:int,digest:str,mime:str,document_id:str,user_id:str|None):
    try:
        analysis=await request.app.state.analysis_runner(path,document_id,filename,size)
        record={"id":document_id,"user_id":user_id,"filename":filename,"original_filename":filename,"extension":path.suffix.lower(),"mime_type":mime,"size_bytes":size,"sha256":digest,"status":"completed","analysis":analysis,"created_at":now(),"updated_at":now()}
        request.app.state.repository.save_document(record)
        return record
    finally: path.unlink(missing_ok=True)

@router.post("",summary="Upload a document and queue analysis")
async def create_document(request:Request,file:UploadFile=File(...)):
    path,filename,size,digest,mime,document_id=await save_upload(file,request.app.state.settings)
    job_id=hashlib.sha256(f"{document_id}:{now()}".encode()).hexdigest()[:32]
    job={"job_id":job_id,"document_id":document_id,"user_id":None,"status":"queued","progress":0,"stage":"queued","error":None,"created_at":now(),"updated_at":now()}
    request.app.state.repository.save_job(job)
    async def work():
        job.update({"progress":10,"stage":"extracting","updated_at":now()}); request.app.state.repository.save_job(job)
        await _process(request,path,filename,size,digest,mime,document_id,None)
        job.update({"status":"completed","progress":100,"stage":"completed","updated_at":now()}); request.app.state.repository.save_job(job)
    request.app.state.task_manager.submit(job,work)
    return {"status":"queued","document_id":document_id,"job_id":job_id,"filename":filename}

@router.get("",summary="List documents")
async def list_documents(request:Request,category:str|None=None,risk_level:str|None=None,q:str|None=Query(None,max_length=200),limit:int=Query(50,ge=1,le=200)):
    records=request.app.state.repository.list_documents(limit=limit)
    out=[]
    for r in records:
        a=r.get("analysis",{})
        if category and a.get("category","").lower()!=category.lower(): continue
        if risk_level and a.get("risk_level","").lower()!=risk_level.lower(): continue
        hay=f"{r.get('filename','')} {a.get('summary','')} {' '.join(a.get('tags',[]))}".lower()
        if q and q.lower() not in hay: continue
        out.append({"document_id":r.get("id"),"filename":r.get("filename"),"created_at":r.get("created_at"),"category":a.get("category"),"risk_level":a.get("risk_level"),"confidence":a.get("confidence"),"pages":a.get("pages"),"word_count":a.get("word_count"),"tags":a.get("tags",[])})
    return {"status":"success","count":len(out),"documents":out}

@router.get("/{document_id}",summary="Get a document")
async def get_document(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    return {"status":"success","document":record}

@router.get("/{document_id}/stats",summary="Get document statistics")
async def stats(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    a=record.get("analysis",{}); return {"status":"success","document_id":document_id,"statistics":{"pages":a.get("pages",0),"words":a.get("word_count",0),"characters":a.get("character_count",0),"sections":len(a.get("sections",[])),"entities":len(a.get("entities",[])),"risk_findings":len(a.get("findings",[])),"deadlines":len(a.get("timeline",a.get("deadlines",[]))),"obligations":len(a.get("obligations",[]))}}

@router.post("/{document_id}/reanalyze",summary="Re-run deterministic analysis")
async def reanalyze(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    a=record.get("analysis",{}); pages=a.get("page_data",[])
    if not pages: raise HTTPException(422,"Original extracted text is not available for re-analysis.")
    refreshed=await request.app.state.analysis_from_pages(document_id,record.get("filename","document"),a.get("size_bytes",0),pages)
    record["analysis"]=refreshed; record["updated_at"]=now(); request.app.state.repository.save_document(record)
    return {"status":"success","analysis":refreshed}
