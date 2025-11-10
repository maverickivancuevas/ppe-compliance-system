"""
YOLO PPE Detection Service
"""
from ultralytics import YOLO
import torch
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

            # Check for GPU availability with intelligent fallback
            device = 'cuda' if torch.cuda.is_available() else 'cpu'

            if device == 'cuda':
                logger.info(f"✓ GPU detected - Using CUDA acceleration")
                logger.info(f"  GPU Model: {torch.cuda.get_device_name(0)}")
                logger.info(f"  CUDA Version: {torch.version.cuda}")
                logger.info(f"  Expected performance: ~30ms per frame (33+ FPS)")
            else:
                logger.info(f"✓ No GPU detected - Using CPU")
                logger.info(f"  This is normal for systems without NVIDIA GPU")
                logger.info(f"  Expected performance: ~50-200ms per frame (5-20 FPS)")
                logger.info(f"  Tip: For better performance, consider using a system with GPU")

            logger.info(f"Loading YOLO model from: {model_path}")
            _detector = YOLO(model_path)

            # Move model to GPU if available
            _detector.to(device)

            # Enable FP16 (half precision) for GPU inference only
            if device == 'cuda':
                try:
                    # Warm-up run with FP16
                    import numpy as np
                    dummy_frame = np.zeros((640, 640, 3), dtype=np.uint8)
                    _ = _detector.predict(dummy_frame, half=True, verbose=False)
                    logger.info("  FP16 (half precision) enabled for 40% faster inference")
                except Exception as e:
                    logger.warning(f"  Could not enable FP16: {e}. Using FP32 instead.")
            else:
                # CPU mode - no FP16 needed
                logger.info("  Using FP32 (full precision) for CPU inference")

            logger.info(f"✓ YOLO model loaded successfully on {device.upper()}!")

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
