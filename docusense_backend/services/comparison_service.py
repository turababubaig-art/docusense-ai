from __future__ import annotations
from typing import Any

class ComparisonService:
    def compare(self,records:list[dict[str,Any]])->dict[str,Any]:
        docs=[]
        for r in records:
            a=r.get("analysis",{})
            docs.append({"document_id":r.get("id"),"filename":r.get("filename"),"category":a.get("category"),"risk_level":a.get("risk_level"),"risk_score":a.get("risk_score"),"tags":a.get("tags",[]),"parties":a.get("people",[])+a.get("organizations",[]),"financials":a.get("financials",[]) or a.get("advanced_intelligence",{}).get("financials",[]),"clauses":a.get("clauses",[]) or a.get("advanced_intelligence",{}).get("clause_intelligence",[])})
        return {"documents":docs,"added":[],"removed":[],"changed":self._changes(docs),"unchanged":self._common(docs)}
    def _changes(self,docs):
        if len(docs)<2:return []
        base=docs[0]; out=[]
        for other in docs[1:]:
            for field in ("category","risk_level","risk_score","parties"):
                if base.get(field)!=other.get(field): out.append({"field":field,"from":base.get(field),"to":other.get(field),"document_id":other.get("document_id")})
        return out
    def _common(self,docs):
        if not docs:return []
        sets=[set(x.get("tags",[])) for x in docs]
        return sorted(set.intersection(*sets)) if sets else []
