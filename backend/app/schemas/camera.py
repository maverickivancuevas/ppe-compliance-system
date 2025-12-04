from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from ..models.camera import CameraStatus
from ..core.validation import (
    validate_camera_name,
    validate_location,
    validate_camera_stream_url,
    sanitize_string
)


class CameraBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: str = Field(..., min_length=1, max_length=200)
    stream_url: Optional[str] = Field(None, max_length=2048)
    description: Optional[str] = Field(None, max_length=500)

    @field_validator('name')
    @classmethod
    def validate_name_field(cls, v):
        return validate_camera_name(v)

    @field_validator('location')
    @classmethod
    def validate_location_field(cls, v):
        return validate_location(v)

    @field_validator('stream_url')
    @classmethod
    def validate_stream_url_field(cls, v):
        if v is not None:
            return validate_camera_stream_url(v)
        return v

    @field_validator('description')
    @classmethod
    def validate_description_field(cls, v):
        if v is not None:
            return sanitize_string(v, max_length=500)
        return v


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    stream_url: Optional[str] = None
    status: Optional[CameraStatus] = None
    description: Optional[str] = None


class CameraResponse(BaseModel):
    id: str
    name: str
    location: str
    stream_url: Optional[str] = None
    description: Optional[str] = None
    status: CameraStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
