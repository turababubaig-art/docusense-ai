from services.vector_search_service import VectorSearchService

def test_keyword_search_returns_relevant_page():
    hits=VectorSearchService().keyword_search([{"document_id":"d1","page_start":8,"text":"The contract requires thirty days notice before termination."}],"termination notice",5)
    assert hits and hits[0]["page_start"]==8
