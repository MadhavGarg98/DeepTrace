from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse, RiskChain
from app.services.pipeline import run_pipeline
from app.graph.graph_service import graph_db
from typing import Optional, List
import re

router = APIRouter()

_RISK_KEYWORDS = {
    "risk", "supplier", "suppliers", "bottleneck", "disruption", "exposed",
    "exposure", "score", "chain", "revenue", "impact", "top", "biggest"
}
_GREETING_BASE_WORDS = {
    "hi", "hello", "hey", "yo", "thanks", "thankyou"
}
_GREETING_PHRASES = {
    "good morning", "good afternoon", "good evening", "how are you"
}


def _compress_repeated_letters(token: str) -> str:
    """
    Compress repeated letters so variants like 'hii'/'heyyy' normalize to 'hi'/'hey'.
    """
    return re.sub(r"([a-z])\1+", r"\1", token)


def _normalize_message(message: str) -> str:
    """
    Lowercase and keep only letters/spaces so intent checks are stable.
    """
    lowered = message.lower().strip()
    cleaned = re.sub(r"[^a-z\s]", " ", lowered)
    return re.sub(r"\s+", " ", cleaned).strip()


def _is_small_talk(message: str) -> bool:
    """
    Detect short greeting / courtesy inputs that should not trigger risk analysis.
    """
    normalized = _normalize_message(message)
    if not normalized:
        return False

    words = normalized.split()

    if any(w in _RISK_KEYWORDS for w in words):
        return False

    if normalized in _GREETING_PHRASES:
        return True

    if len(words) <= 4:
        compressed_words = [_compress_repeated_letters(w) for w in words]
        compact_phrase = "".join(compressed_words)
        if all(w in _GREETING_BASE_WORDS for w in compressed_words):
            return True
        if compact_phrase in _GREETING_BASE_WORDS:
            return True

    return False


def _find_node_by_name(message: str) -> Optional[str]:
    """
    Case-insensitive substring match of the user's message against all node names.
    Returns the node ID if found, None otherwise.
    """
    msg_lower = message.lower()
    all_nodes = graph_db.get_all_nodes()
    for node in all_nodes:
        if node.name.lower() in msg_lower:
            return node.id
        # Also check the raw ID (e.g. user types "boschco-india")
        if node.id.lower() in msg_lower:
            return node.id
    return None


def _build_supplier_answer(node_id: str, scored_risks: List[RiskChain]) -> str:
    """
    Build a data-grounded answer about a specific supplier node.
    """
    node = graph_db.get_node(node_id)
    if not node:
        return f"I couldn't find a supplier with that identifier in the current graph."

    # Check if this node is part of any risk chain
    involved_risks = []
    for risk in scored_risks:
        chain_ids = [cn.id for cn in risk.chain_nodes]
        if node_id in risk.affected_tier1_suppliers or node_id in chain_ids:
            involved_risks.append(risk)

    if not involved_risks:
        return (
            f"{node.name} ({node.country}) is currently not part of any detected hidden risk. "
            f"Its upstream suppliers don't converge with any other Tier 1 supplier in your network. "
            f"Revenue: ${node.revenue_usd:,.0f} USD. Data source: {node.data_source}."
        )

    # Build answer from the most relevant risk
    top_risk = max(involved_risks, key=lambda r: r.score)
    role = "a direct supplier affected by" if node_id in top_risk.affected_tier1_suppliers else "part of the convergence chain for"

    chain_names = [cn.name for cn in top_risk.chain_nodes]
    bottleneck_node = graph_db.get_node(top_risk.bottleneck_node_id)
    bottleneck_name = bottleneck_node.name if bottleneck_node else top_risk.bottleneck_node_id

    answer = (
        f"{node.name} ({node.country}) is {role} a hidden bottleneck risk (score: {top_risk.score}/100). "
        f"The convergence chain runs through {' > '.join(chain_names)}, "
        f"with the ultimate bottleneck at {bottleneck_name}. "
        f"{len(top_risk.affected_tier1_suppliers)} of your direct suppliers depend on this single source. "
        f"Path confidence: {top_risk.min_confidence_along_path:.0%}."
    )

    if top_risk.evidence:
        answer += f" Key evidence: {top_risk.evidence[0]}."

    return answer


def _build_general_answer(scored_risks: List[RiskChain]) -> str:
    """
    Build a data-grounded answer about the top risk when no specific supplier is mentioned.
    """
    if not scored_risks:
        return "No convergence risks detected in the current supply chain graph."

    top = scored_risks[0]
    bottleneck_node = graph_db.get_node(top.bottleneck_node_id)
    bottleneck_name = bottleneck_node.name if bottleneck_node else top.bottleneck_node_id

    affected_names = []
    for t1_id in top.affected_tier1_suppliers:
        n = graph_db.get_node(t1_id)
        affected_names.append(n.name if n else t1_id)

    chain_names = [cn.name for cn in top.chain_nodes]

    answer = (
        f"Your biggest hidden risk (score: {top.score}/100) is a convergence bottleneck at "
        f"{bottleneck_name} ({bottleneck_node.country if bottleneck_node else 'unknown'}). "
        f"{len(top.affected_tier1_suppliers)} of your direct suppliers — {', '.join(affected_names)} — "
        f"all depend on this single source through the chain: {' > '.join(chain_names)}. "
        f"Path confidence is {top.min_confidence_along_path:.0%}, "
        f"with ${top.total_revenue_at_risk:,.0f} in combined Tier 1 revenue at risk."
    )

    if top.explanation:
        answer += f"\n\n{top.explanation}"
    if top.recommendation:
        answer += f"\n\nRecommendation: {top.recommendation}"

    return answer


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Responds to user chat with graph-grounded answers.
    Performs simple intent detection: if the message mentions a known supplier name,
    answers about that supplier specifically. Otherwise, answers about the top risk.
    """
    if _is_small_talk(request.message):
        return ChatResponse(
            answer=(
                "Hi Priya. I can help with supplier, bottleneck, and disruption questions. "
                "Try asking: 'What is my top risk?' or 'How exposed is BoschCo India?'"
            ),
            top_risk=None,
            evidence=[]
        )

    scored_risks, evidence = run_pipeline()

    # Intent detection: does the message mention a specific node?
    matched_node_id = _find_node_by_name(request.message)

    if matched_node_id:
        answer = _build_supplier_answer(matched_node_id, scored_risks)
        # Find the relevant risk for this node to return as top_risk
        relevant_risk = None
        for risk in scored_risks:
            chain_ids = [cn.id for cn in risk.chain_nodes]
            if matched_node_id in risk.affected_tier1_suppliers or matched_node_id in chain_ids:
                relevant_risk = risk
                break
    else:
        answer = _build_general_answer(scored_risks)
        relevant_risk = scored_risks[0] if scored_risks else None

    return ChatResponse(
        answer=answer,
        top_risk=relevant_risk,
        evidence=evidence
    )
