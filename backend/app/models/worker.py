from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from ..core.database import Base
from ..core.timezone import get_philippine_time_naive


class Worker(Base):
    """Model for construction workers registered in the system"""
    __tablename__ = "workers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_number = Column(String, unique=True, nullable=False, index=True)  # TUPM-22-001 format

    # Worker details
    full_name = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    position = Column(String, nullable=True)  # Role/position on site
    emergency_contact = Column(String, nullable=True)

    # Assigned camera/location
    camera_id = Column(String, ForeignKey("cameras.id", ondelete="SET NULL"), nullable=True)

    # QR Code
    qr_code_path = Column(String, nullable=True)  # Path to generated QR code image

    # Status
    is_active = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=get_philippine_time_naive)
    updated_at = Column(DateTime, default=get_philippine_time_naive, onupdate=get_philippine_time_naive)

    # Relationships
    camera = relationship("Camera", backref="assigned_workers")
    attendance_records = relationship("Attendance", back_populates="worker", cascade="all, delete-orphan")


class Attendance(Base):
    """Model for worker attendance tracking via QR code scanning"""
    __tablename__ = "attendance"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Attendance details
    check_in_time = Column(DateTime, nullable=False, index=True)
    check_out_time = Column(DateTime, nullable=True)
    hours_worked = Column(Integer, nullable=True)  # In minutes

    # Location
    check_in_location = Column(String, nullable=True)  # Camera/location name
    check_out_location = Column(String, nullable=True)

    # Status
    status = Column(String, default="checked_in")  # checked_in, checked_out

    # Notes
    notes = Column(String, nullable=True)

    created_at = Column(DateTime, default=get_philippine_time_naive)

    # Relationships
    worker = relationship("Worker", back_populates="attendance_records")
