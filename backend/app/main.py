from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, get_db
from sqlalchemy.orm import Session
import os

# Import routers
from app.routes import missions, readings, hotspots, upload, dashboard, ai, public, response, replay, hardware

from app.models.simulation import ResponseSimulation

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for QUDRACOPTER Air Quality Monitoring System.",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    settings.FRONTEND_URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    # 1. Database status
    db_status = "CONNECTED"
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "DISCONNECTED"
        
    # 2. AI status
    ai_status = "AVAILABLE" if (os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")) else "FALLBACK"
    
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "backend": "ONLINE",
        "database": db_status,
        "ai": ai_status,
        "gis": "READY"
    }

# Include routers
app.include_router(missions.router)
app.include_router(readings.router)
app.include_router(hotspots.router)
app.include_router(upload.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(public.router)
app.include_router(response.router)
app.include_router(replay.router)
app.include_router(hardware.router)
