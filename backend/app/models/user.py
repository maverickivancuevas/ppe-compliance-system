from sqlalchemy import Column, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    SAFETY_MANAGER = "safety_manager"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SAFETY_MANAGER)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    reports = relationship("Report", back_populates="generated_by_user")
    acknowledged_alerts = relationship("Alert", back_populates="acknowledged_by_user")

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_safety_manager(self) -> bool:
        return self.role == UserRole.SAFETY_MANAGER
