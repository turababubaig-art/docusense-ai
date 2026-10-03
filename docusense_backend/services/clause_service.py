from __future__ import annotations
import re
from typing import Any

CLAUSES={
 "confidentiality":r"confidential(?:ity)?|non[- ]disclosure|trade secret",
 "termination":r"terminat(?:e|ion)|cancel(?:lation)?|notice period",
 "payment":r"payment|invoice|fee|price|amount due|late fee|interest",
 "liability":r"liabilit(?:y|ies)|limitation of liability|liable",
 "indemnification":r"indemnif(?:y|ication)|hold harmless",
 "renewal":r"renew(?:al|s|ed)|auto[- ]renew|automatic renewal",
 "intellectual_property":r"intellectual property|copyright|trademark|patent|license|ownership of work",
 "data_protection":r"personal data|personal information|privacy|gdpr|data protection|processor|controller",
 "governing_law":r"governing law|jurisdiction|venue|laws of",
 "dispute_resolution":r"arbitration|mediation|dispute resolution|court proceedings",
 "non_compete":r"non[- ]compete|non[- ]competition|restrictive covenant",
 "non_solicitation":r"non[- ]solicit|non[- ]solicitation|solicit employees|solicit clients",
 "force_majeure":r"force majeure|act of god|unforeseeable event",
 "audit":r"audit|inspection rights|books and records",
 "insurance":r"insurance|insured|coverage|certificate of insurance",
 "warranty":r"warrant(?:y|ies)|warrants|guarantee|guarantees",
}

class ClauseService:
    def extract(self,pages:list[dict[str,Any]])->list[dict[str,Any]]:
        result=[]
        for page in pages:
            sentences=re.split(r"(?<=[.!?])\s+",page.get("text","") or "")
            for sentence in sentences:
                clean=re.sub(r"\s+"," ",sentence).strip()
                if not clean: continue
                for typ,pattern in CLAUSES.items():
                    if re.search(pattern,clean,re.I):
                        result.append({"type":typ,"title":typ.replace("_"," ").title(),"text":clean[:2000],"page":page.get("page"),"confidence":0.88,"risk_level":self._risk(typ)})
                        break
        seen=set(); out=[]
        for item in result:
            key=(item["type"],item["page"],item["text"].lower())
            if key not in seen: seen.add(key); out.append(item)
        return out[:500]
    @staticmethod
    def _risk(typ:str)->str:
        if typ in {"liability","indemnification","non_compete","non_solicitation","renewal"}: return "Medium"
        return "Low"
