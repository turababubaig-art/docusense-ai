from __future__ import annotations
import time
from typing import Any
from services.document_service import DocumentService
from services.extraction_service import ExtractionService
from services.risk_service import RiskService
from services.clause_service import ClauseService
from services.entity_service import EntityService
from services.timeline_service import TimelineService
from services.financial_service import FinancialService
from services.chunking_service import ChunkingService
from utils.files import sha256_file

class AnalysisService:
    def __init__(self,document_service,extraction,risk,clauses,entities,timeline,financials,chunking):
        self.documents=document_service; self.extraction=extraction; self.risk=risk; self.clauses=clauses; self.entities=entities; self.timeline=timeline; self.financials=financials; self.chunking=chunking
    def analyze_path(self,path,document_id,filename,size_bytes):
        started=time.perf_counter(); pages_count,text,pages=self.documents.extract(path)
        base=self.extraction.extract(text,pages)
        risk=self.risk.analyze(pages)
        clauses=self.clauses.extract(pages)
        entities=self.entities.extract(pages)
        timeline=self.timeline.extract(pages)
        financials=self.financials.extract(pages)
        base["findings"]=risk["findings"]; base["risk_level"]=risk["risk_level"]; base["risk_score"]=risk["risk_score"]
        base["clauses"]=clauses; base["financials"]=financials; base["timeline"]=timeline
        base["entities"]=entities
        base["people"]=[x["value"] for x in entities if x.get("type")=="person"]
        base["organizations"]=[x["value"] for x in entities if x.get("type")=="organization"]
        base.update({"document_id":document_id,"filename":filename,"pages":pages_count,"size_bytes":size_bytes,"page_data":pages,"processing_ms":round((time.perf_counter()-started)*1000,2),"analysis_engine":"modular-rules-v6","chunks":self.chunking.chunk_pages(document_id,pages)})
        base["advanced_intelligence"]={"clause_intelligence":clauses,"financials":financials,"dates_detected":[x.get("date") for x in timeline if x.get("date")],"document_health":{"risk_level":risk["risk_level"],"score":max(0,100-risk["risk_score"])}}
        return base
