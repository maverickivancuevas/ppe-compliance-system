from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class NearMissSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NearMissEvent(Base):
    """Model for near-miss detection events"""
    __tablename__ = "near_miss_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=True, index=True)
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)

    # Near-miss details
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    severity = Column(Enum(NearMissSeverity), default=NearMissSeverity.MEDIUM, nullable=False)
    description = Column(Text, nullable=True)

    # Detection specifics
    near_miss_type = Column(String, nullable=False)  # e.g., "Person in hazard zone", "Equipment proximity"
    distance_to_hazard = Column(Float, nullable=True)  # Distance in meters or pixels
    time_in_zone = Column(Float, nullable=True)  # Time spent in hazard zone (seconds)

    # Location
    hazard_zone = Column(Text, nullable=True)  # JSON: coordinates of hazard zone
    person_location = Column(Text, nullable=True)  # JSON: coordinates of person

    # Snapshot
    snapshot_url = Column(Text, nullable=True)

    # Follow-up
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # Archiving
    archived = Column(Boolean, default=False, nullable=False, index=True)
    archived_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    detection_event = relationship("DetectionEvent", backref="near_miss_events")
    camera = relationship("Camera", backref="near_miss_events")
    acknowledged_by_user = relationship("User", backref="acknowledged_near_misses", foreign_keys=[acknowledged_by])
