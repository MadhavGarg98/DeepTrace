import json
import os
import logging
from typing import Optional
from app.models.schemas import SenseResponse

CACHE_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "last_sense_cache.json")

class SenseCache:
    def __init__(self):
        os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
        
    def save(self, response: SenseResponse) -> None:
        try:
            with open(CACHE_FILE, "w") as f:
                f.write(response.model_dump_json())
        except Exception as e:
            logging.error(f"Failed to save sense cache: {e}")
            
    def load_last_known_good(self) -> Optional[SenseResponse]:
        if not os.path.exists(CACHE_FILE):
            return None
        try:
            with open(CACHE_FILE, "r") as f:
                data = json.load(f)
                return SenseResponse(**data)
        except Exception as e:
            logging.error(f"Failed to load sense cache: {e}")
            return None

sense_cache = SenseCache()
