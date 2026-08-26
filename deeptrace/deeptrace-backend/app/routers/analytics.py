from fastapi import APIRouter
from app.models.schemas import AnalyticsSummary
from app.graph.graph_service import graph_db
from app.services.pipeline import run_pipeline

router = APIRouter()

@router.get("/summary", response_model=AnalyticsSummary)
async def get_analytics_summary():
    """
    Returns high-level graph metrics and risk summary.
    """
    nodes = graph_db.get_all_nodes()
    edges = graph_db.get_all_edges()
    
    buyer = graph_db.get_buyer_node()
    tier1_suppliers = graph_db.get_tier1_suppliers(buyer.id) if buyer else []
    
    scored_risks, _ = run_pipeline()
    
    highest_score = scored_risks[0].score if scored_risks else 0
    
    # Revenue at risk is sum of affected tier 1s for all risks?
    # Or just top risk? The prompt says "total_revenue_at_risk" for the summary.
    # Let's sum unique affected Tier 1s across all risks.
    affected_t1s = set()
    for r in scored_risks:
        affected_t1s.update(r.affected_tier1_suppliers)
        
    total_rev_at_risk = 0.0
    for t1_id in affected_t1s:
        n = graph_db.get_node(t1_id)
        if n and n.revenue_usd:
            total_rev_at_risk += n.revenue_usd
            
    return AnalyticsSummary(
        total_nodes=len(nodes),
        total_edges=len(edges),
        total_tier1_suppliers=len(tier1_suppliers),
        total_convergence_risks=len(scored_risks),
        highest_risk_score=highest_score,
        total_revenue_at_risk=total_rev_at_risk
    )
