from __future__ import annotations
import re
from collections import Counter

STOPWORDS = frozenset("a an the and or but if then else when at by for with about against between into through during before after above below to from up down in out on off over under again further once here there all any both each few more most other some such no nor not only own same so than too very can will just don't should now is are was were be been being have has had do does did this that these those i you he she it we they what which who whom as its shall may might must upon per etc via onto within without hereby thereto".split())

def normalize_text(text: str) -> str:
    text = (text or "").replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text or "", flags=re.UNICODE))

def sentence_split(text: str) -> list[str]:
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+", text or "") if x.strip()]

def language(text: str) -> str:
    sample = (text or "")[:10000]
    if not sample.strip(): return "Unknown"
    english = len(re.findall(r"\b(?:the|and|of|to|in|for|with|is|this|that|from|are)\b", sample, re.I))
    if re.search(r"[\u0600-\u06FF]", sample): return "Arabic/Urdu"
    if re.search(r"[\u4E00-\u9FFF]", sample): return "Chinese"
    if re.search(r"[\u3040-\u30FF]", sample): return "Japanese"
    return "English" if english >= 2 else "Unknown"

def context(text: str, needle: str, radius: int = 300) -> str:
    m = re.search(re.escape(needle), text or "", re.I)
    if not m: return ""
    return re.sub(r"\s+", " ", text[max(0, m.start()-radius):m.end()+radius]).strip()

def tfidf_keywords(text: str, top_n: int = 15) -> list[dict]:
    sentences = sentence_split(text)
    tokens = [t for t in re.findall(r"[A-Za-z][A-Za-z'-]{2,}", text.lower()) if t not in STOPWORDS]
    if not tokens: return []
    tf = Counter(tokens); df = Counter()
    for sentence in sentences:
        df.update(set(t for t in re.findall(r"[A-Za-z][A-Za-z'-]{2,}", sentence.lower()) if t not in STOPWORDS))
    import math
    scores = {word: freq * (math.log((len(sentences)+1)/(df[word]+1))+1) for word, freq in tf.items()}
    ranked = sorted(scores.items(), key=lambda x:x[1], reverse=True)[:top_n]
    peak = ranked[0][1] if ranked else 1
    return [{"term":w,"score":round(s,3),"frequency":tf[w],"relevance":round(s/peak,3)} for w,s in ranked]
