from pydantic import BaseModel
from typing import Literal, Optional, List

class CompanyNode(BaseModel):
    id: str
    name: str
    country: str
    city: str
    tier: int
    industry: str
    revenue_usd: Optional[float] = None
    status: Literal["normal", "disrupted"] = "normal"
    data_source: str = "erp_direct"
    supplies_what: Optional[str] = None

class DisruptionEvent(BaseModel):
    id: str
    type: str
    location: str
    severity: Literal["low", "medium", "high"]
    description: str
    affected_node_id: str

class SupplyEdge(BaseModel):
    from_id: str
    to_id: str
    confidence: float
    source: str
    value_usd: Optional[float] = None
    evidence: str
    data_source: str = "seed_demo"

class ChainNode(BaseModel):
    id: str
    name: str
    tier: int
    country: str
    status: str = "normal"
    evidence: Optional[str] = None
    supplies_what: Optional[str] = None

class RiskChain(BaseModel):
    id: str
    affected_tier1_suppliers: List[str]
    chain_nodes: List[ChainNode]
    bottleneck_node_id: str
    min_confidence_along_path: float
    total_revenue_at_risk: float
    score: int
    evidence: List[str] = []
    explanation: Optional[str] = None
    recommendation: Optional[str] = None
    # NEW: human-in-the-loop approval state. Defaults to "pending" for every
    # freshly-computed risk; persisted separately in approval_store so it
    # survives pipeline re-runs (e.g. after a disruption simulation).
    approval_status: Literal["pending", "approved", "rejected"] = "pending"
    approval_reasoning: Optional[str] = None
    approval_next_steps: Optional[List[str]] = None
    suggested_reroute_node_id: Optional[str] = None
    suggested_reroute_node_name: Optional[str] = None
    reroute_executed: bool = False

class ImpactReport(BaseModel):
    disrupted_node: str
    affected_tier1_suppliers: List[str]
    total_revenue_at_risk: float
    cascade_path: List[List[str]]

class GdeltMatch(BaseModel):
    node_id: str
    article_title: Optional[str] = None
    article_domain: Optional[str] = None
    article_url: Optional[str] = None
    verified: bool = False

class RelevanceVerdict(BaseModel):
    candidate_index: int
    relevant: bool
    reason: str

class MetaResponse(BaseModel):
    mode: str = "demo"
    data_generated_at: str = "2024-05-15T00:00:00Z"
    note: str = "Tier 2+ relationships are demo data illustrating the detection pipeline; Tier 1 reflects direct ERP-style input."

class SenseResponse(BaseModel):
    status: Literal["ok", "cached", "unavailable"]
    provider_used: Optional[str] = None
    fetched_at: str
    matches_found: int
    matches: List[GdeltMatch]
    meta: MetaResponse


class DisruptionHistoryEntry(BaseModel):
    timestamp: str
    disrupted_node: str
    affected_suppliers: List[str]
    revenue_impact: float
    score_deltas: dict[str, dict[str, int]]  # chain_id -> {"before": X, "after": Y}
    trigger_source: str = "manual"

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    answer: str
    top_risk: Optional[RiskChain] = None
    evidence: List[str]

class AnalyticsSummary(BaseModel):
    total_nodes: int
    total_edges: int
    total_tier1_suppliers: int
    total_convergence_risks: int
    highest_risk_score: int
    total_revenue_at_risk: float


class GraphDataResponse(BaseModel):
    nodes: List[CompanyNode]
    edges: List[SupplyEdge]
    meta: MetaResponse

class RisksResponse(BaseModel):
    risks: List[RiskChain]
    meta: MetaResponse

class SupplierDirectoryItem(BaseModel):
    id: str
    name: str
    country: str
    revenue_usd: Optional[float]
    status: Literal["At risk", "Clear"]
    data_source: str

class SuppliersResponse(BaseModel):
    suppliers: List[SupplierDirectoryItem]
    meta: MetaResponse

class SimulateResponse(BaseModel):
    report: ImpactReport
    deltas: dict[str, dict[str, int]]
    history_entry: DisruptionHistoryEntry
    meta: MetaResponse

# --- NEW: audit log models ---

class AgentLogEntry(BaseModel):
    timestamp: str
    agent_name: Literal["discovery", "risk_mapper", "prioritizer", "advisor", "system"]
    action: str
    detail: str
    risk_id: Optional[str] = None
    trigger_source: Optional[str] = None
    evidence: Optional[List[str]] = None
    provider_used: Optional[str] = None

class AuditLogResponse(BaseModel):
    logs: List[AgentLogEntry]
    meta: MetaResponse