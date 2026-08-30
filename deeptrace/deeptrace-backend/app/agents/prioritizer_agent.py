from app.models.schemas import RiskChain
from app.graph.graph_service import graph_db
from app.services.audit_log import append_log

LOCATION_RISK = {
    "Taiwan": 0.9,
    "China": 0.7,
    "India": 0.3,
    "default": 0.5
}

def prioritize_risk(risk: RiskChain) -> RiskChain:
    """
    Applies deterministic scoring to rank a convergence risk.
    """
    num_affected = len(risk.affected_tier1_suppliers)
    norm_affected = min(num_affected / 10.0, 1.0)
    
    total_rev = risk.total_revenue_at_risk
    norm_rev = min(total_rev / 2_000_000_000.0, 1.0)
    
    conf = risk.min_confidence_along_path
    
    target_node = graph_db.get_node(risk.bottleneck_node_id)
    country = target_node.country if target_node else "default"
    loc_risk = LOCATION_RISK.get(country, LOCATION_RISK["default"])
    
    score_raw = (0.4 * norm_affected) + (0.35 * norm_rev) + (0.15 * conf) + (0.10 * loc_risk)
    
    # Increase score if chain nodes are disrupted
    disrupted = any(n.status == "disrupted" for n in risk.chain_nodes)
    if disrupted:
        score_raw += 0.20
        
    final_score = int(round(min(score_raw, 1.0) * 100))
    
    risk.score = final_score

    append_log(
        agent_name="prioritizer",
        action="score_computed",
        detail=(
            f"Scored bottleneck '{risk.bottleneck_node_id}' at {final_score}/100 "
            f"(affects {num_affected} Tier 1 supplier(s), "
            f"{'currently disrupted' if disrupted else 'no active disruption'})."
        ),
        risk_id=risk.id,
    )

    return risk