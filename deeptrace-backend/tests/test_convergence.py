import pytest
from app.graph.convergence import detect_convergence_risks
from app.graph.graph_service import graph_db

def test_detect_convergence_risks():
    risks = detect_convergence_risks()
    
    # Based on seed.json, we have exactly 2 convergence points meeting criteria (>=2 tier 1s)
    
    assert len(risks) >= 2
    
    # Let's check that techparts-us is NOT in the risks (bottleneck)
    for r in risks:
        assert r.bottleneck_node_id != "techparts-us"
        
    # Check that hsinchu-raw (the collapsed deepest chain) is a risk and affects all 3
    infineon_risk = next((r for r in risks if r.bottleneck_node_id == "hsinchu-raw"), None)
    assert infineon_risk is not None
    
    # Check that sinopec-feedstock (the new collapsed deepest chain) is a risk and affects 2
    sinopec_risk = next((r for r in risks if r.bottleneck_node_id == "sinopec-feedstock"), None)
    assert sinopec_risk is not None
    assert len(sinopec_risk.affected_tier1_suppliers) == 2
    assert "plastics-a" in sinopec_risk.affected_tier1_suppliers
    assert "rubber-c" in sinopec_risk.affected_tier1_suppliers
    assert sinopec_risk.min_confidence_along_path == 0.60
    assert len(infineon_risk.affected_tier1_suppliers) == 3
    assert "boschco-india" in infineon_risk.affected_tier1_suppliers
    assert "siemensco-ger" in infineon_risk.affected_tier1_suppliers
    assert "precision-wires-uk" in infineon_risk.affected_tier1_suppliers
    
    # Check confidence is minimum of the paths.
    # Check confidence is minimum of the paths.
    assert infineon_risk.min_confidence_along_path == 0.75
