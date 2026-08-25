from fastapi import APIRouter, HTTPException
from app.models.schemas import RiskChain, RisksResponse, MetaResponse
from app.services.pipeline import run_pipeline

router = APIRouter()

@router.get("", response_model=RisksResponse)
async def get_all_risks():
    """
    Returns all detected convergence risks sorted by score descending.
    """
    scored_risks, _ = run_pipeline()
    return RisksResponse(
        risks=scored_risks,
        meta=MetaResponse()
    )

@router.get("/{chain_id}", response_model=RiskChain)
async def get_risk_by_node(chain_id: str):
    """
    Full detail for one risk chain.
    """
    scored_risks, _ = run_pipeline()
    for risk in scored_risks:
        if risk.id == chain_id:
            return risk
    raise HTTPException(status_code=404, detail="Risk chain not found")
