"""
Run script for PPE Compliance Backend
"""
import uvicorn
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"Server will be available at: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"Alternative docs: http://{settings.HOST}:{settings.PORT}/redoc")
    logger.info("\nPress CTRL+C to stop the server\n")

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
