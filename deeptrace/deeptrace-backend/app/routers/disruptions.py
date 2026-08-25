from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import datetime
from app.models.schemas import ImpactReport, DisruptionHistoryEntry, SimulateResponse, MetaResponse
from app.services.disruption_service import simulate_disruption
from app.services.pipeline import run_pipeline

router = APIRouter()

# In-memory history
DISRUPTION_HISTORY = []

class DisruptionRequest(BaseModel):
    node_id: str

@router.get("/history")
async def get_disruption_history():
    return {"history": DISRUPTION_HISTORY, "meta": MetaResponse()}

@router.post("/simulate", response_model=SimulateResponse)
async def simulate_disruption_endpoint(req: DisruptionRequest):
    """
    Simulates a disruption at a specified node and computes downstream impact.
    """
    try:
        # Before scores
        risks_before, _ = run_pipeline()
        score_before = {r.id: r.score for r in risks_before}
        
        # Simulate
        report = simulate_disruption(req.node_id)
        
        # After scores
        risks_after, _ = run_pipeline()
        score_after = {r.id: r.score for r in risks_after}
        
        deltas = {}
        for r_id in set(list(score_before.keys()) + list(score_after.keys())):
            b = score_before.get(r_id, 0)
            a = score_after.get(r_id, 0)
            if b != a:
                deltas[r_id] = {"before": b, "after": a}
        
        entry = DisruptionHistoryEntry(
            timestamp=datetime.datetime.utcnow().isoformat() + "Z",
            disrupted_node=req.node_id,
            affected_suppliers=report.affected_tier1_suppliers,
            revenue_impact=report.total_revenue_at_risk,
            score_deltas=deltas
        )
        DISRUPTION_HISTORY.append(entry)
        
        return SimulateResponse(
            report=report,
            deltas=deltas,
            history_entry=entry,
            meta=MetaResponse()
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
