from __future__ import annotations
import re
from datetime import datetime
from typing import Any

DATE_RE=re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b",re.I)

class TimelineService:
    def extract(self,pages:list[dict[str,Any]])->list[dict[str,Any]]:
        events=[]
        for page in pages:
            text=page.get("text","") or ""
            for sentence in re.split(r"(?<=[.!?])\s+",text):
                clean=re.sub(r"\s+"," ",sentence).strip()
                if not clean: continue
                dates=list(DATE_RE.finditer(clean))
                deadline=re.search(r"\b(?:within|due|deadline|expires?|expiration|by|before|renew(?:al)?)\b[^.!?\n]{0,120}",clean,re.I)
                if not dates and not deadline: continue
                date=dates[0].group(0) if dates else None
                events.append({"date":date,"event":clean[:1000],"page":page.get("page"),"evidence":clean[:1000],"confidence":0.88 if date else 0.7})
        return self._sort(events)
    @staticmethod
    def _sort(events):
        def key(item):
            value=item.get("date") or "9999-12-31"
            for fmt in ("%Y-%m-%d","%m/%d/%Y","%d/%m/%Y","%B %d, %Y"):
                try:return datetime.strptime(value,fmt)
                except ValueError: pass
            return datetime.max
        return sorted(events,key=key)[:500]
