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

    context = "Here are the top detected risks in the supply chain:\n"
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
        "Use the provided context about the current supply chain risks to answer the user's questions. "
        "Keep your answers concise, professional, and data-driven. "
        "If the user asks about a specific supplier, check if they are mentioned in the risks context. "
        "If the user is just making small talk (like saying 'hi' or 'hello'), reply naturally as an AI supply chain assistant, introducing yourself."
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
        answer = f"Error communicating with AI model: {str(e)}"

    relevant_risk = scored_risks[0] if scored_risks else None
    
    return ChatResponse(
        answer=answer,
        top_risk=relevant_risk,
        evidence=evidence
    )
