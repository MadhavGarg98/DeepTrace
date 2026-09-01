import networkx as nx
from typing import List, Optional, Tuple, Dict, Any
from app.models.schemas import CompanyNode, SupplyEdge
from app.data.loader import load_seed_data

class GraphService:
    def __init__(self):
        self.graph = nx.DiGraph()
        self._load_initial_data()

    def _load_initial_data(self):
        nodes, edges = load_seed_data()
        for node in nodes:
            self.graph.add_node(node.id, **node.model_dump())
        for edge in edges:
            self.graph.add_edge(edge.from_id, edge.to_id, **edge.model_dump())

    def get_node(self, node_id: str) -> Optional[CompanyNode]:
        if not self.graph.has_node(node_id):
            return None
        return CompanyNode(**self.graph.nodes[node_id])

    def get_all_nodes(self) -> List[CompanyNode]:
        return [CompanyNode(**data) for _, data in self.graph.nodes(data=True)]

    def get_all_edges(self) -> List[SupplyEdge]:
        return [SupplyEdge(**data) for _, _, data in self.graph.edges(data=True)]

    def set_node_status(self, node_id: str, status: str):
        if self.graph.has_node(node_id):
            self.graph.nodes[node_id]["status"] = status

    def get_buyer_node(self) -> Optional[CompanyNode]:
        """Assuming there is only one buyer node (tier 0)"""
        for _, data in self.graph.nodes(data=True):
            if data.get("tier") == 0:
                return CompanyNode(**data)
        return None

    def get_tier1_suppliers(self, buyer_id: str) -> List[CompanyNode]:
        """Get suppliers directly supplying the buyer (tier 1)"""
        tier1 = []
        for u in self.graph.predecessors(buyer_id):
            node_data = self.graph.nodes[u]
            if node_data.get("tier") == 1:
                tier1.append(CompanyNode(**node_data))
        return tier1

    def bfs_upstream(self, start_node_id: str) -> List[Tuple[str, List[str], float]]:
        """
        Traverse upstream (from_id <- to_id) which means following predecessors in our DiGraph.
        Returns a list of tuples: (ancestor_id, path_from_start_to_ancestor, min_confidence_along_path)
        """
        visited = set()
        queue = [(start_node_id, [start_node_id], 1.0)]
        results = []
        
        while queue:
            current, path, min_conf = queue.pop(0)
            if current not in visited:
                visited.add(current)
                if current != start_node_id:
                    results.append((current, path, min_conf))
                
                for predecessor in self.graph.predecessors(current):
                    if predecessor not in visited:
                        edge_data = self.graph.get_edge_data(predecessor, current)
                        confidence = edge_data.get("confidence", 1.0)
                        new_min_conf = min(min_conf, confidence)
                        queue.append((predecessor, path + [predecessor], new_min_conf))
        return results

    def bfs_downstream(self, start_node_id: str) -> Dict[str, Any]:
        """
        Traverse downstream (from_id -> to_id) to see who is affected by a disruption.
        Returns a set of affected node IDs and paths.
        """
        visited = set()
        queue = [(start_node_id, [start_node_id])]
        affected_tier1 = set()
        paths = []
        
        while queue:
            current, path = queue.pop(0)
            if current not in visited:
                visited.add(current)
                node_data = self.graph.nodes[current]
                if node_data.get("tier") == 1:
                    affected_tier1.add(current)
                
                # Check if it reaches buyer, if so record path
                if node_data.get("tier") == 0:
                    paths.append(path)
                
                for successor in self.graph.successors(current):
                    if successor not in visited:
                        queue.append((successor, path + [successor]))
                        
        return {
            "affected_tier1": list(affected_tier1),
            "paths": paths
        }

    def find_alternate_supplier(self, chain: 'RiskChain') -> Optional[CompanyNode]:
        if not chain or not chain.chain_nodes:
            return None
            
        target = chain.chain_nodes[0]
        chain_node_ids = {n.id for n in chain.chain_nodes}
        
        target_data = self.graph.nodes.get(target.id, {})
        target_industry = target_data.get("industry")
        target_supplies = target_data.get("supplies_what")
        
        candidates = []
        for _, data in self.graph.nodes(data=True):
            if data.get("id") in chain_node_ids:
                continue
                
            industry_match = bool(target_industry and data.get("industry") == target_industry)
            supplies_match = bool(target_supplies and data.get("supplies_what") == target_supplies)
            
            if industry_match or supplies_match:
                # check upstream ancestry
                upstream = self.bfs_upstream(data["id"])
                upstream_ids = {ancestor_id for ancestor_id, _, _ in upstream}
                upstream_ids.add(data["id"])
                
                if not upstream_ids.intersection(chain_node_ids):
                    candidates.append(CompanyNode(**data))
                    
        if not candidates:
            return None
            
        # Deterministic sort: highest revenue first
        candidates.sort(key=lambda x: (x.revenue_usd or 0), reverse=True)
        return candidates[0]

    def execute_reroute(self, chain_id: str) -> 'RiskChain':
        from app.services.pipeline import run_pipeline
        from app.services.audit_log import append_log
        from app.models.schemas import RiskChain
        import datetime
        
        risks, _ = run_pipeline(force_refresh=False)
        chain = next((r for r in risks if r.id == chain_id), None)
        if not chain:
            raise ValueError("Chain not found")
            
        if chain.approval_status != "approved" or chain.reroute_executed:
            raise ValueError("Chain must be approved and not already executed")
            
        alternate = self.find_alternate_supplier(chain)
        if not alternate:
            raise ValueError("No alternate supplier found")
            
        target_node_id = chain.chain_nodes[0].id
        
        for t1_id in chain.affected_tier1_suppliers:
            # Backend returns edges (from_id -> to_id). t1 is upstream from target. So target -> t1 ?
            # Wait, Tier 1 supplies Buyer. Tier 2 supplies Tier 1.
            # chain_nodes[0] is the deepest or shallowest? 
            # In convergence.py, chain_nodes is sorted by tier ascending. So chain_nodes[0] is the tier 2 node (closest to tier 1).
            # The edge is chain_nodes[0] -> t1.
            if self.graph.has_edge(target_node_id, t1_id):
                self.graph.remove_edge(target_node_id, t1_id)
            elif self.graph.has_edge(t1_id, target_node_id):
                # Just in case direction is reversed
                self.graph.remove_edge(t1_id, target_node_id)
                
            self.graph.add_edge(
                alternate.id, t1_id,
                from_id=alternate.id, to_id=t1_id,
                confidence=0.8, source="trade_data", value_usd=None,
                evidence=f"Rerouted via approved recommendation on {datetime.datetime.utcnow().isoformat()}",
                data_source="seed_demo"
            )
            
        # Recompute scores
        risks, _ = run_pipeline(force_refresh=True)
        updated_chain = next((r for r in risks if r.id == chain_id), None)
        
        if updated_chain is None:
            updated_chain = chain
            updated_chain.score = 0
            
        updated_chain.reroute_executed = True
        
        resolved_chains[chain_id] = updated_chain
        
        append_log(
            agent_name="system",
            action="execute_reroute",
            detail=f"Executed reroute of {len(chain.affected_tier1_suppliers)} suppliers from {target_node_id} to {alternate.id}. Risk score is now {updated_chain.score}.",
            risk_id=chain_id
        )
        
        return updated_chain

# Dictionary to store resolved chains
resolved_chains = {}

# Singleton instance
graph_db = GraphService()
