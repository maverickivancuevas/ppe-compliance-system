"""
Custom exception classes for PPE Compliance System
"""
from fastapi import HTTPException, status
from typing import Optional


class PPEComplianceException(Exception):
    """Base exception for PPE Compliance System"""
    def __init__(self, message: str, details: Optional[dict] = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


class DatabaseError(PPEComplianceException):
    """Database operation failed"""
    pass


class ModelLoadError(PPEComplianceException):
    """Failed to load YOLO model"""
    pass


class CameraConnectionError(PPEComplianceException):
    """Failed to connect to camera stream"""
    pass


class VideoProcessingError(PPEComplianceException):
    """Error processing video frame"""
    pass


class DetectionSaveError(DatabaseError):
    """Failed to save detection to database"""
    pass


class AuthenticationError(HTTPException):
    """Authentication failed"""
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class AuthorizationError(HTTPException):
    """User not authorized for this action"""
    def __init__(self, detail: str = "Not authorized"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class ResourceNotFoundError(HTTPException):
    """Requested resource not found"""
    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id '{resource_id}' not found"
        )


class ValidationError(HTTPException):
    """Input validation failed"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class ConfigurationError(PPEComplianceException):
    """System configuration error"""
    pass


# HTTP Exception handlers
def create_http_exception(
    status_code: int,
    detail: str,
    headers: Optional[dict] = None
) -> HTTPException:
    """
    Create an HTTP exception with standard format

    Args:
        status_code: HTTP status code
        detail: Error detail message
        headers: Optional headers dict

    Returns:
        HTTPException instance
    """
    return HTTPException(
        status_code=status_code,
        detail=detail,
        headers=headers
    )
