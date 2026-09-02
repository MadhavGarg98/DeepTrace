import os
from fastapi import APIRouter
from app.models.schemas import ChatRequest, ChatResponse, RiskChain
from app.services.pipeline import run_pipeline
from app.graph.graph_service import graph_db
from groq import Groq
import json

router = APIRouter()

# Initialize Groq client
from app.config import settings
client = Groq(api_key=settings.groq_api_key)
@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Responds to user chat with graph-grounded answers using Groq LLM.
    """
    scored_risks, evidence = run_pipeline()
    
    # Chat Guard for Approval/Execution
    msg_lower = request.message.lower()
    if ("approve" in msg_lower or "execute" in msg_lower or "reroute" in msg_lower) and len(msg_lower.split()) < 20:
        return ChatResponse(
            answer="Approvals and reroutes are handled from the Risk Panel — open the risk card to review and approve the suggested reroute directly.",
            top_risk=scored_risks[0] if scored_risks else None,
            evidence=evidence
        )

    # Search for node in graph
    matched_node = None
    for n in graph_db.get_all_nodes():
        if n.name.lower() in msg_lower or n.id.lower() in msg_lower:
            matched_node = n
            break

    context = ""
    fallback_answer = ""
    if matched_node:
        in_edges = [e for e in graph_db.get_all_edges() if e.to_id == matched_node.id]
        out_edges = [e for e in graph_db.get_all_edges() if e.from_id == matched_node.id]
        
        node_role = "It isn't currently part of any detected risk chain."
        for r in scored_risks:
            if r.bottleneck_node_id == matched_node.id:
                node_role = f"It is the critical bottleneck in risk chain {r.id}."
                break
            elif matched_node.id in r.affected_tier1_suppliers:
                node_role = f"It is a Tier 1 supplier affected by risk chain {r.id}."
                break
            elif any(cn.id == matched_node.id for cn in r.chain_nodes):
                node_role = f"It is an intermediate node in risk chain {r.id}."
                break
                
        reroute_info = ""
        for r in scored_risks:
            alt = graph_db.find_alternate_supplier(r)
            if alt and alt.id == matched_node.id:
                reroute_info = f"\n- Reroute Status: It is currently flagged as a viable alternate supplier for risk chain {r.id}."
                break
                
        in_details = [f"receives from {e.from_id}" for e in in_edges]
        out_details = [f"supplies {e.to_id}" for e in out_edges]
        
        context += (
            f"The user is asking about a specific supplier in the graph: {matched_node.name} (Node ID: {matched_node.id}).\n"
            f"- Details: Tier {matched_node.tier} {matched_node.industry} supplier in {matched_node.city}, {matched_node.country}.\n"
            f"- Revenue: ${matched_node.revenue_usd or 0:,.0f}\n"
            f"- Supplies: {matched_node.supplies_what or 'N/A'}\n"
            f"- Incoming Dependencies: {', '.join(in_details) if in_details else 'None'}\n"
            f"- Outgoing Dependencies: {', '.join(out_details) if out_details else 'None'}\n"
            f"- Risk Status: {node_role}{reroute_info}\n\n"
        )
        fallback_answer = f"{matched_node.name} is a Tier {matched_node.tier} {matched_node.industry} supplier in {matched_node.city}, {matched_node.country}. {node_role}{' ' + reroute_info.strip('- \n') if reroute_info else ''}"

    context += "Here are the top detected risks in the supply chain:\n"
    for idx, risk in enumerate(scored_risks):
        bottleneck_node = graph_db.get_node(risk.bottleneck_node_id)
        b_name = bottleneck_node.name if bottleneck_node else risk.bottleneck_node_id
        
        affected_names = []
        for t1_id in risk.affected_tier1_suppliers:
            n = graph_db.get_node(t1_id)
            affected_names.append(n.name if n else t1_id)
        
        chain_names = [cn.name for cn in risk.chain_nodes]
        
        context += (
            f"Risk {idx + 1}:\n"
            f"- Score: {risk.score}/100\n"
            f"- Bottleneck: {b_name} (Node ID: {risk.bottleneck_node_id})\n"
            f"- Affected Tier 1 Suppliers: {', '.join(affected_names)}\n"
            f"- Convergence Chain: {' > '.join(chain_names)}\n"
            f"- Confidence: {risk.min_confidence_along_path:.0%}\n"
            f"- Revenue at Risk: ${risk.total_revenue_at_risk:,.0f}\n"
            f"- Evidence: {risk.evidence}\n"
            f"- Explanation: {risk.explanation}\n"
            f"- Recommendation: {risk.recommendation}\n\n"
        )
        
    system_prompt = (
        "You are Risk Advisor, an AI assistant analyzing a company's supply chain graph. "
        "Use the provided context about the specific supplier (if requested) and the current supply chain risks to answer the user's questions. "
        "Keep your answers concise, professional, and data-driven. "
        "If the user asks about a specific supplier name that is genuinely NOT present in any of the provided context, you must explicitly say 'I don't have a node by that name'. "
        "If the user is just making small talk (like saying 'hi'), reply naturally as an AI supply chain assistant."
    )

    messages = [
        {"role": "system", "content": system_prompt + "\n\nContext:\n" + context},
        {"role": "user", "content": request.message}
    ]

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=messages,
            temperature=0.0,
            max_tokens=1024
        )
        answer = completion.choices[0].message.content
    except Exception as e:
        answer = fallback_answer if fallback_answer else f"Error communicating with AI model: {str(e)}"

    relevant_risk = scored_risks[0] if scored_risks else None
    
    return ChatResponse(
        answer=answer,
        top_risk=relevant_risk,
        evidence=evidence
    )
