import json
from pydantic import BaseModel, ValidationError
from app.models.schemas import RiskChain
from app.services.llm_client import generate_json_completion
from app.services.audit_log import append_log

class LLMResponseSchema(BaseModel):
    explanation: str
    recommendation: str

class LLMImpactSchema(BaseModel):
    reasoning: str
    next_steps: list[str]

def suggest_reroute(chain: RiskChain) -> tuple[str | None, str | None]:
    from app.graph.graph_service import graph_db
    alternate = graph_db.find_alternate_supplier(chain)
    if alternate:
        return alternate.id, alternate.name
    return None, None

def get_advice_for_risk(risk: RiskChain) -> tuple[str, str]:
    """
    Makes one LLM call to get an explanation and recommendation.
    Retries once with stricter JSON prompt if it fails.
    Returns (explanation, recommendation).
    """
    alt_id, alt_name = suggest_reroute(risk)
    risk.suggested_reroute_node_id = alt_id
    risk.suggested_reroute_node_name = alt_name

    system_prompt = (
        "You are an expert supply chain risk advisor. Analyze the provided supply chain convergence risk. "
        "Return EXACTLY a JSON object with two string keys: 'explanation' (2-3 sentences plain language) "
        "and 'recommendation' (1 specific, actionable sentence). RETURN ONLY VALID JSON. NO MARKDOWN OR PROSE."
    )
    
    user_prompt = (
        f"Bottleneck Node ID: {risk.bottleneck_node_id}\n"
        f"Affected Tier 1 Suppliers: {', '.join(risk.affected_tier1_suppliers)}\n"
        f"Risk Score: {risk.score}\n"
        f"Evidence: {'; '.join(risk.evidence)}\n"
    )
    
    for attempt in range(2):
        raw_response = generate_json_completion(system_prompt, user_prompt)
        if raw_response:
            try:
                parsed = json.loads(raw_response)
                validated = LLMResponseSchema(**parsed)
                append_log(
                    agent_name="advisor",
                    action="recommendation_generated",
                    detail=(
                        f"Generated recommendation for '{risk.bottleneck_node_id}': "
                        f"{validated.recommendation}"
                    ),
                    risk_id=risk.id,
                )
                return validated.explanation, validated.recommendation
            except (json.JSONDecodeError, ValidationError) as e:
                import logging
                logging.warning(f"Failed to parse LLM response on attempt {attempt+1}: {e}")
                continue
                
    # Fallback if both attempts fail or if no LLM key is present
    fallback_explanation = (
        f"Multiple Tier 1 suppliers depend on {risk.bottleneck_node_id}, creating a hidden bottleneck."
    )
    fallback_recommendation = (
        f"Identify alternative suppliers for {risk.bottleneck_node_id} or increase safety stock at Tier 1."
    )

    append_log(
        agent_name="advisor",
        action="recommendation_fallback",
        detail=(
            f"LLM call unavailable or failed twice for '{risk.bottleneck_node_id}'; "
            f"used the deterministic fallback recommendation instead."
        ),
        risk_id=risk.id,
    )
    return fallback_explanation, fallback_recommendation

def assess_reroute_impact(risk: RiskChain) -> tuple[str, list[str]]:
    """
    Called upon approval. Returns (reasoning, next_steps) assessing the impact
    of the suggested reroute.
    """
    if not risk.suggested_reroute_node_id:
        return "No alternate supplier available to reroute.", []
        
    system_prompt = (
        "You are an expert supply chain risk advisor. The user has just approved a reroute recommendation. "
        "Return EXACTLY a JSON object with two keys:\n"
        "- 'reasoning' (a short plain-language reasoning for why this specific reroute target was chosen, tie it to evidence/industry)\n"
        "- 'next_steps' (an array of 2-4 concrete strings representing actions the user should take before executing, based on the node data)\n"
        "RETURN ONLY VALID JSON. NO MARKDOWN OR PROSE."
    )
    
    user_prompt = (
        f"Bottleneck Node ID: {risk.bottleneck_node_id}\n"
        f"Approved Reroute Target: {risk.suggested_reroute_node_id} ({risk.suggested_reroute_node_name})\n"
        f"Affected Tier 1 Suppliers: {', '.join(risk.affected_tier1_suppliers)}\n"
        f"Path Confidence: {risk.min_confidence_along_path}\n"
        f"Total Revenue At Risk: {risk.total_revenue_at_risk}\n"
        f"Provide the reasoning and next_steps."
    )
    
    for attempt in range(2):
        raw_response = generate_json_completion(system_prompt, user_prompt)
        if raw_response:
            try:
                parsed = json.loads(raw_response)
                validated = LLMImpactSchema(**parsed)
                return validated.reasoning, validated.next_steps
            except (json.JSONDecodeError, ValidationError) as e:
                import logging
                logging.warning(f"Failed to parse LLM impact response on attempt {attempt+1}: {e}")
                continue
                
    # Fallback
    return (
        f"Rerouting to {risk.suggested_reroute_node_name} is recommended because it is a viable alternate for {risk.bottleneck_node_id}.",
        [
            f"Confirm {risk.suggested_reroute_node_name} has capacity to absorb combined volume from {len(risk.affected_tier1_suppliers)} suppliers.",
            "Consider whether to split affected suppliers across multiple alternates instead of a single new dependency."
        ]
    )