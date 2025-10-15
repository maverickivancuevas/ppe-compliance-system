from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class AlertSeverity(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="CASCADE"), nullable=False, index=True)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM, nullable=False)
    message = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relationships
    detection_event = relationship("DetectionEvent", back_populates="alerts")
    acknowledged_by_user = relationship("User", back_populates="acknowledged_alerts")

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_acknowledged_created', 'acknowledged', 'created_at'),
        Index('idx_severity_created', 'severity', 'created_at'),
    )
