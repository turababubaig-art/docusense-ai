from __future__ import annotations
from pathlib import Path
from typing import Any
from services.document_service import DocumentService

class DOCXService:
    def __init__(self,document_service:DocumentService): self.document_service=document_service
    def extract(self,path:Path)->tuple[int,str,list[dict[str,Any]]]: return self.document_service.extract_docx(path)
