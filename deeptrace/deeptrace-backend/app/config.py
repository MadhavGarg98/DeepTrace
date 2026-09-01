from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gdelt_cloud_api_key: Optional[str] = None
    gdelt_timeout_seconds: float = 10.0
    gdelt_max_retries: int = 2

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
