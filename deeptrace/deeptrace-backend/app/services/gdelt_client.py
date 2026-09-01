import requests
import logging
import time

def fetch_gdelt_articles(query: str) -> list[dict]:
    """
    Call the GDELT 2.0 DOC API with a combined boolean query.
    """
    base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": "15",
        "timespan": "3d"
    }
    
    for attempt in range(2):
        try:
            response = requests.get(base_url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return data.get("articles", [])
        except Exception as e:
            logging.warning(f"GDELT fetch failed (attempt {attempt + 1}/2): {e}")
            if attempt == 0:
                time.sleep(1)
            else:
                raise e
