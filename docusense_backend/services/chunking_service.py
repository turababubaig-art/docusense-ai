from __future__ import annotations
import re
import uuid
from typing import Any
from utils.text import word_count, sentence_split

class ChunkingService:
    def __init__(self,size:int=1000,overlap:int=150):
        self.size=max(100,size); self.overlap=max(0,min(overlap,size-1))

    def chunk_pages(self,document_id:str,pages:list[dict[str,Any]])->list[dict[str,Any]]:
        chunks=[]
        for page in pages:
            text=page.get("text","").strip()
            if not text: continue
            sentences=sentence_split(text) or [text]
            current=[]; current_words=0
            for sentence in sentences:
                words=sentence.split()
                if current and current_words+len(words)>self.size:
                    chunks.append(self._make(document_id,current,page["page"],page["page"]))
                    overlap=[]; overlap_words=0
                    for prior in reversed(current):
                        pwords=prior.split()
                        if overlap_words+len(pwords)>self.overlap: break
                        overlap.insert(0,prior); overlap_words+=len(pwords)
                    current=overlap+[sentence]; current_words=overlap_words+len(words)
                else:
                    current.append(sentence); current_words+=len(words)
            if current: chunks.append(self._make(document_id,current,page["page"],page["page"]))
        return chunks

    def _make(self,document_id:str,sentences:list[str],start:int,end:int)->dict[str,Any]:
        text=" ".join(sentences).strip()
        return {"document_id":document_id,"chunk_id":uuid.uuid4().hex,"page_start":start,"page_end":end,"text":text,"token_count":len(text.split()),"metadata":{"words":word_count(text)}}
