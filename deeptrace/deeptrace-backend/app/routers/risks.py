from fastapi import APIRouter, HTTPException
from app.models.schemas import RiskChain, RisksResponse, MetaResponse
from app.services.pipeline import run_pipeline
from app.services.approval_store import set_approval
from app.services.audit_log import append_log

router = APIRouter()

@router.get("", response_model=RisksResponse)
async def get_all_risks():
    """
    Returns all detected convergence risks sorted by score descending.
    """
    from app.graph.graph_service import resolved_chains
    scored_risks, _ = run_pipeline()
    active_risks = [r for r in scored_risks if r.id not in resolved_chains]
    return RisksResponse(
        risks=active_risks,
        meta=MetaResponse()
    )

@router.get("/{chain_id}", response_model=RiskChain)
async def get_risk_by_node(chain_id: str):
    """
    Full detail for one risk chain.
    """
    from app.graph.graph_service import resolved_chains
    if chain_id in resolved_chains:
        return resolved_chains[chain_id]
        
    scored_risks, _ = run_pipeline()
    for risk in scored_risks:
        if risk.id == chain_id:
            return risk
    raise HTTPException(status_code=404, detail="Risk chain not found")


def _find_risk_or_404(chain_id: str) -> RiskChain:
    scored_risks, _ = run_pipeline()
    risk = next((r for r in scored_risks if r.id == chain_id), None)
    if not risk:
        raise HTTPException(status_code=404, detail="Risk chain not found")
    return risk


@router.post("/{chain_id}/approve", response_model=RiskChain)
async def approve_risk(chain_id: str):
    """
    Human approves the advisor agent's recommendation for this risk.
    This is a real, persisted state change (not a UI-only toggle) -
    it survives refresh and future pipeline recomputations, and it's
    the gate that /execute-reroute checks before acting.
    """
    risk = _find_risk_or_404(chain_id)
    set_approval(chain_id, "approved")
    append_log(
        agent_name="system",
        action="human_approval",
        detail=(
            f"Human approved the recommendation for bottleneck "
            f"'{risk.bottleneck_node_id}' (affects {len(risk.affected_tier1_suppliers)} "
            f"Tier 1 supplier(s))."
        ),
        risk_id=chain_id,
    )
    risk.approval_status = "approved"
    
    from app.agents.advisor_agent import assess_reroute_impact
    reasoning, next_steps = assess_reroute_impact(risk)
    risk.approval_reasoning = reasoning
    risk.approval_next_steps = next_steps
    
    return risk


@router.post("/{chain_id}/reject", response_model=RiskChain)
async def reject_risk(chain_id: str):
    """
    Human rejects the advisor agent's recommendation for this risk.
    """
    risk = _find_risk_or_404(chain_id)
    set_approval(chain_id, "rejected")
    append_log(
        agent_name="system",
        action="human_rejection",
        detail=(
            f"Human rejected the recommendation for bottleneck "
            f"'{risk.bottleneck_node_id}'."
        ),
        risk_id=chain_id,
    )
    risk.approval_status = "rejected"
    return risk

@router.post("/{chain_id}/execute-reroute", response_model=RiskChain)
async def execute_reroute_endpoint(chain_id: str):
    """
    Executes an approved reroute server-side.
    """
    from app.graph.graph_service import graph_db
    _find_risk_or_404(chain_id)
    try:
        updated_chain = graph_db.execute_reroute(chain_id)
        return updated_chain
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))