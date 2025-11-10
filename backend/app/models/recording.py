from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base


class VideoRecording(Base):
    """Model for storing video recordings of violation events"""
    __tablename__ = "video_recordings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)

    # Recording details
    file_path = Column(Text, nullable=False)  # Path to video file
    duration = Column(Float, nullable=False)  # Duration in seconds
    file_size = Column(Integer, nullable=False)  # Size in bytes
    format = Column(String, default="mp4")  # Video format
    resolution = Column(String, nullable=True)  # e.g., "1920x1080"
    fps = Column(Integer, nullable=True)  # Frames per second

    # Timestamps
    recording_start = Column(DateTime, nullable=False)  # When recording started
    recording_end = Column(DateTime, nullable=False)  # When recording ended
    created_at = Column(DateTime, default=datetime.utcnow)

    # Archiving
    archived = Column(Boolean, default=False, nullable=False, index=True)
    archived_at = Column(DateTime, nullable=True)

    # Relationships
    detection_event = relationship("DetectionEvent", backref="video_recording")
    camera = relationship("Camera", backref="video_recordings")
