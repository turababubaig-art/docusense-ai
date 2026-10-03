from __future__ import annotations
from typing import Any
from fastapi import APIRouter, File, HTTPException, UploadFile, Request
from utils.files import save_upload
from routes.documents import now

router=APIRouter(tags=["analysis"])

@router.post("/upload",summary="Extract a document without persisting analysis")
async def upload_compat(request:Request,file:UploadFile=File(...)):
    path,filename,size,digest,mime,document_id=await save_upload(file,request.app.state.settings)
    try:
        pages,text,page_data=request.app.state.document_service.extract(path)
        return {"status":"success","document_id":document_id,"filename":filename,"size_bytes":size,"sha256":digest,"pages":pages,"characters":len(text),"words":len(text.split()),"language":request.app.state.text_language(text),"preview":text[:5000],"page_data":page_data}
    finally:path.unlink(missing_ok=True)

@router.post("/analyze",summary="Analyze a document synchronously for frontend compatibility")
async def analyze(request:Request,file:UploadFile=File(...)):
    path,filename,size,digest,mime,document_id=await save_upload(file,request.app.state.settings)
    try:
        result=await request.app.state.analysis_runner(path,document_id,filename,size)
        result.update({"document_id":document_id,"size_bytes":size,"sha256":digest,"mime_type":mime})
        record={"id":document_id,"user_id":None,"filename":filename,"original_filename":filename,"extension":path.suffix.lower(),"mime_type":mime,"size_bytes":size,"sha256":digest,"status":"completed","analysis":result,"created_at":now(),"updated_at":now()}
        request.app.state.repository.save_document(record)
        return result
    finally:path.unlink(missing_ok=True)

@router.post("/analyze/batch",summary="Analyze a batch of documents")
async def batch(request:Request,files:list[UploadFile]=File(...)):
    if not files: raise HTTPException(400,"No files supplied.")
    if len(files)>request.app.state.settings.max_batch_files: raise HTTPException(413,"Maximum batch size exceeded.")
    async def worker(upload):
        path,filename,size,digest,mime,document_id=await save_upload(upload,request.app.state.settings)
        try:
            result=await request.app.state.analysis_runner(path,document_id,filename,size)
            record={"id":document_id,"user_id":None,"filename":filename,"original_filename":filename,"extension":path.suffix.lower(),"mime_type":mime,"size_bytes":size,"sha256":digest,"status":"completed","analysis":result,"created_at":now(),"updated_at":now()}
            request.app.state.repository.save_document(record)
            return {"status":"success","filename":filename,"analysis":result}
        except Exception as exc:return {"status":"error","filename":filename,"error":str(exc)}
        finally:path.unlink(missing_ok=True)
    return {"status":"success","count":len(files),"results":await request.app.state.batch_service.run(files,worker)}

@router.post("/analyze/{document_id}/risk-report",summary="Legacy risk report route")
async def risk_report_legacy(document_id:str,request:Request):
    from routes.exports import create_risk_report
    return await create_risk_report(document_id,request)

@router.get("/documents/{document_id}/intelligence",summary="Get advanced document intelligence")
async def intelligence(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    return {"status":"success","document_id":document_id,"filename":record.get("filename"),"intelligence":record.get("analysis",{}).get("advanced_intelligence",{})}

@router.get("/documents/{document_id}/timeline",summary="Get timeline")
async def timeline(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    return {"status":"success","document_id":document_id,"timeline":record.get("analysis",{}).get("timeline",[]) }

@router.get("/documents/{document_id}/clauses",summary="Get clauses")
async def clauses(document_id:str,request:Request,clause_type:str|None=None):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    values=record.get("analysis",{}).get("clauses",[])
    if clause_type: values=[x for x in values if x.get("type","").lower()==clause_type.lower()]
    return {"status":"success","document_id":document_id,"clauses":values}

@router.get("/documents/{document_id}/financials",summary="Get financial extraction")
async def financials(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    values=record.get("analysis",{}).get("financials",[])
    return {"status":"success","document_id":document_id,"financial_mentions":values,"totals_by_currency":request.app.state.financial_service.totals(values)}

@router.get("/documents/{document_id}/review",summary="Get review package")
async def review(document_id:str,request:Request):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    a=record.get("analysis",{}); return {"status":"success","document_id":document_id,"review_priority":"Immediate" if a.get("risk_level")=="High" else "Normal","health":a.get("advanced_intelligence",{}).get("document_health"),"critical_findings":[x for x in a.get("findings",[]) if x.get("level") in {"Critical","High"}],"recommendations":[f"Verify missing information: {x}" for x in a.get("missing_information",[])]}

@router.get("/documents/{document_id}/smart-extract",summary="Extract the most important local signals")
async def smart_extract(document_id:str,request:Request,top_keywords:int=15,top_sentences:int=8):
    record=request.app.state.repository.get_document(document_id)
    if not record: raise HTTPException(404,"Document not found.")
    a=record.get("analysis",{}); text="\n".join(x.get("text","") for x in a.get("page_data",[])); extraction=request.app.state.extraction_service.smart_extract(text,top_keywords,top_sentences); extraction.update({"top_entities":a.get("entities",[])[:10],"critical_risk_flags":[x.get("text") for x in a.get("findings",[]) if x.get("level") in {"Critical","High"}],"urgent_deadlines":a.get("timeline",[])[:5],"key_obligations":a.get("obligations",[])[:5]}); return {"status":"success","document_id":document_id,"filename":record.get("filename"),"extraction":extraction}
