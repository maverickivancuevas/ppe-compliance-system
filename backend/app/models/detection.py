from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base
from ..core.timezone import get_philippine_time_naive


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=get_philippine_time_naive, nullable=False, index=True)

    # Tracking ID from ByteTrack (assigned by YOLO tracking)
    track_id = Column(String, nullable=True, index=True)  # e.g., "1", "2", "3" per camera

    # Worker ID (stable ID assigned by IoU tracking)
    worker_id = Column(String, nullable=True, index=True)  # e.g., "1", "2", "3" per camera

    # Detection results (boolean fields)
    person_detected = Column(Boolean, default=False, nullable=False)
    hardhat_detected = Column(Boolean, default=False, nullable=False)
    no_hardhat_detected = Column(Boolean, default=False, nullable=False)
    safety_vest_detected = Column(Boolean, default=False, nullable=False)
    no_safety_vest_detected = Column(Boolean, default=False, nullable=False)
    is_compliant = Column(Boolean, default=False, nullable=False)

    # Confidence scores (JSON string)
    confidence_scores = Column(Text, nullable=True)  # Store as JSON string

    # Snapshot
    snapshot_url = Column(Text, nullable=True)

    # Violation details
    violation_type = Column(String, nullable=True)  # e.g., "No Hardhat", "No Safety Vest", "Both Missing"

    # Archiving
    archived = Column(Boolean, default=False, nullable=False, index=True)
    archived_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=get_philippine_time_naive)

    # Relationships
    camera = relationship("Camera", back_populates="detection_events")
    alerts = relationship("Alert", back_populates="detection_event", cascade="all, delete-orphan")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_camera_timestamp', 'camera_id', 'timestamp'),
        Index('idx_compliant_timestamp', 'is_compliant', 'timestamp'),
        Index('idx_person_timestamp', 'person_detected', 'timestamp'),
        Index('idx_camera_track', 'camera_id', 'track_id'),  # For querying specific tracked person
    )

    @property
    def is_violation(self) -> bool:
        """Check if this detection is a safety violation"""
        return not self.is_compliant and self.person_detected
