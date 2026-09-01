import os
import httpx
import logging
from typing import List
from app.config import settings
from .base import NormalizedArticle, ProviderResult

class GdeltCloudProvider:
    name = "gdelt_cloud"

    async def fetch_events(self, nodes: List[dict], timeout_seconds: int) -> ProviderResult:
        api_key = settings.gdelt_cloud_api_key
        if not api_key:
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message="Missing GDELT_CLOUD_API_KEY"
            )

        url = "https://api.gdeltcloud.com/v1/events"
        
        # Build query grouped by country to fit node contexts (industry)
        keywords = ["flood", "strike", "fire", "earthquake", "shutdown", "factory", "disruption"]
        q_keywords = " OR ".join(keywords)
        
        country_groups = {}
        for n in nodes:
            c = n.get("country")
            if c:
                if c not in country_groups:
                    country_groups[c] = set()
                ind = n.get("industry")
                if ind:
                    country_groups[c].add(ind)

        # Example grouped query: (Taiwan AND (semiconductor) AND (flood...)) OR (China AND (flood...))
        query_parts = []
        for c, industries in country_groups.items():
            c_term = f'"{c}"' if ' ' in c else c
            if industries:
                ind_term = " OR ".join(industries)
                query_parts.append(f"({c_term} AND ({ind_term}) AND ({q_keywords}))")
            else:
                query_parts.append(f"({c_term} AND ({q_keywords}))")
                
        if not query_parts:
            return ProviderResult(success=True, provider_name=self.name, articles=[])
            
        final_query = " OR ".join(query_parts)

        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {api_key}"}
                params = {
                    "query": final_query,
                    "limit": 15
                }
                response = await client.get(url, headers=headers, params=params, timeout=timeout_seconds)
                response.raise_for_status()
                data = response.json()
                
                articles = []
                for item in data.get("events", []):
                    articles.append(NormalizedArticle(
                        title=item.get("title", ""),
                        description=item.get("description"),
                        source_domain=item.get("domain"),
                        url=item.get("url"),
                        country=item.get("country"),
                        published_at=None
                    ))
                return ProviderResult(success=True, provider_name=self.name, articles=articles)
        except Exception as e:
            logging.warning(f"GdeltCloudProvider failed: {e}")
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message=str(e)
            )
