from fastapi import APIRouter
from app.models.schemas import SuppliersResponse, SupplierDirectoryItem, MetaResponse
from app.graph.graph_service import graph_db
from app.services.pipeline import run_pipeline

router = APIRouter()

@router.get("", response_model=SuppliersResponse)
async def get_suppliers():
    buyer = graph_db.get_buyer_node()
    if not buyer:
        return SuppliersResponse(suppliers=[], meta=MetaResponse())
        
    tier1s = graph_db.get_tier1_suppliers(buyer.id)
    
    # determine who is at risk
    scored_risks, _ = run_pipeline()
    at_risk_suppliers = set()
    for risk in scored_risks:
        for t1 in risk.affected_tier1_suppliers:
            at_risk_suppliers.add(t1)
            
    items = []
    for t1 in tier1s:
        items.append(SupplierDirectoryItem(
            id=t1.id,
            name=t1.name,
            country=t1.country,
            revenue_usd=t1.revenue_usd,
            status="At risk" if t1.id in at_risk_suppliers else "Clear",
            data_source=t1.data_source
        ))
        
    return SuppliersResponse(
        suppliers=items,
        meta=MetaResponse()
    )
