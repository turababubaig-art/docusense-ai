from __future__ import annotations
from pathlib import Path
from typing import Any
from services.document_service import DocumentService

class PDFService:
    """Dedicated PDF facade retained separately so future PDF-specific processing can evolve independently."""
    def __init__(self,document_service:DocumentService): self.document_service=document_service
    def extract(self,path:Path)->tuple[int,str,list[dict[str,Any]]]: return self.document_service.extract_pdf(path)
