from fastapi import FastAPI, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pathlib import Path
from .core.config import settings
from .core.database import init_db, get_db
from .core.security import get_password_hash
from .core.logger import get_logger
from .models.user import User, UserRole
from .api.routes import auth, users, cameras, detections, workers, attendance, admin, performance
from .api.routes import settings as settings_router
from .api import alerts, analytics
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

# Mount static files for uploads
uploads_dir = Path(settings.UPLOAD_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database"""
    init_db()

    # No default admin - first user to register via OTP becomes super_admin
    logger.info("Database initialized. Register the first user to become super admin.")

    # Start background archiving service
    from .services.archiving_service import get_archiving_service
    archiving_service = get_archiving_service(archive_days=30)
    archiving_service.start_background_task(interval_hours=24)

    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} started!")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"API Docs: http://{settings.HOST}:{settings.PORT}/docs")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    # Stop background archiving service
    from .services.archiving_service import get_archiving_service
    archiving_service = get_archiving_service()
    archiving_service.stop_background_task()
    logger.info(f"{settings.APP_NAME} shutdown complete")


# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(cameras.router, prefix="/api")
app.include_router(detections.router, prefix="/api")
app.include_router(alerts.router)
app.include_router(analytics.router)
# Worker Management routers
app.include_router(workers.router, prefix="/api/workers", tags=["workers"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
# Admin routers
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
# Settings routers
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
# Performance routers
app.include_router(performance.router)


# WebSocket endpoint for monitoring
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


# System health endpoint
@app.get("/api/system/health")
async def system_health(db: Session = Depends(get_db)):
    """Get detailed system health status"""
    from .services.yolo_service import get_yolo_service

    health_status = {
        "backend": {
            "status": "online",
            "message": "Backend API is running"
        },
        "database": {
            "status": "connected",
            "message": "Database is connected"
        },
        "yolo_model": {
            "status": "unknown",
            "message": "Model status unknown"
        }
    }

    # Check database connection
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        health_status["database"]["status"] = "connected"
        health_status["database"]["message"] = "Database connection successful"
    except Exception as e:
        health_status["database"]["status"] = "error"
        health_status["database"]["message"] = f"Database error: {str(e)}"
        logger.error(f"Database health check failed: {e}")

    # Check YOLO model
    try:
        yolo_service = get_yolo_service()
        if yolo_service.model is not None:
            health_status["yolo_model"]["status"] = "loaded"
            health_status["yolo_model"]["message"] = f"Model loaded with {len(yolo_service.model.names)} classes"
        else:
            health_status["yolo_model"]["status"] = "not_loaded"
            health_status["yolo_model"]["message"] = "Model not loaded"
    except Exception as e:
        health_status["yolo_model"]["status"] = "error"
        health_status["yolo_model"]["message"] = f"Model error: {str(e)}"
        logger.error(f"YOLO model health check failed: {e}")

    return health_status


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
