from __future__ import annotations
import logging
from pathlib import Path
from typing import Any

try: import pytesseract
except ImportError: pytesseract=None
try: from PIL import Image
except ImportError: Image=None

logger=logging.getLogger("docusense.ocr")

class OCRUnavailable(RuntimeError): pass
class OCRService:
    def __init__(self,enabled:bool=True,tesseract_path:str|None=None):
        self.enabled=enabled
        if tesseract_path and pytesseract: pytesseract.pytesseract.tesseract_cmd=tesseract_path
    @property
    def available(self)->bool:
        if not self.enabled or not pytesseract or not Image:return False
        try:pytesseract.get_tesseract_version(); return True
        except Exception:return False
    def image_to_text(self,path:Path)->str:
        if not self.available: raise OCRUnavailable("Tesseract OCR is unavailable. Install Tesseract or configure TESSERACT_PATH.")
        try:
            with Image.open(path) as image:return pytesseract.image_to_string(image)
        except Exception as exc: raise OCRUnavailable("OCR processing failed.") from exc
