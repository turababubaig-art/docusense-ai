from __future__ import annotations
from pathlib import Path
from config import Settings

class StorageService:
    """Local object storage adapter. The interface is intentionally compatible with future S3/R2/Supabase adapters."""
    def __init__(self,settings:Settings): self.settings=settings; self.root=settings.upload_dir
    def path_for(self,document_id:str,extension:str)->Path: return self.root/f"{document_id}{extension}"
    def delete(self,path:Path)->None: path.unlink(missing_ok=True)
