from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    
    gdelt_cloud_api_key: Optional[str] = None
    newsapi_key: Optional[str] = None
    gnews_api_key: Optional[str] = None
    enable_legacy_gdelt_doc_api: bool = True
    news_provider_timeout_seconds: int = 8
    news_sense_total_budget_seconds: int = 20
    monitor_poll_interval_seconds: int = 20
    demo_time_scale: str = "1m=6h"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
