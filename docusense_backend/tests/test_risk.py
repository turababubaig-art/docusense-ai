from services.risk_service import RiskService

def test_unlimited_liability_is_detected():
    result=RiskService().analyze([{"page":3,"text":"The customer accepts unlimited liability for all losses."}])
    assert result["risk_level"] in {"High","Medium"}
    assert any(x["keyword"]=="unlimited liability" for x in result["findings"])
