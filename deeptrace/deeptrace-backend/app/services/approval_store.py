from typing import Dict, Literal

# Risk chain objects are rebuilt on every pipeline run (e.g. after a disruption
# simulation recomputes scores), so approval state can't live on the RiskChain
# instance itself between runs. This tiny store keyed by the deterministic
# risk id ("chain_<bottleneck_id>") is the source of truth instead.
_APPROVALS: Dict[str, str] = {}

ApprovalStatus = Literal["pending", "approved", "rejected"]


def set_approval(risk_id: str, status: ApprovalStatus) -> None:
    _APPROVALS[risk_id] = status


def get_approval(risk_id: str) -> ApprovalStatus:
    return _APPROVALS.get(risk_id, "pending")  # type: ignore[return-value]


def clear_approvals() -> None:
    _APPROVALS.clear()