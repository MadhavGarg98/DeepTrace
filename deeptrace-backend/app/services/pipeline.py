from typing import List, Tuple
from app.models.schemas import RiskChain
from app.agents.risk_mapper_agent import map_risks
from app.agents.prioritizer_agent import prioritize_risk
from app.agents.discovery_agent import get_evidence_for_chain
from app.agents.advisor_agent import get_advice_for_risk

def run_pipeline() -> Tuple[List[RiskChain], List[str]]:
    """
    Orchestrates: discovery -> risk_mapper -> prioritizer -> advisor
    Returns the scored risks and the evidence for the top risk.
    """
    raw_risks = map_risks()
    if not raw_risks:
        return [], []
        
    scored_risks = [prioritize_risk(r) for r in raw_risks]
    scored_risks.sort(key=lambda x: x.score, reverse=True)
    
    # Populate evidence for all risks
    for risk in scored_risks:
        risk.evidence = get_evidence_for_chain(risk)
    
    top_risk = scored_risks[0]
    evidence_list = top_risk.evidence
    
    explanation, recommendation = get_advice_for_risk(top_risk)
    top_risk.explanation = explanation
    top_risk.recommendation = recommendation
    
    return scored_risks, evidence_list
