from __future__ import annotations
import math
import re
from collections import Counter
from typing import Any

class VectorSearchService:
    """Hybrid search implementation. Uses lexical scoring by default and accepts embeddings when supplied by a production vector store."""
    def keyword_search(self,chunks:list[dict[str,Any]],query:str,limit:int=10)->list[dict[str,Any]]:
        terms=[t.lower() for t in re.findall(r"\w+",query) if len(t)>2]
        scored=[]
        for chunk in chunks:
            text=chunk.get("text",""); words=re.findall(r"\w+",text.lower()); counts=Counter(words)
            overlap=sum(1 for t in terms if t in counts); frequency=sum(counts[t] for t in terms)
            if overlap: scored.append((overlap*3+frequency,chunk))
        scored.sort(key=lambda x:(-x[0],len(x[1].get("text", ""))))
        return [{"score":float(score),**chunk} for score,chunk in scored[:limit]]

    @staticmethod
    def cosine(a:list[float],b:list[float])->float:
        if not a or not b or len(a)!=len(b): return 0.0
        dot=sum(x*y for x,y in zip(a,b)); na=math.sqrt(sum(x*x for x in a)); nb=math.sqrt(sum(y*y for y in b))
        return dot/(na*nb) if na and nb else 0.0
