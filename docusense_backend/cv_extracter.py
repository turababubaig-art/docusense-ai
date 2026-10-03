
"""Structured CV/resume extraction for DocuSense AI.

This module is deliberately conservative: values are extracted from source text,
not invented. Semantic AI enrichment is handled by main.py so this module can
also run fully offline.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple


EMAIL_RE = re.compile(r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}\b")
URL_RE = re.compile(r"https?://[^\s<>\"]+|www\.[^\s<>\"]+", re.I)
PHONE_RE = re.compile(
    r"(?<!\d)(?:\+\d{1,3}[\s().-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?!\d)"
)

MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9, "oct": 10,
    "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

SECTION_ALIASES = {
    "summary": {"summary", "professional summary", "profile", "about me", "objective", "career objective", "professional profile"},
    "skills": {"skills", "technical skills", "core skills", "core competencies", "competencies", "expertise", "technologies", "technical expertise"},
    "experience": {"experience", "work experience", "professional experience", "employment", "employment history", "work history", "professional history"},
    "education": {"education", "academic background", "academic qualifications", "qualifications", "education & training"},
    "certifications": {"certifications", "certificates", "licenses", "credentials", "professional certifications"},
    "projects": {"projects", "selected projects", "academic projects", "personal projects", "professional projects"},
    "languages": {"languages", "language skills", "spoken languages"},
    "awards": {"awards", "honors", "achievements", "awards & achievements"},
    "volunteering": {"volunteering", "volunteer experience", "community involvement"},
    "publications": {"publications", "research publications", "papers"},
    "references": {"references", "professional references"},
}

SKILL_NORMALIZATION = {
    "js": "JavaScript", "javascript": "JavaScript",
    "react.js": "React", "reactjs": "React", "react": "React",
    "node.js": "Node.js", "nodejs": "Node.js",
    "next.js": "Next.js", "nextjs": "Next.js",
    "vue.js": "Vue.js", "vuejs": "Vue.js",
    "angular.js": "Angular", "angularjs": "Angular",
    "typescript": "TypeScript", "ts": "TypeScript",
    "postgresql": "PostgreSQL", "postgres": "PostgreSQL",
    "mongodb": "MongoDB", "mongo db": "MongoDB",
    "ms sql": "SQL Server", "mssql": "SQL Server",
    "aws": "AWS", "amazon web services": "AWS",
    "gcp": "Google Cloud", "google cloud platform": "Google Cloud",
    "azure": "Microsoft Azure",
    "docker": "Docker", "kubernetes": "Kubernetes",
    "fast api": "FastAPI", "fastapi": "FastAPI",
    "machine learning": "Machine Learning",
    "ml": "Machine Learning", "artificial intelligence": "Artificial Intelligence",
    "ai": "Artificial Intelligence",
}

COMMON_SKILLS = [
    "Python","Java","C++","C#","JavaScript","TypeScript","React","Next.js","Vue.js","Angular",
    "Node.js","Express","FastAPI","Django","Flask","Spring","PHP","Laravel","SQL","PostgreSQL",
    "MySQL","MongoDB","Redis","Docker","Kubernetes","AWS","Microsoft Azure","Google Cloud",
    "Git","GitHub","GitLab","Jenkins","Terraform","Linux","Power BI","Tableau","Excel",
    "Figma","Adobe Photoshop","TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy",
    "Machine Learning","Deep Learning","Natural Language Processing","Artificial Intelligence",
    "Cybersecurity","Selenium","Cypress","Jira","SAP","Oracle","Salesforce",
]

DEGREE_PATTERNS = re.compile(
    r"\b(?:ph\.?d\.?|doctor(?:ate)?|master(?:'s)?|m\.?sc\.?|m\.?a\.?|mba|"
    r"bachelor(?:'s)?|b\.?sc\.?|b\.?a\.?|bba|b\.?com|associate(?:'s)?|"
    r"diploma|higher secondary|intermediate|matric(?:ulation)?)\b", re.I
)

DATE_TOKEN_RE = re.compile(
    r"\b(?:"
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
    r"\s+\d{4}"
    r"|"
    r"\d{1,2}[/-]\d{4}"
    r"|"
    r"\d{4}"
    r"|"
    r"(?:present|current|now)"
    r")\b", re.I
)

DATE_RANGE_RE = re.compile(
    r"(?P<start>(?:[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{4}|\d{4}))"
    r"\s*(?:-|–|—|to|until)\s*"
    r"(?P<end>(?:[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[/-]\d{4}|\d{4}|Present|Current|Now))",
    re.I,
)


def clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    s = re.sub(r"\s+", " ", str(value)).strip(" \t\r\n•-–—")
    return s or None


def unique(items: List[str], limit: int = 100) -> List[str]:
    out, seen = [], set()
    for item in items:
        item = clean(item)
        if not item:
            continue
        key = item.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
        if len(out) >= limit:
            break
    return out


def normalize_date_value(value: Optional[str]) -> Optional[str]:
    value = clean(value)
    if not value:
        return None
    low = value.lower()
    if low in {"present", "current", "now"}:
        return "Present"
    m = re.fullmatch(r"(\d{1,2})[/-](\d{4})", value)
    if m:
        return f"{int(m.group(2)):04d}-{int(m.group(1)):02d}"
    m = re.fullmatch(r"(\d{4})", value)
    if m:
        return m.group(1)
    m = re.fullmatch(r"([A-Za-z]+)\s+(\d{4})", value)
    if m:
        month = MONTHS.get(m.group(1).lower())
        if month:
            return f"{int(m.group(2)):04d}-{month:02d}"
    return value


def parse_date_point(value: Optional[str]) -> Optional[Tuple[int, int]]:
    n = normalize_date_value(value)
    if not n or n == "Present":
        return None
    m = re.fullmatch(r"(\d{4})-(\d{2})", n)
    if m:
        return int(m.group(1)), int(m.group(2))
    m = re.fullmatch(r"(\d{4})", n)
    if m:
        return int(m.group(1)), 1
    return None


def months_between(start: Optional[str], end: Optional[str]) -> Optional[int]:
    s = parse_date_point(start)
    if not s:
        return None
    e = parse_date_point(end) if end and normalize_date_value(end) != "Present" else (date.today().year, date.today().month)
    if not e:
        return None
    months = (e[0] - s[0]) * 12 + (e[1] - s[1]) + 1
    return max(0, months)


def split_name(full_name: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    name = clean(full_name)
    if not name:
        return None, None
    parts = name.split()
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def normalize_url(url: str) -> str:
    url = clean(url) or ""
    url = url.rstrip(".,;)]}")
    if url.lower().startswith("www."):
        return "https://" + url
    return url


def extract_links(text: str) -> Dict[str, Optional[str]]:
    urls = unique([normalize_url(x) for x in URL_RE.findall(text)], 50)
    linkedin = next((u for u in urls if "linkedin.com" in u.lower()), None)
    github = next((u for u in urls if "github.com" in u.lower()), None)
    portfolio = next((u for u in urls if u not in {linkedin, github}), None)
    return {"linkedin": linkedin, "github": github, "website": portfolio}


def sectionize(text: str) -> Dict[str, List[str]]:
    sections: Dict[str, List[str]] = {k: [] for k in SECTION_ALIASES}
    current = None
    for raw in text.splitlines():
        line = clean(raw)
        if not line:
            continue
        key = re.sub(r"[^a-z0-9& ]", "", line.casefold())
        key = re.sub(r"\s+", " ", key).strip()
        found = None
        for canonical, aliases in SECTION_ALIASES.items():
            if key in {re.sub(r"[^a-z0-9& ]", "", a.casefold()) for a in aliases}:
                found = canonical
                break
        if found:
            current = found
            continue
        if current:
            sections[current].append(line)
    return sections


def labeled(lines: List[str], labels: List[str]) -> Optional[str]:
    pat = re.compile(r"^(?:" + "|".join(re.escape(x) for x in labels) + r")\s*[:\-]\s*(.+)$", re.I)
    for line in lines:
        m = pat.match(line)
        if m:
            return clean(m.group(1))
    return None


def detect_name(lines: List[str]) -> Optional[str]:
    for line in lines[:15]:
        if EMAIL_RE.search(line) or PHONE_RE.search(line) or URL_RE.search(line):
            continue
        low = line.casefold()
        if any(low == a.casefold() for aliases in SECTION_ALIASES.values() for a in aliases):
            continue
        if 2 <= len(line.split()) <= 5 and len(line) <= 80 and not re.search(r"\d", line):
            if not re.search(r"\b(?:resume|curriculum vitae|profile|objective|engineer|developer|manager)\b", low):
                return line
    return None


def parse_skills(lines: List[str], full_text: str) -> List[str]:
    found: List[str] = []
    for line in lines:
        parts = re.split(r"[,;|•·]", line)
        if len(parts) == 1:
            parts = re.split(r"\s{2,}", line)
        for part in parts:
            item = clean(part)
            if item and 1 <= len(item) <= 60:
                found.append(item)
    # Conservative dictionary matching is only used for exact names in source text.
    low = full_text.casefold()
    for skill in COMMON_SKILLS:
        if re.search(r"(?<![A-Za-z0-9+#.])" + re.escape(skill.casefold()) + r"(?![A-Za-z0-9+#.])", low):
            found.append(skill)
    return unique(found, 150)


def normalize_skills(raw: List[str]) -> List[str]:
    out = []
    for skill in raw:
        key = skill.casefold().strip()
        out.append(SKILL_NORMALIZATION.get(key, skill))
    return unique(out, 150)


def parse_date_range(line: str) -> Tuple[Optional[str], Optional[str]]:
    m = DATE_RANGE_RE.search(line)
    if not m:
        return None, None
    return normalize_date_value(m.group("start")), normalize_date_value(m.group("end"))


def parse_bullets(lines: List[str]) -> List[str]:
    return unique([re.sub(r"^[•●▪◦\-–—]\s*", "", x) for x in lines if len(x) >= 8], 40)


def parse_experience(lines: List[str]) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    current: Optional[Dict[str, Any]] = None
    for line in lines:
        start, end = parse_date_range(line)
        has_title = bool(re.search(r"\b(?:engineer|developer|manager|director|analyst|designer|consultant|intern|officer|specialist|lead|architect|administrator|coordinator|assistant|executive|scientist|accountant|teacher|professor)\b", line, re.I))
        if start or has_title:
            if current:
                records.append(current)
            current = {
                "company": None, "job_title": None, "employment_type": None, "location": None,
                "start_date": start, "end_date": end, "duration": None, "is_current": end == "Present",
                "responsibilities": [], "achievements": [], "technologies_used": [],
            }
            # Date ranges often appear at end of heading.
            heading = DATE_RANGE_RE.sub("", line).strip(" -–—|")
            if heading:
                parts = re.split(r"\s+@\s+|\s+\|\s+|\s+-\s+", heading, maxsplit=1)
                current["job_title"] = clean(parts[0])
                if len(parts) > 1:
                    current["company"] = clean(parts[1])
            continue
        if current:
            if re.search(r"\b(?:achieved|increased|decreased|reduced|grew|delivered|saved|launched|won|improved)\b", line, re.I):
                current["achievements"].append(line)
            else:
                current["responsibilities"].append(line)
    if current:
        records.append(current)

    # Clean weak records and avoid treating a whole paragraph as a position.
    out = []
    for r in records:
        for k in ("responsibilities", "achievements"):
            r[k] = unique(r[k], 30)
        r["duration"] = (
            f"{months_between(r['start_date'], r['end_date'])} months"
            if months_between(r["start_date"], r["end_date"]) is not None else None
        )
        if r["job_title"] or r["company"] or r["start_date"]:
            out.append(r)
    return out[:30]


def parse_education(lines: List[str]) -> List[Dict[str, Any]]:
    out = []
    for line in lines:
        if not DEGREE_PATTERNS.search(line):
            continue
        start, end = parse_date_range(line)
        dates = DATE_TOKEN_RE.findall(line)
        clean_line = DATE_RANGE_RE.sub("", line).strip(" -–—|")
        degree_match = DEGREE_PATTERNS.search(clean_line)
        degree = degree_match.group(0) if degree_match else None
        institution = None
        after = clean_line[degree_match.end():].strip(" ,-–—|") if degree_match else clean_line
        if after:
            institution = after.split(" | ")[0].strip()
        out.append({
            "degree": clean(degree),
            "field_of_study": None,
            "institution": clean(institution),
            "location": None,
            "start_date": start,
            "end_date": end,
            "graduation_date": normalize_date_value(dates[-1]) if dates else None,
            "grade": None,
            "gpa": None,
            "percentage": None,
            "honors": None,
            "description": None,
        })
    return out[:20]


def parse_certifications(lines: List[str]) -> List[Dict[str, Any]]:
    out = []
    for line in lines:
        if len(line) < 3:
            continue
        dates = DATE_TOKEN_RE.findall(line)
        out.append({
            "certification_name": clean(line),
            "issuing_organization": None,
            "issue_date": normalize_date_value(dates[0]) if dates else None,
            "expiration_date": normalize_date_value(dates[1]) if len(dates) > 1 else None,
            "credential_id": None,
            "credential_url": None,
        })
    return out[:30]


def parse_projects(lines: List[str]) -> List[Dict[str, Any]]:
    out = []
    current = None
    for line in lines:
        start, end = parse_date_range(line)
        if current is None:
            current = {"project_name": clean(DATE_RANGE_RE.sub("", line)) or None, "description": None, "technologies": [], "role": None, "start_date": start, "end_date": end, "url": None, "github_url": None, "achievements": []}
        elif start or (len(line) <= 100 and not line.startswith(("•","-","–"))):
            out.append(current)
            current = {"project_name": clean(DATE_RANGE_RE.sub("", line)) or None, "description": None, "technologies": [], "role": None, "start_date": start, "end_date": end, "url": None, "github_url": None, "achievements": []}
        else:
            current["description"] = clean((current.get("description") or "") + " " + line)
    if current:
        out.append(current)
    for p in out:
        urls = [normalize_url(x) for x in URL_RE.findall(p.get("description") or "")]
        p["url"] = urls[0] if urls else None
        p["github_url"] = next((u for u in urls if "github.com" in u.lower()), None)
        p["description"] = clean(p.get("description"))
    return out[:30]


def parse_languages(lines: List[str]) -> List[Dict[str, Any]]:
    out = []
    for line in lines:
        for item in re.split(r"[,;|•·]", line):
            item = clean(item)
            if not item:
                continue
            m = re.match(r"(.+?)\s*[-:]\s*(beginner|elementary|basic|intermediate|conversational|fluent|advanced|native|proficient|professional|bilingual|expert)\b", item, re.I)
            if m:
                lang, prof = clean(m.group(1)), clean(m.group(2))
            else:
                lang, prof = item, None
            out.append({"language": lang, "proficiency": prof, "reading": None, "writing": None, "speaking": None})
    return out[:30]


def empty_profile(filename: str) -> Dict[str, Any]:
    return {
        "document_type": "CV",
        "source_filename": filename,
        "personal_information": {"full_name": None, "first_name": None, "last_name": None, "email": None, "phone": None, "alternate_phone": None, "location": None, "city": None, "country": None, "address": None, "linkedin": None, "github": None, "portfolio": None, "website": None},
        "professional_summary": {"summary": None, "career_objective": None},
        "professional_information": {"current_job_title": None, "target_job_title": None, "total_years_experience": None, "seniority_level": None, "current_company": None, "industry": None, "employment_status": None},
        "skills": {"technical_skills": [], "soft_skills": [], "programming_languages": [], "frameworks": [], "libraries": [], "databases": [], "cloud_platforms": [], "devops_tools": [], "design_tools": [], "office_tools": [], "AI_tools": [], "machine_learning_tools": [], "cybersecurity_tools": [], "other_skills": [], "skills_raw": [], "skills_normalized": []},
        "education": [], "work_experience": [], "certifications": [], "projects": [], "languages": [], "awards": [], "volunteering": [], "publications": [], "references": [],
        "source_traceability": {}, "extraction_quality": {"deterministic_fields": 0, "section_coverage": 0, "notes": []},
    }


def extract_cv_structured(text: str, filename: str = "document", page_data: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    profile = empty_profile(filename)
    text = text or ""
    lines = [clean(x) for x in text.splitlines() if clean(x)]
    sections = sectionize(text)
    emails = unique(EMAIL_RE.findall(text), 10)
    phones = unique(PHONE_RE.findall(text), 10)
    links = extract_links(text)
    name = detect_name(lines)
    first, last = split_name(name)

    profile["personal_information"].update({
        "full_name": name, "first_name": first, "last_name": last,
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "alternate_phone": phones[1] if len(phones) > 1 else None,
        "location": labeled(lines, ["location", "city", "address", "based in"]),
        "city": labeled(lines, ["city"]),
        "country": labeled(lines, ["country"]),
        "address": labeled(lines, ["address"]),
        "linkedin": links["linkedin"], "github": links["github"],
        "portfolio": links["website"], "website": links["website"],
    })

    summary = " ".join(sections["summary"]) if sections["summary"] else labeled(lines, ["summary", "profile", "objective", "career objective"])
    role = labeled(lines, ["current job title", "job title", "current role", "role", "position", "designation"])
    company = labeled(lines, ["current company", "company", "employer"])
    profile["professional_summary"]["summary"] = clean(summary)
    profile["professional_summary"]["career_objective"] = clean(summary) if "objective" in (summary or "").casefold() else None

    experience = parse_experience(sections["experience"])
    education = parse_education(sections["education"])
    certifications = parse_certifications(sections["certifications"])
    projects = parse_projects(sections["projects"])
    languages = parse_languages(sections["languages"])
    raw_skills = parse_skills(sections["skills"], text)
    normalized_skills = normalize_skills(raw_skills)

    current_job = role or (experience[0]["job_title"] if experience else None)
    current_company = company or (experience[0]["company"] if experience else None)
    all_periods = []
    for item in experience:
        m = months_between(item.get("start_date"), item.get("end_date"))
        if m is not None:
            all_periods.append((item.get("start_date"), item.get("end_date"), m))
    total_months = None
    if all_periods:
        months = set()
        for start, end, _ in all_periods:
            s = parse_date_point(start)
            e = parse_date_point(end) if end and normalize_date_value(end) != "Present" else (date.today().year, date.today().month)
            if s and e:
                y, m = s
                ey, em = e
                while (y, m) <= (ey, em):
                    months.add((y, m))
                    m += 1
                    if m == 13:
                        y += 1
                        m = 1
        total_months = len(months)

    profile["professional_information"].update({
        "current_job_title": current_job,
        "target_job_title": labeled(lines, ["target job title", "target role"]),
        "total_years_experience": round(total_months / 12, 1) if total_months is not None else None,
        "seniority_level": None,
        "current_company": current_company,
        "industry": None,
        "employment_status": "Current" if any(x.get("is_current") for x in experience) else None,
    })
    profile["skills"]["skills_raw"] = raw_skills
    profile["skills"]["skills_normalized"] = normalized_skills
    profile["skills"]["technical_skills"] = raw_skills
    profile["education"] = education
    profile["work_experience"] = experience
    profile["certifications"] = certifications
    profile["projects"] = projects
    profile["languages"] = languages

    # Conservative source traceability: only attach page references when the exact value exists.
    trace = {}
    if page_data:
        for group_name, values in [
            ("personal_information", [name] + emails + phones),
            ("skills", raw_skills),
            ("education", [x.get("degree") for x in education] + [x.get("institution") for x in education]),
            ("certifications", [x.get("certification_name") for x in certifications]),
        ]:
            for value in values:
                if not value:
                    continue
                for page in page_data:
                    page_text = str(page.get("text") or "")
                    if str(value).casefold() in page_text.casefold():
                        trace[str(value)] = {"page": page.get("page", 1), "text": page_text[:500]}
                        break
    profile["source_traceability"] = trace
    profile["extraction_quality"] = {
        "deterministic_fields": sum(1 for v in [name, emails, phones, summary, role, company, raw_skills, education, experience] if v),
        "section_coverage": sum(bool(sections[k]) for k in sections),
        "notes": ["Only source-supported values are populated; unavailable fields remain null or empty arrays."],
    }
    return profile


def detect_document_type(text: str) -> Tuple[str, float]:
    t = (text or "").casefold()
    scores = {
        "CV": sum(t.count(x) for x in ["resume", "curriculum vitae", "work experience", "education", "skills", "professional summary"]),
        "Job Description": sum(t.count(x) for x in ["job description", "responsibilities", "requirements", "qualifications", "preferred qualifications"]),
        "NDA": sum(t.count(x) for x in ["non-disclosure", "nondisclosure", "confidential information", "confidentiality agreement"]),
        "Employment Contract": sum(t.count(x) for x in ["employment agreement", "employee", "employer", "salary", "compensation", "benefits"]),
        "Invoice": sum(t.count(x) for x in ["invoice", "invoice number", "amount due", "subtotal", "tax", "balance due"]),
        "Academic": sum(t.count(x) for x in ["university", "coursework", "thesis", "research", "academic", "semester"]),
        "Legal": sum(t.count(x) for x in ["governing law", "jurisdiction", "arbitration", "legal notice", "whereas"]),
        "HR": sum(t.count(x) for x in ["human resources", "employee", "hr policy", "leave policy", "onboarding"]),
    }
    best = max(scores, key=scores.get)
    total = scores[best]
    if total < 2:
        return "General", 0.50
    confidence = min(0.99, 0.55 + total * 0.05)
    return best, round(confidence, 2)


def extract_job_requirements(text: str) -> Dict[str, Any]:
    sections = sectionize(text)
    required = []
    preferred = []
    for line in sections.get("skills", []) + sections.get("experience", []):
        if re.search(r"\b(required|must|required skills|requirements)\b", line, re.I):
            required.append(line)
        elif re.search(r"\b(preferred|nice to have|desired)\b", line, re.I):
            preferred.append(line)
    skills = parse_skills(sections.get("skills", []), text)
    experience_years = None
    m = re.search(r"(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience", text, re.I)
    if m:
        experience_years = float(m.group(1))
    education = [line for line in sections.get("education", []) if DEGREE_PATTERNS.search(line)]
    certifications = sections.get("certifications", [])
    responsibilities = parse_bullets(sections.get("experience", []))
    return {
        "required_skills": unique(required + skills, 100),
        "preferred_skills": unique(preferred, 100),
        "required_experience": experience_years,
        "education_requirements": education,
        "certifications": certifications,
        "responsibilities": responsibilities,
    }


def match_cv_to_job(cv: Dict[str, Any], job: Dict[str, Any]) -> Dict[str, Any]:
    cv_skills = set(x.casefold() for x in (cv.get("skills", {}).get("skills_normalized") or cv.get("skills", {}).get("technical_skills") or []))
    required = [clean(x) for x in job.get("required_skills", []) if clean(x)]
    preferred = [clean(x) for x in job.get("preferred_skills", []) if clean(x)]
    matching = [x for x in required if x.casefold() in cv_skills]
    missing = [x for x in required if x.casefold() not in cv_skills]
    exp = cv.get("professional_information", {}).get("total_years_experience")
    req_exp = job.get("required_experience")
    exp_match = None if exp is None or req_exp is None else exp >= req_exp
    education_match = None
    if job.get("education_requirements"):
        edu_text = " ".join(str(x.get("degree") or "") + " " + str(x.get("field_of_study") or "") for x in cv.get("education", []))
        education_match = any(str(req).casefold() in edu_text.casefold() for req in job["education_requirements"])
    return {
        "matching_skills": matching,
        "missing_skills": missing,
        "preferred_skills_present": [x for x in preferred if x.casefold() in cv_skills],
        "matching_experience": exp_match,
        "candidate_experience_years": exp,
        "required_experience_years": req_exp,
        "education_match": education_match,
        "certification_match": None,
        "matched_requirements": matching,
        "missing_requirements": missing,
    }
