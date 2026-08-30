from typing import List
from app.models.schemas import RiskChain
from app.graph.convergence import detect_convergence_risks
from app.services.audit_log import append_log

def map_risks() -> List[RiskChain]:
    """
    Thin wrapper to call convergence.py, with an audit log entry so a
    'no risks found' scan is just as visible/auditable as one that finds
    something - this is the agent actually running, not just idling.
    """
    risks = detect_convergence_risks()

    append_log(
        agent_name="risk_mapper",
        action="convergence_scan",
        detail=(
            f"Scanned the supply graph for convergence patterns and found "
            f"{len(risks)} risk cluster(s) where multiple Tier 1 suppliers "
            f"share a single upstream source."
        ),
    )

    return risks