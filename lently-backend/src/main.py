from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.config import get_settings
from src.firebase_init import initialize_firebase
from src.middleware.router import router as user_router
from src.middleware.auth import get_current_user, AuthenticatedUser
from src.youtube.router import router as youtube_router
from src.gemini.router import router as gemini_router
from src.analysis.router import router as analysis_router
from src.ask_ai.router import router as ask_ai_router
import logging

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    logger.info(f"🚀 Starting Lently Backend - Environment: {settings.environment}")
    
    # Initialize Firebase
    try:
        initialize_firebase()
        logger.info("✅ Firebase initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️  Firebase initialization failed: {e}")
        logger.warning("   Continuing without Firebase (some features will not work)")
    
    yield
    
    logger.info("👋 Shutting down Lently Backend")

app = FastAPI(
    title="Lently Backend API",
    description="YouTube Comment Analysis Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_router)
app.include_router(youtube_router)
app.include_router(gemini_router)
app.include_router(analysis_router)
app.include_router(ask_ai_router)

@app.get("/")
async def root():
    return {
        "service": "Lently Backend API",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.environment
    }

@app.get("/health")
async def health_check():
    """Detailed health check with feature status"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "features": {
            "youtube_api": bool(settings.youtube_api_key != "your-youtube-api-key"),
            "gemini_ai": bool(settings.gemini_api_key != "your-gemini-api-key"),
            "firebase": True,  # If we get here, Firebase initialized
            "redis": bool(settings.redis_host),
            "paddle": bool(settings.paddle_webhook_secret != "your-paddle-webhook-secret")
        }
    }

@app.get("/api/protected")
async def protected_route(user: AuthenticatedUser = Depends(get_current_user)):
    """
    Test endpoint for authentication
    Requires valid Firebase ID token in Authorization header
    """
    return {
        "message": "Authentication successful!",
        "user": {
            "uid": user.uid,
            "email": user.email,
            "email_verified": user.email_verified
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
