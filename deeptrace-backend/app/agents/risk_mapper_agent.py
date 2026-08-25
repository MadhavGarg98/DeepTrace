from typing import List
from app.models.schemas import RiskChain
from app.graph.convergence import detect_convergence_risks

def map_risks() -> List[RiskChain]:
    """
    Thin wrapper to call convergence.py
    """
    return detect_convergence_risks()
