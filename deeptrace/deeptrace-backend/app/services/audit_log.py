import datetime
from typing import List, Optional
from app.models.schemas import AgentLogEntry

# In-memory audit trail, same pattern as DISRUPTION_HISTORY in routers/disruptions.py.
# Every agent step in the pipeline (discovery, risk_mapper, prioritizer, advisor)
# and every human/system action (approve, reject, reroute) appends one entry here.
_LOG: List[AgentLogEntry] = []


def append_log(
    agent_name: str,
    action: str,
    detail: str,
    risk_id: Optional[str] = None,
) -> AgentLogEntry:
    entry = AgentLogEntry(
        timestamp=datetime.datetime.utcnow().isoformat() + "Z",
        agent_name=agent_name,  # type: ignore[arg-type]
        action=action,
        detail=detail,
        risk_id=risk_id,
    )
    _LOG.append(entry)
    return entry


def get_logs() -> List[AgentLogEntry]:
    """Newest first, so the UI doesn't need to reverse it."""
    return list(reversed(_LOG))


def clear_logs() -> None:
    _LOG.clear()