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

# Singleton instance
graph_db = GraphService()
