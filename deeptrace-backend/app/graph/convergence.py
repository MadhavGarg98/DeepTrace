from typing import List, Dict, Set, Tuple
import hashlib
from app.models.schemas import RiskChain, ChainNode
from app.graph.graph_service import graph_db

def detect_convergence_risks() -> List[RiskChain]:
    """
    Detect points where multiple Tier 1 suppliers' upstream paths merge into a single shared source.
    Groups identical supplier sets into RiskChains.
    """
    buyer = graph_db.get_buyer_node()
    if not buyer:
        return []

    tier1_suppliers = graph_db.get_tier1_suppliers(buyer.id)
    
    # map: ancestor_node_id -> set(tier_1_suppliers_that_reach_it)
    ancestor_reach_map: Dict[str, Set[str]] = {}
    
    # map: ancestor_node_id -> dict(tier_1_id -> (path, min_conf))
    ancestor_path_map: Dict[str, Dict[str, Tuple[List[str], float]]] = {}

    for t1 in tier1_suppliers:
        # Traverse upstream from this tier 1
        upstream_results = graph_db.bfs_upstream(t1.id)
        
        for ancestor_id, path, min_conf in upstream_results:
            if ancestor_id not in ancestor_reach_map:
                ancestor_reach_map[ancestor_id] = set()
                ancestor_path_map[ancestor_id] = {}
                
            ancestor_reach_map[ancestor_id].add(t1.id)
            
            # Keep the path with the highest min_conf if multiple paths exist from the same T1
            if t1.id not in ancestor_path_map[ancestor_id] or min_conf > ancestor_path_map[ancestor_id][t1.id][1]:
                # Path needs to be reversed to represent from Ancestor down to Tier 1
                ancestor_path_map[ancestor_id][t1.id] = (path[::-1], min_conf)

    # Group by identical affected tier 1 sets
    chain_groups: Dict[str, List[str]] = {} # set_hash -> list of ancestor_ids
    for ancestor_id, t1_set in ancestor_reach_map.items():
        if len(t1_set) >= 2:
            sorted_t1s = sorted(list(t1_set))
            set_hash = hashlib.md5(",".join(sorted_t1s).encode()).hexdigest()
            if set_hash not in chain_groups:
                chain_groups[set_hash] = []
            chain_groups[set_hash].append(ancestor_id)
            
    risk_chains = []
    
    for set_hash, ancestor_ids in chain_groups.items():
        # Sort nodes in the chain by tier ascending
        nodes_in_chain = []
        for a_id in ancestor_ids:
            n = graph_db.get_node(a_id)
            if n:
                nodes_in_chain.append(n)
        nodes_in_chain.sort(key=lambda x: x.tier)
        
        bottleneck = nodes_in_chain[-1] # Deepest node
        
        # Build chain_nodes
        chain_nodes = []
        for n in nodes_in_chain:
            chain_nodes.append(ChainNode(
                id=n.id,
                name=n.name,
                tier=n.tier,
                country=n.country,
                status=n.status,
                evidence=None, # populated later
                supplies_what=n.supplies_what
            ))
            
        t1_set = ancestor_reach_map[bottleneck.id]
        
        # Calculate overall min confidence and revenue
        min_conf_overall = 1.0
        total_revenue = 0.0
        for t1_id in t1_set:
            _, conf = ancestor_path_map[bottleneck.id][t1_id]
            min_conf_overall = min(min_conf_overall, conf)
            t1_node = graph_db.get_node(t1_id)
            if t1_node and t1_node.revenue_usd:
                total_revenue += t1_node.revenue_usd

        # Create RiskChain (score and evidence to be populated by prioritizer and pipeline)
        chain_id = f"chain_{bottleneck.id}"
        risk = RiskChain(
            id=chain_id,
            affected_tier1_suppliers=list(t1_set),
            chain_nodes=chain_nodes,
            bottleneck_node_id=bottleneck.id,
            min_confidence_along_path=min_conf_overall,
            total_revenue_at_risk=total_revenue,
            score=0
        )
        risk_chains.append(risk)

    return risk_chains
