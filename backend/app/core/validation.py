"""
Input validation utilities for API endpoints
"""
from fastapi import HTTPException, status
from typing import Optional
import re
from pathlib import Path


class ValidationError(HTTPException):
    """Custom validation error"""
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


def validate_email(email: str) -> str:
    """
    Validate email format

    Args:
        email: Email address to validate

    Returns:
        Validated email (lowercased)

    Raises:
        ValidationError: If email format is invalid
    """
    email = email.strip().lower()

    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if not re.match(pattern, email):
        raise ValidationError(f"Invalid email format: {email}")

    if len(email) > 255:
        raise ValidationError("Email address too long (max 255 characters)")

    return email


def validate_password(password: str, min_length: int = 8) -> str:
    """
    Validate password strength

    Args:
        password: Password to validate
        min_length: Minimum password length (default: 8)

    Returns:
        Validated password

    Raises:
        ValidationError: If password doesn't meet requirements
    """
    if len(password) < min_length:
        raise ValidationError(f"Password must be at least {min_length} characters long")

    if len(password) > 128:
        raise ValidationError("Password too long (max 128 characters)")

    # Check for at least one letter and one number
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)

    if not has_letter or not has_digit:
        raise ValidationError("Password must contain at least one letter and one number")

    return password


def validate_camera_stream_url(stream_url: str) -> str:
    """
    Validate camera stream URL or device index

    Args:
        stream_url: Stream URL or device index (e.g., "0", "rtsp://...", "/path/to/video.mp4")

    Returns:
        Validated stream URL

    Raises:
        ValidationError: If URL format is invalid
    """
    stream_url = stream_url.strip()

    if not stream_url:
        raise ValidationError("Stream URL cannot be empty")

    # Check if it's a device index (just a number)
    if stream_url.isdigit():
        device_index = int(stream_url)
        if device_index < 0 or device_index > 10:
            raise ValidationError("Camera device index must be between 0 and 10")
        return stream_url

    # Check if it's a file path
    if not stream_url.startswith(('http://', 'https://', 'rtsp://', 'rtsps://')):
        # Assume it's a file path
        path = Path(stream_url)
        if not path.exists():
            raise ValidationError(f"Video file not found: {stream_url}")
        if not path.is_file():
            raise ValidationError(f"Path is not a file: {stream_url}")
        # Check file extension
        valid_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm']
        if path.suffix.lower() not in valid_extensions:
            raise ValidationError(f"Unsupported video format: {path.suffix}")

    # For URLs, just check basic format
    if len(stream_url) > 2048:
        raise ValidationError("Stream URL too long (max 2048 characters)")

    return stream_url


def validate_confidence_threshold(threshold: float) -> float:
    """
    Validate confidence threshold value

    Args:
        threshold: Confidence threshold (0.0 to 1.0)

    Returns:
        Validated threshold

    Raises:
        ValidationError: If threshold is out of range
    """
    if not isinstance(threshold, (int, float)):
        raise ValidationError("Confidence threshold must be a number")

    if threshold < 0.0 or threshold > 1.0:
        raise ValidationError("Confidence threshold must be between 0.0 and 1.0")

    return float(threshold)


def validate_camera_name(name: str) -> str:
    """
    Validate camera name

    Args:
        name: Camera name

    Returns:
        Validated name

    Raises:
        ValidationError: If name is invalid
    """
    name = name.strip()

    if not name:
        raise ValidationError("Camera name cannot be empty")

    if len(name) > 100:
        raise ValidationError("Camera name too long (max 100 characters)")

    # Check for valid characters (letters, numbers, spaces, hyphens, underscores)
    if not re.match(r'^[a-zA-Z0-9 _-]+$', name):
        raise ValidationError("Camera name can only contain letters, numbers, spaces, hyphens, and underscores")

    return name


def validate_location(location: str) -> str:
    """
    Validate location string

    Args:
        location: Location description

    Returns:
        Validated location

    Raises:
        ValidationError: If location is invalid
    """
    location = location.strip()

    if not location:
        raise ValidationError("Location cannot be empty")

    if len(location) > 200:
        raise ValidationError("Location too long (max 200 characters)")

    return location


def validate_user_name(name: str) -> str:
    """
    Validate user full name

    Args:
        name: User's full name

    Returns:
        Validated name

    Raises:
        ValidationError: If name is invalid
    """
    name = name.strip()

    if not name:
        raise ValidationError("Name cannot be empty")

    if len(name) < 2:
        raise ValidationError("Name must be at least 2 characters long")

    if len(name) > 100:
        raise ValidationError("Name too long (max 100 characters)")

    # Allow letters, spaces, hyphens, apostrophes, periods
    if not re.match(r"^[a-zA-Z\s\-'.]+$", name):
        raise ValidationError("Name can only contain letters, spaces, hyphens, apostrophes, and periods")

    return name


def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
    """
    Sanitize a string input by removing potentially dangerous characters

    Args:
        value: String to sanitize
        max_length: Maximum allowed length (optional)

    Returns:
        Sanitized string
    """
    # Remove null bytes and control characters
    value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\r\t')

    # Strip whitespace
    value = value.strip()

    # Enforce max length
    if max_length and len(value) > max_length:
        value = value[:max_length]

    return value
