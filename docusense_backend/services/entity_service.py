from __future__ import annotations
import re
from typing import Any

MONEY_RE=re.compile(r"(?P<currency>USD|EUR|GBP|PKR|INR|AED|SAR|CAD|AUD|\$|€|£|₨|Rs\.?)\s*(?P<amount>\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)",re.I)
DATE_RE=re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b",re.I)
EMAIL_RE=re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",re.I)
PHONE_RE=re.compile(r"(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)")
URL_RE=re.compile(r"\bhttps?://[^\s<>()]+",re.I)
ORG_RE=re.compile(r"\b([A-Z][A-Za-z0-9&.' -]{2,80}\s+(?:LLC|LTD|LIMITED|INC|INCORPORATED|CORPORATION|CORP\.?|PLC))\b")
PERSON_RE=re.compile(r"\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+([A-Z][a-z]{1,30}(?:\s+[A-Z][a-z]{1,30}){0,3})")

class EntityService:
    def extract(self,pages:list[dict[str,Any]])->list[dict[str,Any]]:
        out=[]; seen=set()
        for page in pages:
            text=page.get("text","") or ""; number=page.get("page")
            patterns=[("email",EMAIL_RE),("phone",PHONE_RE),("url",URL_RE),("money",MONEY_RE),("date",DATE_RE),("organization",ORG_RE),("person",PERSON_RE)]
            for typ,rx in patterns:
                for match in rx.finditer(text):
                    value=match.group(0).strip(); key=(typ,value.lower(),number)
                    if key in seen: continue
                    seen.add(key)
                    evidence=text[max(0,match.start()-100):min(len(text),match.end()+180)].strip()
                    item={"type":typ,"value":value,"page":number,"evidence":re.sub(r"\s+"," ",evidence),"confidence":0.9}
                    if typ=="money": item.update({"currency":match.group("currency"),"amount":float(match.group("amount").replace(",","").replace(" ",""))})
                    if typ=="person": item["value"]=match.group(1)
                    out.append(item)
        return out[:1000]
