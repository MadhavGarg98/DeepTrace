from typing import List, Tuple
from app.models.schemas import RiskChain
from app.agents.risk_mapper_agent import map_risks
from app.agents.prioritizer_agent import prioritize_risk
from app.agents.discovery_agent import get_evidence_for_chain
from app.agents.advisor_agent import get_advice_for_risk
from app.services.approval_store import get_approval

_cached_risks = None
_cached_evidence = None

def run_pipeline(force_refresh: bool = False) -> Tuple[List[RiskChain], List[str]]:
    """
    Orchestrates: discovery -> risk_mapper -> prioritizer -> advisor
    Returns the scored risks and the evidence for the top risk.
    Caches the result to avoid redundant expensive computations.
    """
    global _cached_risks, _cached_evidence
    if not force_refresh and _cached_risks is not None and _cached_evidence is not None:
        return _cached_risks, _cached_evidence

    raw_risks = map_risks()
    if not raw_risks:
        _cached_risks = []
        _cached_evidence = []
        return [], []
        
    scored_risks = [prioritize_risk(r) for r in raw_risks]
    scored_risks.sort(key=lambda x: x.score, reverse=True)
    
    # Populate evidence for all risks, and re-apply any persisted human
    # approval decision - risk objects are rebuilt on every run, so approval
    # state has to be re-attached from approval_store rather than assumed
    # to survive on the object itself.
    for risk in scored_risks:
        risk.evidence = get_evidence_for_chain(risk)
        risk.approval_status = get_approval(risk.id)
    
    top_risk = scored_risks[0]
    evidence_list = top_risk.evidence
    
    explanation, recommendation = get_advice_for_risk(top_risk)
    top_risk.explanation = explanation
    top_risk.recommendation = recommendation
    
    _cached_risks = scored_risks
    _cached_evidence = evidence_list
    
    return scored_risks, evidence_list