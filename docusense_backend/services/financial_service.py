from __future__ import annotations
import re
from collections import defaultdict
from typing import Any
from services.entity_service import MONEY_RE

class FinancialService:
    def extract(self,pages:list[dict[str,Any]])->list[dict[str,Any]]:
        items=[]
        for page in pages:
            text=page.get("text","") or ""
            for match in MONEY_RE.finditer(text):
                amount=float(match.group("amount").replace(",","").replace(" ",""))
                evidence=text[max(0,match.start()-120):min(len(text),match.end()+180)].strip()
                items.append({"value":match.group(0).strip(),"currency":match.group("currency").upper(),"amount":amount,"page":page.get("page"),"evidence":re.sub(r"\s+"," ",evidence),"confidence":0.94})
        return items[:1000]
    def totals(self,items:list[dict[str,Any]])->dict[str,float]:
        totals=defaultdict(float)
        for item in items:
            if isinstance(item.get("amount"),(int,float)): totals[str(item.get("currency") or "UNKNOWN")]+=item["amount"]
        return dict(totals)
