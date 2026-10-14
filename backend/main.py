"""
Industry Verse AI - Industrial AI Factory Brain
FastAPI Backend Entry Point
"""

import os
# ── Disable telemetry BEFORE ChromaDB imports ──
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
from dotenv import load_dotenv

# ── Load Environment Variables ─────────────────
load_dotenv()

# ── Logging Setup ──────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IndustryVerseAI")

# ── Import Routers ─────────────────────────────
from routers.upload_router import router as upload_router
from routers.failure_router import router as failure_router
from routers.rootcause_router import router as rootcause_router
from routers.maintenance_router import router as maintenance_router
from routers.cost_router import router as cost_router
from routers.digitaltwin_router import router as digitaltwin_router
from routers.chat_router import router as chat_router
from routers.websocket_router import router as websocket_router
from routers.hitl_router import router as hitl_router
from routers.simulation_router import router as simulation_router

# ── Initialize App ─────────────────────────────
app = FastAPI(
    title="Industry Verse AI API",
    description="Industrial Intelligence Platform for Predictive Maintenance & Digital Twin",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ───────────────────────────
app.include_router(upload_router, prefix="/api", tags=["Upload & Ingest"])
app.include_router(failure_router, prefix="/api", tags=["Failure Prediction"])
app.include_router(rootcause_router, prefix="/api", tags=["Root Cause Analysis"])
app.include_router(maintenance_router, prefix="/api", tags=["Maintenance Planning"])
app.include_router(cost_router, prefix="/api", tags=["Cost Planning"])
app.include_router(digitaltwin_router, prefix="/api", tags=["Digital Twin"])
app.include_router(chat_router, prefix="/api", tags=["AI RAG Chat"])
app.include_router(simulation_router, prefix="/api", tags=["3D Simulation"])
app.include_router(hitl_router, prefix="/api", tags=["Human-in-the-Loop"])

# WebSocket Stream Router (for 3D simulation and digital twin telemetry)
app.include_router(websocket_router)

# ── Health Endpoints ───────────────────────────
from db.database import init_db

@app.on_event("startup")
async def on_startup():
    logger.info("Initializing database and verifying tables...")
    init_db()
    logger.info("Database initialized.")

@app.get("/")
async def root():
    return {
        "message": "Industry Verse AI API",
        "status": "operational",
        "version": "1.0.0",
        "models": [
            "failure_prediction_and_root_cause",
            "maintenance_and_cost_planning",
            "ai_rag_chatbot",
            "digital_twin",
            "3d_simulation_and_models"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "Industry Verse AI",
        "version": "1.0.0"
    }

# ── Run Server ─────────────────────────────────
if __name__ == "__main__":
    logger.info("🔥 Starting Industry Verse AI Backend...")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )