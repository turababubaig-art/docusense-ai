from __future__ import annotations
import re
from typing import Any

PATTERNS={
 "Critical":["unlimited liability","uncapped liability","unlimited damages","personal guarantee","confession of judgment","no liability cap","joint and several liability","waives the right to sue"],
 "High":["liquidated damages","indemnify and hold harmless","termination fee","automatic renewal","non-compete","non compete","exclusivity","binding arbitration","class action waiver","jury trial waiver","sole discretion","late payment interest","default interest","non-refundable","no refund","irrevocable"],
 "Medium":["late fee","interest rate","notice period","confidentiality","non-solicitation","governing law","jurisdiction","termination","renewal","indemnification","payment terms","material breach","audit rights","insurance","warranty","service level","delivery deadline"],
}

class RiskService:
    def analyze(self,pages:list[dict[str,Any]])->dict[str,Any]:
        findings=[]; score=0; weights={"Critical":45,"High":22,"Medium":9}
        for page in pages:
            text=re.sub(r"\s+"," ",page.get("text","")).strip(); lower=text.lower()
            for level,phrases in PATTERNS.items():
                for phrase in phrases:
                    matches=list(re.finditer(re.escape(phrase),lower))
                    if not matches: continue
                    score+=min(weights[level]*len(matches),weights[level]*4)
                    m=matches[0]; evidence=text[max(0,m.start()-180):min(len(text),m.end()+300)].strip()
                    findings.append({"level":level,"type":"risk_signal","keyword":phrase,"count":len(matches),"weight":weights[level],"score_contribution":min(weights[level]*len(matches),weights[level]*4),"text":f"{level}-risk language detected: {phrase}.","context":evidence,"page":page.get("page"),"evidence":evidence,"confidence":0.9,"source":"deterministic"})
        lower_all=" ".join(p.get("text","") for p in pages).lower()
        missing=[("liability cap","No clear liability cap detected."),("governing law","No governing-law provision detected."),("termination","No clear termination or cancellation provision detected.")]
        for term,msg in missing:
            if term not in lower_all and (term!="liability cap" or "liability" in lower_all):
                findings.append({"level":"Medium","type":"missing_protection","keyword":term,"count":1,"weight":9,"score_contribution":9,"text":msg,"context":"","page":None,"evidence":"","confidence":0.65,"source":"deterministic"}); score+=9
        critical=any(x["level"]=="Critical" for x in findings); high=sum(x["level"]=="High" for x in findings)
        risk="High" if critical or high>=3 or score>=65 else "Medium" if high or score>=22 else "Low"
        findings.sort(key=lambda x:( {"Critical":4,"High":3,"Medium":2,"Low":1}.get(x["level"],0),-x.get("count",0)),reverse=True)
        return {"risk_level":risk,"risk_score":min(100,score),"findings":findings}
