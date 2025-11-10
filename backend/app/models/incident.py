from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base
from ..core.timezone import get_philippine_time_naive


class IncidentSeverity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(IncidentSeverity), default=IncidentSeverity.MEDIUM, nullable=False)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False)

    # Linked to detection event
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=True, index=True)
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=True, index=True)
    track_id = Column(String, nullable=True, index=True)  # Track ID from YOLO tracking

    # Screenshot/Evidence
    screenshot_url = Column(Text, nullable=True)

    # Reporter and assignee
    reported_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    assigned_to = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Resolution
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    # Timestamps
    incident_time = Column(DateTime, default=get_philippine_time_naive, nullable=False, index=True)
    created_at = Column(DateTime, default=get_philippine_time_naive, nullable=False)
    updated_at = Column(DateTime, default=get_philippine_time_naive, onupdate=get_philippine_time_naive, nullable=False)

    # Relationships
    detection_event = relationship("DetectionEvent", backref="incidents")
    camera = relationship("Camera", backref="incidents")
    reporter = relationship("User", foreign_keys=[reported_by], backref="reported_incidents")
    assignee = relationship("User", foreign_keys=[assigned_to], backref="assigned_incidents")
