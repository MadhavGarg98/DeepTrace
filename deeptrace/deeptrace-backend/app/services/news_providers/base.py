from pydantic import BaseModel
from typing import Optional, Protocol, List
import datetime

class NormalizedArticle(BaseModel):
    title: str
    description: Optional[str] = None
    source_domain: Optional[str]
    url: Optional[str]
    country: Optional[str]
    published_at: Optional[datetime.datetime]

class ProviderResult(BaseModel):
    success: bool
    provider_name: str
    articles: List[NormalizedArticle]
    error_message: Optional[str] = None

class NewsProvider(Protocol):
    name: str
    async def fetch_events(self, nodes: List[dict], timeout_seconds: int) -> ProviderResult:
        ...
