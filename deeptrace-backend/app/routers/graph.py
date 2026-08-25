from fastapi import APIRouter
from app.graph.graph_service import graph_db
from app.models.schemas import GraphDataResponse, MetaResponse

router = APIRouter()

@router.get("", response_model=GraphDataResponse)
async def get_graph():
    return GraphDataResponse(
        nodes=graph_db.get_all_nodes(),
        edges=graph_db.get_all_edges(),
        meta=MetaResponse()
    )
