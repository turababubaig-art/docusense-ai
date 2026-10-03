from pathlib import Path
from config import Settings
from services.document_service import DocumentService

def test_text_extraction(tmp_path:Path):
    p=tmp_path/"sample.txt"; p.write_text("Hello document. Payment is due in 30 days.",encoding="utf-8")
    pages,text,data=DocumentService(Settings(upload_dir=tmp_path)).extract(p)
    assert pages==1 and "Payment" in text and data[0]["page"]==1
