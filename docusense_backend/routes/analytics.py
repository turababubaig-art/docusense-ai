from fastapi import APIRouter,Request
router=APIRouter(tags=["analytics"])
@router.get("/analytics",summary="Document analytics")
async def analytics(request:Request): return {"status":"success",**request.app.state.analytics_service.summarize(request.app.state.repository.list_documents(limit=10000))}
@router.get("/metrics",summary="Process metrics")
async def metrics(request:Request): return {"status":"success","documents_cached":len(request.app.state.repository.list_documents(limit=10000)),"rate_limit_per_minute":request.app.state.settings.rate_limit_requests}
@router.get("/system/capabilities",summary="Backend capabilities")
async def capabilities(request:Request):
    s=request.app.state.settings; return {"status":"success","version":s.app_version,"features":{"pdf":True,"docx":True,"ocr":s.ocr_enabled,"supabase":request.app.state.db.available,"ai_provider":request.app.state.ai.available,"semantic_search":False,"hybrid_search":True,"batch_processing":True,"smart_extraction":True,"excel_export":True}}
