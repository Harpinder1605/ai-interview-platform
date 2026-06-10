import os
import logging
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database.db import engine, Base, get_db
from models.user import User
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn # Moved uvicorn import here for conventional placement.
from models.analytics import InterviewAnalytics
from models.evaluation import InterviewEvaluation
from api.auth import router as auth_router
from api.vision import router as vision_router
from api.analytics import router as analytics_router
from api.speech import router as speech_router
from api.evaluation import router as evaluation_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="AI Interview Intelligence Platform API", 
    description="Backend engine for AI mock interviews, speech analysis, and computer vision.",
    version="1.0.0"
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler) #Type: ignore

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configure CORS for frontend communication
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if ENVIRONMENT == "production":
    allowed_origins = [FRONTEND_URL]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include the Authentication routes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(vision_router, prefix="/api/vision", tags=["Vision Engine"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(speech_router, prefix="/api/speech", tags=["Speech Engine"])
app.include_router(evaluation_router, prefix="/api/evaluation", tags=["Evaluation"])

@app.get("/")
async def root():
    return {"message": "Welcome to the AI Interview API Engine"}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "Core API",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

if __name__ == "__main__":
    environment = os.getenv("ENVIRONMENT", "development")
    reload_enabled = environment == "development"
    
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=reload_enabled, log_level="info")
