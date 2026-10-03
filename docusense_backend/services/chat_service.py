from __future__ import annotations
import json
from typing import Any
from services.ai_service import AIService, AIProviderError
from services.vector_search_service import VectorSearchService

class ChatService:
    def __init__(self,ai:AIService,search:VectorSearchService): self.ai=ai; self.search=search
    async def ask(self,question:str,record:dict[str,Any]|None,context:str|None=None)->dict[str,Any]:
        if not record and not context: raise ValueError("Provide document_id or context so the question can be answered.")
        chunks=[]
        if record:
            analysis=record.get("analysis",{})
            pages=analysis.get("page_data",[])
            chunks=self.search.keyword_search([{"document_id":record.get("id"),"page_start":p.get("page"),"page_end":p.get("page"),"text":p.get("text","")} for p in pages],question,8)
        evidence="\n\n".join(f"[Page {x.get('page_start')}] {x.get('text','')}" for x in chunks)
        if context: evidence=(evidence+"\n\n"+context).strip()
        citations=[{"page":x.get("page_start"),"evidence":x.get("text","")[:700],"score":x.get("score")} for x in chunks]
        if self.ai.available:
            try:
                result=await self.ai.answer(question,evidence)
                return {"status":"success","question":question,"document_id":record.get("id") if record else None,"mode":"ai","answer":result.get("text") or json.dumps(result,ensure_ascii=False),"citations":citations}
            except AIProviderError as exc:
                return {"status":"error","question":question,"document_id":record.get("id") if record else None,"mode":"provider_error","answer":str(exc),"citations":citations}
        if not chunks:
            return {"status":"success","question":question,"document_id":record.get("id") if record else None,"mode":"local","answer":"I could not find enough evidence in the document.","citations":[]}
        return {"status":"success","question":question,"document_id":record.get("id") if record else None,"mode":"local","answer":"Relevant document evidence was found. Review the cited passages below; no external AI provider is configured.","citations":citations}
