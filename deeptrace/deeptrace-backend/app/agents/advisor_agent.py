import json
from pydantic import BaseModel, ValidationError
from app.models.schemas import RiskChain
from app.services.llm_client import generate_json_completion
from app.services.audit_log import append_log

class LLMResponseSchema(BaseModel):
    explanation: str
    recommendation: str

def get_advice_for_risk(risk: RiskChain) -> tuple[str, str]:
    """
    Makes one LLM call to get an explanation and recommendation.
    Retries once with stricter JSON prompt if it fails.
    Returns (explanation, recommendation).
    """
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