from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class NotificationPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class DeviceToken(Base):
    """Model for storing mobile device push notification tokens"""
    __tablename__ = "device_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Device info
    token = Column(String, nullable=False, unique=True, index=True)  # FCM or APNS token
    platform = Column(String, nullable=False)  # "ios", "android", "web"
    device_name = Column(String, nullable=True)
    device_model = Column(String, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime, default=datetime.utcnow)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="device_tokens")


class PushNotification(Base):
    """Model for tracking sent push notifications"""
    __tablename__ = "push_notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_token_id = Column(String, ForeignKey("device_tokens.id", ondelete="SET NULL"), nullable=True)

    # Notification content
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)

    # Related event (optional)
    detection_event_id = Column(String, ForeignKey("detection_events.id", ondelete="SET NULL"), nullable=True)
    incident_id = Column(String, ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True)
    near_miss_id = Column(String, ForeignKey("near_miss_events.id", ondelete="SET NULL"), nullable=True)

    # Additional data (JSON)
    data = Column(Text, nullable=True)  # JSON string with extra data

    # Status
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime, nullable=True)
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", backref="push_notifications")
    device_token = relationship("DeviceToken", backref="notifications")
    detection_event = relationship("DetectionEvent", backref="push_notifications")
    incident = relationship("Incident", backref="push_notifications")
    near_miss_event = relationship("NearMissEvent", backref="push_notifications")
