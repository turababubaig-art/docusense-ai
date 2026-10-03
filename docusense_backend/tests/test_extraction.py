from services.entity_service import EntityService
from services.clause_service import ClauseService

def test_entities_have_page_evidence():
    pages=[{"page":4,"text":"Contact Dr. John Smith at john@example.com. Acme Ltd shall pay PKR 50,000."}]
    entities=EntityService().extract(pages)
    assert any(x["type"]=="email" and x["page"]==4 for x in entities)
    assert any(x["type"]=="money" and x["amount"]==50000 for x in entities)

def test_clause_extraction():
    clauses=ClauseService().extract([{"page":7,"text":"This agreement may terminate on thirty days notice. Confidential information shall remain protected."}])
    assert any(x["type"]=="termination" for x in clauses)
    assert any(x["type"]=="confidentiality" for x in clauses)
