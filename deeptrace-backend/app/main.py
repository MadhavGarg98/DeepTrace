from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.utils.logging import setup_logging
from app.routers import chat, risks, analytics, disruptions, graph, suppliers

# Setup logging
setup_logging()

app = FastAPI(title="DeepTrace Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this. The spec asks to be permissive enough for localhost:5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(risks.router, prefix="/api/v1/risks", tags=["Risks"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(disruptions.router, prefix="/api/v1/disruptions", tags=["Disruptions"])
app.include_router(graph.router, prefix="/api/v1/graph", tags=["Graph"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
@app.get("/")
def health_check():
    return {"status": "ok", "message": "DeepTrace Backend is running."}
