from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
import sys


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "PPE Compliance System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "sqlite:///./ppe_compliance.db"

    # JWT
    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_RANDOM_KEY_USE_OPENSSL_RAND_HEX_32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 52428800  # 50MB

    # Video Settings
    VIDEO_STREAM_FPS: int = 30
    CONFIDENCE_THRESHOLD: float = 0.50

    # YOLO Model
    MODEL_PATH: str = "../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt"

    # Default Admin User (loaded from environment)
    DEFAULT_ADMIN_EMAIL: str = "admin@example.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"
    DEFAULT_ADMIN_NAME: str = "System Administrator"

    class Config:
        env_file = ".env"
        case_sensitive = True

    def get_allowed_origins(self) -> List[str]:
        """Parse comma-separated CORS origins"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    def ensure_directories(self):
        """Create necessary directories if they don't exist"""
        Path(self.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    def get_absolute_model_path(self) -> str:
        """Get absolute path to YOLO model, resolving relative paths"""
        model_path = Path(self.MODEL_PATH)

        # If already absolute, return as string
        if model_path.is_absolute():
            return str(model_path)

        # Resolve relative to backend directory
        backend_dir = Path(__file__).parent.parent.parent
        absolute_path = (backend_dir / model_path).resolve()

        return str(absolute_path)


settings = Settings()
settings.ensure_directories()

# Security validation for production
if settings.ENVIRONMENT == "production":
    if settings.DEFAULT_ADMIN_PASSWORD == "admin123":
        raise ValueError(
            "CRITICAL SECURITY ERROR: Default admin password 'admin123' detected in production! "
            "You MUST set DEFAULT_ADMIN_PASSWORD environment variable to a strong password."
        )
    if settings.SECRET_KEY == "CHANGE_THIS_TO_A_SECURE_RANDOM_KEY_USE_OPENSSL_RAND_HEX_32":
        raise ValueError(
            "CRITICAL SECURITY ERROR: Default SECRET_KEY detected in production! "
            "You MUST set SECRET_KEY environment variable to a secure random key."
        )
