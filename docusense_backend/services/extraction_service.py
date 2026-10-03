from __future__ import annotations

import re
from typing import Any

from services.legacy_engine import (
    detect_tags, extract_entities, extract_sections, extract_deadlines,
    extract_action_items, extract_obligations, build_document_summary,
    build_smart_extraction, text_sentiment, readability_score, build_confidence,
    extract_keywords_tfidf, extract_key_phrases, extract_key_sentences,
)
from utils.text import language, normalize_text, word_count, sentence_split

class ExtractionService:
    """Compatibility-preserving extraction facade around the existing deterministic engine."""
    def extract(self, text: str, pages: list[dict[str, Any]]) -> dict[str, Any]:
        text = normalize_text(text)
        tags, category, category_description = detect_tags(text)
        entities = self._add_evidence(extract_entities(text), text, pages)
        sections = extract_sections(text)
        deadlines = extract_deadlines(text)
        actions = extract_action_items(text)
        obligations = extract_obligations(text)
        risk_level, findings = self._legacy_risk(text)
        summary = build_document_summary(text, category, risk_level, entities, findings, deadlines, obligations)
        smart = build_smart_extraction(text, entities, findings, deadlines, obligations)
        return {
            "status":"success", "language":language(text), "word_count":word_count(text),
            "character_count":len(text), "tags":tags, "category":category,
            "category_description":category_description, "entities":entities,
            "people":[x["value"] for x in entities if x.get("type")=="person"],
            "organizations":[x["value"] for x in entities if x.get("type")=="organization"],
            "sections":sections, "deadlines":deadlines, "action_items":actions,
            "obligations":obligations, "sentiment":text_sentiment(text),
            "readability":{"score":readability_score(text)}, "findings":findings,
            "risk_level":risk_level,
            "risk_score":sum(int(x.get("score_contribution",0)) for x in findings),
            "confidence":build_confidence(text,tags,entities),
            "summary":summary["executive_summary"], "executive_summary":summary["executive_summary"],
            "detailed_summary":summary["detailed_summary"], "summary_sections":summary["section_summaries"],
            "page_summaries":summary["page_summaries"], "key_takeaways":summary["key_takeaways"],
            "important_facts":summary["important_facts"], "decisions":summary["decisions"],
            "review_questions":summary["review_questions"], "smart_extraction":smart,
        }

    @staticmethod
    def _legacy_risk(text: str):
        from services.legacy_engine import analyze_risk
        return analyze_risk(text)

    def _add_evidence(self, entities: list[dict[str,Any]], text: str, pages: list[dict[str,Any]]) -> list[dict[str,Any]]:
        for entity in entities:
            value=str(entity.get("value", ""))
            page_no, evidence = self._locate(value,pages)
            entity["page"] = page_no
            entity["evidence"] = evidence
            if "confidence" not in entity:
                entity["confidence"] = 0.85 if page_no else 0.55
        return entities

    @staticmethod
    def _locate(needle: str,pages:list[dict[str,Any]]) -> tuple[int|None,str]:
        if not needle: return None,""
        for page in pages:
            text=page.get("text","")
            match=re.search(re.escape(needle),text,re.I)
            if match:
                return page.get("page"), re.sub(r"\s+"," ",text[max(0,match.start()-160):match.end()+240]).strip()
        return None,""

    def smart_extract(self,text:str,top_keywords:int=15,top_sentences:int=8)->dict[str,Any]:
        keywords=extract_keywords_tfidf(text,top_keywords)
        return {
            "tldr":" ".join(x["sentence"] for x in extract_key_sentences(text,keywords,3)),
            "keywords":keywords,
            "key_phrases":extract_key_phrases(text,top_keywords),
            "key_sentences":extract_key_sentences(text,keywords,top_sentences),
            "critical_numbers":list(dict.fromkeys(re.findall(r"\b\d[\d,]*(?:\.\d+)?%?\b",text)))[:15],
        }
