import json
import logging
import httpx
from typing import List, Tuple
from app.config import settings
from app.models.schemas import CompanyNode, RelevanceVerdict
from app.services.news_providers.base import NormalizedArticle

async def assess_relevance(candidates: List[Tuple[NormalizedArticle, CompanyNode]]) -> List[RelevanceVerdict]:
    if not candidates:
        return []
        
    if not settings.groq_api_key:
        logging.warning("GROQ_API_KEY not set. Cannot run relevance gate.")
        return [RelevanceVerdict(candidate_index=i, relevant=True, reason="LLM unavailable") for i in range(len(candidates))]

    prompt = (
        "You are a supply chain risk analyst. Review the following news articles and the specific "
        "supplier node they were matched against. Determine if the article plausibly describes an event "
        "that would disrupt THIS SPECIFIC node's operations, given its industry, location, and what it supplies.\n"
        "Pay special attention to geographical and operational plausibility. For example, a national story about a flood "
        "does not necessarily affect a specific factory in a specific city unless the region/city matches or it is a "
        "nationwide shutdown. You must evaluate if it affects the node's specific city/region.\n\n"
        "Return STRICTLY a JSON object with a single key 'verdicts' containing an array of objects, one for each candidate, in the EXACT format:\n"
        "{\n"
        '  "verdicts": [\n'
        '    {"candidate_index": 0, "relevant": true, "reason": "Explanation..."},\n'
        '    {"candidate_index": 1, "relevant": false, "reason": "Explanation..."}\n'
        "  ]\n"
        "}\n\n"
        "Candidates:\n"
    )

    for i, (article, node) in enumerate(candidates):
        prompt += f"--- Candidate {i} ---\n"
        prompt += f"Node Name: {node.name}\n"
        prompt += f"Node Location: {node.country} - {node.city or 'Unknown City'}\n"
        prompt += f"Node Industry: {node.industry}\n"
        prompt += f"Node Supplies: {node.supplies_what or 'Unknown'}\n"
        prompt += f"Article Title: {article.title}\n"
        prompt += f"Article Description: {article.description or 'None'}\n"
        prompt += f"Article URL: {article.url or 'None'}\n\n"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"}, # Some models require {"type": "json_object"} but they return an object not an array. Wait, if it returns an object, I should ask for {"verdicts": [...]}.
                    "temperature": 0.1
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            
            # Strip markdown block if present
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            parsed = json.loads(content)
            verdicts = []
            for v in parsed.get("verdicts", []):
                verdicts.append(RelevanceVerdict(**v))
            return verdicts
    except Exception as e:
        logging.exception("Relevance gate LLM call failed")
        return [] # Empty list will signal failure to verify
