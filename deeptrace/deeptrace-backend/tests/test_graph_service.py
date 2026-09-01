from app.graph.graph_service import GraphService
from app.models.schemas import RiskChain, ChainNode

def test_find_alternate_supplier(mocker):
    # This is a basic test that could be run with pytest
    # We will mock run_pipeline to return a controlled RiskChain
    pass # Wait, let me actually write a functional test against the loaded seed graph
    
def test_find_alternate_supplier_live_data():
    """
    Test against the actual seed graph logic
    """
    from app.graph.graph_service import graph_db
    from app.services.pipeline import run_pipeline
    
    # Ensure graph is loaded
    assert len(graph_db.get_all_nodes()) > 0
    
    # Run the pipeline to get active risks
    risks, _ = run_pipeline(force_refresh=True)
    if not risks:
        print("No risks found in graph. Skipping.")
        return
        
    chain = risks[0]
    
    # Call find_alternate_supplier
    alternate = graph_db.find_alternate_supplier(chain)
    
    if alternate:
        print(f"Found alternate: {alternate.id} for chain {chain.id}")
        assert alternate.industry == chain.chain_nodes[0].industry or alternate.supplies_what == chain.chain_nodes[0].supplies_what
        assert alternate.id not in [n.id for n in chain.chain_nodes]
    else:
        print(f"No alternate found for chain {chain.id}")
