import os
import httpx
import logging
from typing import List
from app.config import settings
from .base import NormalizedArticle, ProviderResult

class NewsAPIProvider:
    name = "newsapi"

    async def fetch_events(self, nodes: List[dict], timeout_seconds: int) -> ProviderResult:
        api_key = settings.newsapi_key
        if not api_key:
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message="Missing NEWSAPI_KEY"
            )

        url = "https://newsapi.org/v2/everything"
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
        # Fallback to simple query if too long for NewsAPI (max 500 chars)
        if len(final_query) > 500:
            simple_countries = " OR ".join(f'"{c}"' if ' ' in c else c for c in country_groups.keys())
            final_query = f"({simple_countries}) AND ({q_keywords})"
            if len(final_query) > 500:
                final_query = final_query[:500] # Best effort truncation

        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": final_query,
                    "apiKey": api_key,
                    "pageSize": 15,
                    "language": "en",
                    "sortBy": "publishedAt"
                }
                response = await client.get(url, params=params, timeout=timeout_seconds)
                response.raise_for_status()
                data = response.json()
                
                articles = []
                for item in data.get("articles", []):
                    source_name = item.get("source", {}).get("name", "")
                    articles.append(NormalizedArticle(
                        title=item.get("title", ""),
                        description=item.get("description"),
                        source_domain=source_name,
                        url=item.get("url"),
                        country=None,
                        published_at=None
                    ))
                return ProviderResult(success=True, provider_name=self.name, articles=articles)
        except Exception as e:
            logging.warning(f"NewsAPIProvider failed: {e}")
            return ProviderResult(
                success=False, 
                provider_name=self.name, 
                articles=[], 
                error_message=str(e)
            )
