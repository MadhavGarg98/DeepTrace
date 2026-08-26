import pytest
from app.models.schemas import RiskChain, ChainNode
from app.agents.prioritizer_agent import prioritize_risk

def test_prioritize_risk():
    risk = RiskChain(
        id="chain-test",
        affected_tier1_suppliers=["boschco-india", "siemensco-ger"],
        chain_nodes=[
            ChainNode(id="test-node", name="Test", tier=3, country="India")
        ],
        bottleneck_node_id="test-node",
        min_confidence_along_path=0.8,
        total_revenue_at_risk=1000000.0,
        score=0,
        evidence=[]
    )
    
    # We just want to ensure it runs and outputs a score 0-100
    scored_risk = prioritize_risk(risk)
    
    assert scored_risk.score >= 0
    assert scored_risk.score <= 100
    assert scored_risk.bottleneck_node_id == "test-node"
