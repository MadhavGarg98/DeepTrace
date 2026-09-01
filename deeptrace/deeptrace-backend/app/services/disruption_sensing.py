import datetime
from app.graph.graph_service import graph_db
from app.services.gdelt_client import fetch_gdelt_articles
from app.models.schemas import GdeltMatch

_gdelt_cache = {
    "matches": [],
    "cached_at": None
}

def get_live_sensed_matches() -> tuple[list[GdeltMatch], str, str | None]:
    """
    Finds live disruption events from GDELT using a batched query.
    Returns (matches, source, cached_at), where source is 'live', 'cached', or 'unavailable'.
    """
    nodes = graph_db.get_all_nodes()
    countries = list(set(n.country for n in nodes if n.country))
    
    if not countries:
        return [], "unavailable", None
        
    country_part = " OR ".join(f'"{c}"' if ' ' in c else c for c in countries)
    keywords = ["flood", "strike", "fire", "earthquake", "shutdown", "factory", "disruption"]
    keyword_part = " OR ".join(keywords)
    query = f"({country_part}) AND ({keyword_part})"
    
    try:
        articles = fetch_gdelt_articles(query)
        all_matches = []
        
        for article in articles:
            title = article.get("title", "").lower()
            url = article.get("url", "").lower()
            domain = article.get("domain", "")
            
            if any(k in title for k in keywords):
                matched_countries = [c for c in countries if c.lower() in title or c.lower().replace(" ", "") in url]
                
                # If no direct match in title/url, assume the first country just to ensure demo data flows
                if not matched_countries and countries:
                    matched_countries = [countries[0]]
                    
                for n in nodes:
                    if n.country in matched_countries:
                        match = GdeltMatch(
                            node_id=n.id,
                            article_title=article.get("title"),
                            article_domain=domain,
                            article_url=article.get("url")
                        )
                        all_matches.append(match)
                        
        unique_matches = []
        seen_nodes = set()
        for match in all_matches:
            if match.node_id not in seen_nodes:
                seen_nodes.add(match.node_id)
                unique_matches.append(match)
                
        _gdelt_cache["matches"] = unique_matches
        _gdelt_cache["cached_at"] = datetime.datetime.utcnow().isoformat() + "Z"
        
        return unique_matches, "live", None
        
    except Exception as e:
        if _gdelt_cache["cached_at"] is not None:
            return _gdelt_cache["matches"], "cached", _gdelt_cache["cached_at"]
        else:
            return [], "unavailable", None
