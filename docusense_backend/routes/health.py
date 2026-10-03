from fastapi import APIRouter, Request
router=APIRouter(tags=["health"])
@router.get("/",summary="Service root")
async def root(request:Request):
    s=request.app.state.settings; db=request.app.state.db; ai=request.app.state.ai; docs=request.app.state.repository
    return {"status":"online","service":s.app_name,"version":s.app_version,"environment":s.environment,"persistence":"supabase" if db.available else "local-development","ai_provider":ai.provider_name if ai.available else "not-configured","documents_cached":len(docs.list_documents())}
@router.get("/health",summary="Health check")
async def health(request:Request):
    s=request.app.state.settings; db=request.app.state.db; ai=request.app.state.ai
    return {"status":"healthy","service":s.app_name,"version":s.app_version,"timestamp":request.state.timestamp,"checks":{"database":db.available,"ai_provider":ai.available,"ocr":bool(request.app.state.document_service.settings.ocr_enabled),"docx":request.app.state.document_service.__class__.__name__=="DocumentService"}}
@router.get("/api/health",summary="API health check")
async def api_health(request:Request): return await health(request)

@router.get("/config",summary="Public backend capabilities and limits")
async def config(request:Request):
    s=request.app.state.settings
    return {"max_file_size_mb":s.max_file_size_mb,"max_batch_files":s.max_batch_files,"allowed_extensions":sorted(s.extension_set),"ocr_available":s.ocr_enabled,"docx_available":True,"persistence_enabled":request.app.state.db.available,"ai_provider_configured":request.app.state.ai.available,"chunk_size":s.chunk_size,"chunk_overlap":s.chunk_overlap}
