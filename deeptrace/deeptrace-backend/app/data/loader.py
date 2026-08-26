import json
import os
from pathlib import Path
from app.models.schemas import CompanyNode, SupplyEdge

def load_seed_data():
    seed_path = Path(__file__).parent / "seed.json"
    with open(seed_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    nodes = [CompanyNode(**node) for node in data.get("nodes", [])]
    edges = [SupplyEdge(**edge) for edge in data.get("edges", [])]
    
    return nodes, edges
