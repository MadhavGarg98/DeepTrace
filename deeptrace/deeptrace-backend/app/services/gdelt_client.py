import requests
import logging
import time
from app.config import settings


class GdeltUnavailableError(Exception):
    """Raised when a GDELT endpoint cannot be reached."""


def _fetch_gdelt_cloud_events(timeout: float, max_retries: int) -> list[dict]:
    """Fetch recent events from GDELT Cloud using the configured API key."""
    response = None
    for attempt in range(max_retries):
        try:
            response = requests.get(
                "https://gdeltcloud.com/api/v2/events",
                params={"limit": "15"},
                headers={"Authorization": f"Bearer {settings.gdelt_cloud_api_key}"},
                timeout=timeout,
            )
            response.raise_for_status()
            return response.json().get("data", [])
        except requests.RequestException as e:
            logging.warning(
                "GDELT Cloud fetch failed (attempt %s/%s): %s",
                attempt + 1,
                max_retries,
                e,
            )
            if attempt < max_retries - 1:
                time.sleep(1)

    raise GdeltUnavailableError("GDELT Cloud endpoint unavailable after all retries")


def fetch_gdelt_articles(query: str) -> list[dict]:
    """
    Fetch recent GDELT events in the format expected by disruption sensing.
    Prefer GDELT Cloud when an API key is configured; otherwise use DOC API.
    """
    max_retries = max(1, settings.gdelt_max_retries)
    timeout = max(1.0, settings.gdelt_timeout_seconds)

    if settings.gdelt_cloud_api_key:
        return _fetch_gdelt_cloud_events(timeout, max_retries)

    base_url = "https://api.gdeltproject.org/api/v2/doc/doc"
    params = {
        "query": query,
        "mode": "artlist",
        "format": "json",
        "maxrecords": "15",
        "timespan": "3d"
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(base_url, params=params, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            return data.get("articles", [])
        except requests.RequestException as e:
            logging.warning(
                "GDELT fetch failed (attempt %s/%s): %s",
                attempt + 1,
                max_retries,
                e,
            )
            if attempt < max_retries - 1:
                time.sleep(1)

    raise GdeltUnavailableError("GDELT endpoint unavailable after all retries")
