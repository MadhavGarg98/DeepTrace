from typing import List
from app.models.schemas import RiskChain
from app.graph.graph_service import graph_db
from app.services.audit_log import append_log

def get_evidence_for_chain(chain: RiskChain) -> List[str]:
    """
    Retrieve human-readable evidence from the edges connecting the nodes in a RiskChain,
    and from the Tier 1s connecting to the top of the chain.
    """
    evidence = set()
    
    # Edges between chain nodes (sorted from T1 downwards)
    # chain_nodes is ordered T2 -> T3 -> T4. We don't have T1 in chain_nodes because T1s are multiple.
    for i in range(len(chain.chain_nodes) - 1):
        supplier_id = chain.chain_nodes[i+1].id
        buyer_id = chain.chain_nodes[i].id
        edge_data = graph_db.graph.get_edge_data(supplier_id, buyer_id)
        if edge_data and "evidence" in edge_data:
            evidence.add(edge_data["evidence"])
            
    # Edges between T1s and the top of the chain
    top_of_chain = chain.chain_nodes[0].id
    for t1_id in chain.affected_tier1_suppliers:
        # there might be a path. But for simplicity we get direct predecessors of top_of_chain
        edge_data = graph_db.graph.get_edge_data(top_of_chain, t1_id)
        if edge_data and "evidence" in edge_data:
            evidence.add(edge_data["evidence"])

    evidence_list = sorted(list(evidence))

    append_log(
        agent_name="discovery",
        action="evidence_gathered",
        detail=(
            f"Collected {len(evidence_list)} evidence item(s) supporting the "
            f"inferred chain ending at '{chain.bottleneck_node_id}'."
        ),
        risk_id=chain.id,
    )

    return evidence_list