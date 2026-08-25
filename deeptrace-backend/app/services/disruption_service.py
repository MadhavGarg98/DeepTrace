from app.models.schemas import ImpactReport
from app.graph.graph_service import graph_db

def simulate_disruption(node_id: str) -> ImpactReport:
    """
    Simulate a disruption at a node and propagate its downstream impact.
    """
    if not graph_db.get_node(node_id):
        raise ValueError(f"Node {node_id} not found in graph.")
        
    graph_db.set_node_status(node_id, "disrupted")
    
    result = graph_db.bfs_downstream(node_id)
    affected_tier1_suppliers = result["affected_tier1"]
    paths = result["paths"]
    
    # Also mark affected T1s as disrupted so scores recompute higher/lower
    for t1 in affected_tier1_suppliers:
        graph_db.set_node_status(t1, "disrupted")
    
    total_revenue_at_risk = 0.0
    for t1_id in affected_tier1_suppliers:
        node = graph_db.get_node(t1_id)
        if node and node.revenue_usd:
            total_revenue_at_risk += node.revenue_usd
            
    return ImpactReport(
        disrupted_node=node_id,
        affected_tier1_suppliers=affected_tier1_suppliers,
        total_revenue_at_risk=total_revenue_at_risk,
        cascade_path=paths
    )
