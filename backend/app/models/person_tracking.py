from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, Float, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base


class PersonTrack(Base):
    """Model for tracking persons across multiple cameras"""
    __tablename__ = "person_tracks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    track_id = Column(String, nullable=False, unique=True, index=True)  # Unique tracking ID for the person

    # Person features for re-identification
    feature_vector = Column(Text, nullable=True)  # Serialized feature vector for person re-id

    # Tracking info
    first_seen = Column(DateTime, nullable=False, index=True)
    last_seen = Column(DateTime, nullable=False, index=True)
    total_cameras_visited = Column(Integer, default=1)

    # Compliance status
    is_compliant = Column(Boolean, default=True)
    total_violations = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    detections = relationship("PersonDetection", back_populates="person_track", cascade="all, delete-orphan")


class PersonDetection(Base):
    """Model for individual person detections linked to a track"""
    __tablename__ = "person_detections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    person_track_id = Column(String, ForeignKey("person_tracks.id", ondelete="CASCADE"), nullable=False, index=True)
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)

    # Detection details
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    bounding_box = Column(Text, nullable=True)  # JSON: {"x": 100, "y": 200, "width": 50, "height": 100}
    confidence = Column(Float, nullable=True)

    # Compliance at this detection
    is_compliant = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    person_track = relationship("PersonTrack", back_populates="detections")
    detection_event = relationship("DetectionEvent", backref="person_detections")
    camera = relationship("Camera", backref="person_detections")
