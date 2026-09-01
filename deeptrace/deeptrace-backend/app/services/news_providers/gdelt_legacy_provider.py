import os
import httpx
import logging
from typing import List
from app.config import settings
from .base import NormalizedArticle, ProviderResult

class GdeltLegacyProvider:
    name = "gdelt_legacy"

    async def fetch_events(self, nodes: List[dict], timeout_seconds: int) -> ProviderResult:
        if not settings.enable_legacy_gdelt_doc_api:
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message="Legacy GDELT API disabled"
            )

        url = "https://api.gdeltproject.org/api/v2/doc/doc"
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
        if len(final_query) > 500:
            simple_countries = " OR ".join(f'"{c}"' if ' ' in c else c for c in country_groups.keys())
            final_query = f"({simple_countries}) AND ({q_keywords})"

        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "query": final_query,
                    "mode": "artlist",
                    "format": "json",
                    "maxrecords": "15",
                    "timespan": "3d"
                }
                # Legacy is unreliable, enforce short timeout
                response = await client.get(url, params=params, timeout=timeout_seconds)
                response.raise_for_status()
                data = response.json()
                
                articles = []
                for item in data.get("articles", []):
                    articles.append(NormalizedArticle(
                        title=item.get("title", ""),
                        description=item.get("seendate"), # GDELT legacy doesn't have a good description field, it uses seendate/url mostly
                        source_domain=item.get("domain"),
                        url=item.get("url"),
                        country=None,
                        published_at=None
                    ))
                return ProviderResult(success=True, provider_name=self.name, articles=articles)
        except Exception as e:
            logging.warning(f"GdeltLegacyProvider failed: {e}")
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message=str(e)
            )
