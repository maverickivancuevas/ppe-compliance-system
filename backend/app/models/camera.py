from sqlalchemy import Column, String, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class CameraStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    stream_url = Column(Text, nullable=True)  # Can be URL or device index (e.g., "0" for webcam)
    status = Column(Enum(CameraStatus), default=CameraStatus.ACTIVE)
    description = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)  # Track who created this camera
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    detection_events = relationship("DetectionEvent", back_populates="camera", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
