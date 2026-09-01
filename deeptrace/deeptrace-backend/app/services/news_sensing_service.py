import os
import datetime
import asyncio
import logging
from app.config import settings
from app.graph.graph_service import graph_db
from app.models.schemas import GdeltMatch, SenseResponse, MetaResponse
from app.services.sense_cache import sense_cache
from app.services.relevance_gate import assess_relevance

from .news_providers.gdelt_cloud_provider import GdeltCloudProvider
from .news_providers.newsapi_provider import NewsAPIProvider
from .news_providers.gnews_provider import GNewsProvider
from .news_providers.gdelt_legacy_provider import GdeltLegacyProvider

async def sense_disruptions() -> SenseResponse:
    timeout_seconds = settings.news_provider_timeout_seconds
    total_budget = settings.news_sense_total_budget_seconds
    
    nodes = graph_db.get_all_nodes()
    countries = list(set(n.country for n in nodes if n.country))
    
    if not countries:
        return SenseResponse(
            status="unavailable",
            provider_used=None,
            fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
            matches_found=0,
            matches=[],
            meta=MetaResponse()
        )
        
    providers = [
        GdeltCloudProvider(),
        NewsAPIProvider(),
        GNewsProvider(),
        GdeltLegacyProvider()
    ]
    
    # Pre-calculate node dictionaries for faster lookup
    node_by_country = {}
    for n in nodes:
        if n.country:
            node_by_country.setdefault(n.country, []).append(n)
            
    # Generic disruption keywords (Fix 2)
    disruption_keywords = {"flood", "strike", "fire", "earthquake", "shutdown", "factory", "disruption", "outage"}
    
    async def try_providers():
        # Pass full nodes list to allow industry/supplies context
        nodes_dicts = [n.model_dump() for n in nodes]
        for provider in providers:
            result = await provider.fetch_events(nodes_dicts, timeout_seconds)
            if result.success:
                return result
        return None
        
    try:
        successful_result = await asyncio.wait_for(try_providers(), timeout=total_budget)
    except asyncio.TimeoutError:
        logging.warning("News sensing total budget timeout exceeded")
        successful_result = None
        
    if successful_result:
        all_candidates = []
        for article in successful_result.articles:
            title = (article.title or "").lower()
            desc = (article.description or "").lower()
            url = (article.url or "").lower()
            
            # Fix 2: Hard Keyword Gate
            # The article MUST contain at least one disruption keyword in title or description
            has_keyword = any(kw in title or kw in desc for kw in disruption_keywords)
            if not has_keyword:
                continue
                
            # Fix 5: Correct Country/Location Matching
            # Match only if provider explicitly tags the country OR the country name is literally in title/desc
            matched_countries = []
            if article.country:
                matched_countries = [article.country]
            else:
                for c in countries:
                    if c.lower() in title or c.lower() in desc:
                        matched_countries.append(c)
                        
            if not matched_countries:
                continue
                
            for c in matched_countries:
                for n in node_by_country.get(c, []):
                    all_candidates.append((article, n))
                    
        # Fix 4: Deduplication
        # Dedup by (article_url or title, node_id)
        unique_candidates = []
        seen = set()
        for article, n in all_candidates:
            key = (article.url or article.title, n.id)
            if key not in seen:
                seen.add(key)
                unique_candidates.append((article, n))
                
        final_matches = []
        
        # Fix 3: LLM Relevance Gate
        if unique_candidates:
            verdicts = await assess_relevance(unique_candidates)
            
            # Create a lookup mapping from verdicts
            verdict_map = {v.candidate_index: v for v in verdicts}
            
            for i, (article, n) in enumerate(unique_candidates):
                verdict = verdict_map.get(i)
                # If LLM failed/timed out, it returns empty list.
                # Do NOT surface keyword-only matches. Only matches explicitly marked relevant=true survive.
                if verdict and verdict.relevant:
                    match = GdeltMatch(
                        node_id=n.id,
                        article_title=article.title,
                        article_domain=article.source_domain or "",
                        article_url=article.url or "",
                        verified=True
                    )
                    final_matches.append(match)
                # If relevant == false or LLM failed, we discard it entirely.
                
        response = SenseResponse(
            status="ok",
            provider_used=successful_result.provider_name,
            fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
            matches_found=len(final_matches),
            matches=final_matches,
            meta=MetaResponse()
        )
        sense_cache.save(response)
        return response
        
    cached = sense_cache.load_last_known_good()
    if cached:
        cached.status = "cached"
        return cached
        
    return SenseResponse(
        status="unavailable",
        provider_used=None,
        fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
        matches_found=0,
        matches=[],
        meta=MetaResponse()
    )
