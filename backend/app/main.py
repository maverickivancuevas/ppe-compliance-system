from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .core.config import settings
from .core.database import init_db, get_db
from .core.security import get_password_hash
from .core.logger import get_logger
from .models.user import User, UserRole
from .api.routes import auth, users, cameras, detections
from .api import alerts
from .api.websocket import manager, start_stream_handler

# Initialize logger
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PPE Compliance Monitoring System with Real-time Detection"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and create default admin user"""
    init_db()

    # Create default admin user if no users exist
    from .core.database import SessionLocal
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0:
            default_admin = User(
                email=settings.DEFAULT_ADMIN_EMAIL,
                full_name=settings.DEFAULT_ADMIN_NAME,
                hashed_password=get_password_hash(settings.DEFAULT_ADMIN_PASSWORD),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            logger.warning("=" * 60)
            logger.warning("Default admin user created:")
            logger.warning(f"Email: {settings.DEFAULT_ADMIN_EMAIL}")
            logger.warning(f"Password: {settings.DEFAULT_ADMIN_PASSWORD}")
            logger.warning("CRITICAL: CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!")
            logger.warning("=" * 60)
    finally:
        db.close()

    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} started!")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API Docs: http://{settings.HOST}:{settings.PORT}/docs")


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(detections.router, prefix="/api")
app.include_router(alerts.router)


# WebSocket endpoint for video streaming
@app.websocket("/ws/stream/{camera_id}")
async def websocket_stream(
    websocket: WebSocket,
    camera_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time video streaming"""
    await manager.connect(websocket, camera_id)
    try:
        await start_stream_handler(camera_id, websocket, db)
    finally:
        manager.disconnect(websocket, camera_id)


# WebSocket endpoint for monitoring (alias for compatibility)
@app.websocket("/ws/monitor/{camera_id}")
async def websocket_monitor(
    websocket: WebSocket,
    camera_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time PPE monitoring"""
    await manager.connect(websocket, camera_id)
    try:
        await start_stream_handler(camera_id, websocket, db)
    finally:
        manager.disconnect(websocket, camera_id)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
