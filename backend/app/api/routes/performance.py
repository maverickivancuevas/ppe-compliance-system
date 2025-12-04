from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from ...services.yolo_service import get_yolo_service
from ...core.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/performance", tags=["performance"])


class PerformanceSettings(BaseModel):
    """Performance settings model"""
    use_gpu: Optional[bool] = Field(None, description="Use GPU for inference (if available)")
    input_size: Optional[int] = Field(None, description="Input size for YOLO model (320, 416, 512, 640, 1280)")
    jpeg_quality: Optional[int] = Field(None, ge=1, le=100, description="JPEG compression quality (1-100)")
    confidence_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence threshold for detections (0.0-1.0)")
    iou_threshold: Optional[float] = Field(None, ge=0.0, le=1.0, description="IOU threshold for NMS (0.0-1.0)")


class PerformanceResponse(BaseModel):
    """Performance settings response"""
    device: str
    input_size: int
    jpeg_quality: int
    gpu_available: bool
    confidence_threshold: float
    iou_threshold: float
    max_det: int


@router.get("", response_model=PerformanceResponse)
async def get_performance_settings():
    """Get current performance settings"""
    try:
        yolo_service = get_yolo_service()
        settings = yolo_service.get_performance_settings()
        return PerformanceResponse(**settings)
    except Exception as e:
        logger.error(f"Error getting performance settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("", response_model=PerformanceResponse)
async def update_performance_settings(settings: PerformanceSettings):
    """Update performance settings"""
    try:
        yolo_service = get_yolo_service()

        # Update GPU/CPU setting
        if settings.use_gpu is not None:
            yolo_service.set_device(settings.use_gpu)

        # Update input size
        if settings.input_size is not None:
            yolo_service.set_input_size(settings.input_size)

        # Update JPEG quality
        if settings.jpeg_quality is not None:
            yolo_service.set_jpeg_quality(settings.jpeg_quality)

        # Update confidence threshold
        if settings.confidence_threshold is not None:
            yolo_service.set_confidence_threshold(settings.confidence_threshold)

        # Update IOU threshold
        if settings.iou_threshold is not None:
            yolo_service.set_iou_threshold(settings.iou_threshold)

        # Return updated settings
        updated_settings = yolo_service.get_performance_settings()
        logger.info(f"Updated performance settings: conf={updated_settings.get('confidence_threshold')}, iou={updated_settings.get('iou_threshold')}")
        return PerformanceResponse(**updated_settings)
    except Exception as e:
        logger.error(f"Error updating performance settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/toggle-gpu", response_model=PerformanceResponse)
async def toggle_gpu():
    """Toggle between CPU and GPU"""
    try:
        yolo_service = get_yolo_service()
        current_device = yolo_service.device

        # Toggle device
        use_gpu = current_device == 'cpu'
        yolo_service.set_device(use_gpu)

        # Return updated settings
        updated_settings = yolo_service.get_performance_settings()
        return PerformanceResponse(**updated_settings)
    except Exception as e:
        logger.error(f"Error toggling GPU: {e}")
        raise HTTPException(status_code=500, detail=str(e))
