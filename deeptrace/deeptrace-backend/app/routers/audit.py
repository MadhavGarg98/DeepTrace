from fastapi import APIRouter
from app.models.schemas import AuditLogResponse, MetaResponse
from app.services.audit_log import get_logs

router = APIRouter()

@router.get("", response_model=AuditLogResponse)
async def get_audit_log():
    """
    Returns the full agent + human decision trail, newest first.
    Every discovery/risk_mapper/prioritizer/advisor step and every
    approve/reject/reroute action appears here with a timestamp.
    """
    return AuditLogResponse(logs=get_logs(), meta=MetaResponse())