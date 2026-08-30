export interface CompanyNode {
  id: string;
  name: string;
  country: string;
  city: string;
  tier: number;
  industry: string;
  revenue_usd?: number;
  status: "normal" | "disrupted";
  data_source: string;
  supplies_what?: string;
}

export interface SupplyEdge {
  from_id: string;
  to_id: string;
  confidence: number;
  source: string;
  value_usd?: number;
  evidence: string;
  data_source: string;
}

export interface ChainNode {
  id: string;
  name: string;
  tier: number;
  country: string;
  status: string;
  evidence?: string;
  supplies_what?: string;
}

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface RiskChain {
  id: string;
  affected_tier1_suppliers: string[];
  chain_nodes: ChainNode[];
  bottleneck_node_id: string;
  min_confidence_along_path: number;
  total_revenue_at_risk: number;
  score: number;
  evidence: string[];
  explanation?: string;
  recommendation?: string;
  approval_status: ApprovalStatus;
}

export interface ImpactReport {
  disrupted_node: string;
  affected_tier1_suppliers: string[];
  total_revenue_at_risk: number;
  cascade_path: string[][];
}

export interface DisruptionHistoryEntry {
  timestamp: string;
  disrupted_node: string;
  affected_suppliers: string[];
  revenue_impact: number;
  score_deltas: Record<string, { before: number; after: number }>;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  answer: string;
  top_risk?: RiskChain;
  evidence: string[];
}

export interface AnalyticsSummary {
  total_nodes: number;
  total_edges: number;
  total_tier1_suppliers: number;
  total_convergence_risks: number;
  highest_risk_score: number;
  total_revenue_at_risk: number;
}

export interface MetaResponse {
  mode: string;
  data_generated_at: string;
  note: string;
}

export interface GraphDataResponse {
  nodes: CompanyNode[];
  edges: SupplyEdge[];
  meta: MetaResponse;
}

export interface RisksResponse {
  risks: RiskChain[];
  meta: MetaResponse;
}

export interface SupplierDirectoryItem {
  id: string;
  name: string;
  country: string;
  revenue_usd?: number;
  status: "At risk" | "Clear";
  data_source: string;
}

export interface SuppliersResponse {
  suppliers: SupplierDirectoryItem[];
  meta: MetaResponse;
}

export interface DisruptionHistoryResponse {
  history: DisruptionHistoryEntry[];
  meta: MetaResponse;
}

export interface SimulateResponse {
  report: ImpactReport;
  deltas: Record<string, { before: number; after: number }>;
  history_entry: DisruptionHistoryEntry;
  meta: MetaResponse;
}

// --- NEW: audit log types ---

export type AgentName = "discovery" | "risk_mapper" | "prioritizer" | "advisor" | "system";

export interface AgentLogEntry {
  timestamp: string;
  agent_name: AgentName;
  action: string;
  detail: string;
  risk_id?: string;
}

export interface AuditLogResponse {
  logs: AgentLogEntry[];
  meta: MetaResponse;
}