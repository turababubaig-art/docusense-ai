from __future__ import annotations

import hashlib
import math
from typing import Sequence

class EmbeddingService:
    """Deterministic hashing vectors for local development plus a clean seam for a real embedding API.

    These vectors are explicitly marked local and must not be confused with neural embeddings.
    Production deployments can replace `embed` with an OpenAI/Sentence-Transformers adapter while
    retaining the same interface and pgvector schema.
    """
    def __init__(self,dimensions:int=1536): self.dimensions=dimensions
    def embed(self,text:str)->list[float]:
        vector=[0.0]*self.dimensions
        for token in text.lower().split():
            digest=hashlib.sha256(token.encode("utf-8")).digest()
            index=int.from_bytes(digest[:4],"big")%self.dimensions
            sign=1.0 if digest[4]%2 else -1.0
            vector[index]+=sign
        norm=math.sqrt(sum(x*x for x in vector)) or 1.0
        return [x/norm for x in vector]
    def similarity(self,a:Sequence[float],b:Sequence[float])->float:
        if len(a)!=len(b): return 0.0
        return sum(x*y for x,y in zip(a,b))
