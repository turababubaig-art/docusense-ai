from __future__ import annotations
from collections import Counter
from typing import Any

class AnalyticsService:
    def summarize(self,records:list[dict[str,Any]])->dict[str,Any]:
        analyses=[x.get("analysis",{}) for x in records]
        return {"document_count":len(records),"total_words":sum(int(x.get("word_count",0) or 0) for x in analyses),"total_pages":sum(int(x.get("pages",0) or 0) for x in analyses),"categories":dict(Counter(x.get("category","General document") for x in analyses)),"risk_levels":dict(Counter(x.get("risk_level","Unknown") for x in analyses)),"languages":dict(Counter(x.get("language","Unknown") for x in analyses))}
