from sqlalchemy import Column, String, DateTime
from ..core.database import Base
from ..core.timezone import get_philippine_time_naive
import uuid


class SystemSettings(Base):
    """System-wide settings for the PPE Compliance System"""
    __tablename__ = "system_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    company_name = Column(String, nullable=False, default="Your Company")
    system_name = Column(String, nullable=False, default="PPE Compliance System")
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_philippine_time_naive)
    updated_at = Column(DateTime, default=get_philippine_time_naive, onupdate=get_philippine_time_naive)

    def __repr__(self):
        return f"<SystemSettings(company={self.company_name}, system={self.system_name})>"
