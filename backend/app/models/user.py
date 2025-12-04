from sqlalchemy import Column, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
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
    deletion_pin = Column(String, nullable=True)  # 4-digit PIN for database deletion
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    acknowledged_alerts = relationship("Alert", back_populates="acknowledged_by_user")

    @property
    def is_super_admin(self) -> bool:
        return self.role == UserRole.SUPER_ADMIN

    @property
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN

    @property
    def is_admin_or_above(self) -> bool:
        return self.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]

    @property
    def is_safety_manager(self) -> bool:
        return self.role == UserRole.SAFETY_MANAGER
