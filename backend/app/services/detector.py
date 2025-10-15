"""
YOLO PPE Detection Service
"""
from ultralytics import YOLO
from ..core.config import settings
from ..core.logger import get_logger
from ..core.exceptions import ModelLoadError, ConfigurationError
import os

logger = get_logger(__name__)

# Global detector instance
_detector = None


def get_detector():
    """
    Get or initialize the YOLO detector instance

    Returns singleton instance of YOLO model
    """
    global _detector

    if _detector is None:
        try:
            # Get absolute model path from settings
            model_path = settings.get_absolute_model_path()

            # Check if model exists
            if not os.path.exists(model_path):
                raise ConfigurationError(
                    f"YOLO model not found at: {model_path}",
                    details={
                        "model_path": model_path,
                        "suggestion": "Configure MODEL_PATH in your .env file (use absolute path recommended)"
                    }
                )

            logger.info(f"Loading YOLO model from: {model_path}")
            _detector = YOLO(model_path)
            logger.info("YOLO model loaded successfully!")

        except ConfigurationError:
            raise
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}", exc_info=True)
            raise ModelLoadError(
                f"Failed to load YOLO model from {model_path}",
                details={"error": str(e), "model_path": model_path}
            )

    return _detector


def reset_detector():
    """Reset the detector instance (useful for testing)"""
    global _detector
    _detector = None
