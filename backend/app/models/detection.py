from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Float, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base


class DetectionEvent(Base):
    __tablename__ = "detection_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

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

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    camera = relationship("Camera", back_populates="detection_events")
    alerts = relationship("Alert", back_populates="detection_event", cascade="all, delete-orphan")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_camera_timestamp', 'camera_id', 'timestamp'),
        Index('idx_compliant_timestamp', 'is_compliant', 'timestamp'),
        Index('idx_person_timestamp', 'person_detected', 'timestamp'),
    )

    @property
    def is_violation(self) -> bool:
        """Check if this detection is a safety violation"""
        return not self.is_compliant and self.person_detected
