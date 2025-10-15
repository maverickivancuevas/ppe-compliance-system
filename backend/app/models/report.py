from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..core.database import Base


class ReportType(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class Report(Base):
    __tablename__ = "reports"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    date_from = Column(DateTime, nullable=False)
    date_to = Column(DateTime, nullable=False)
    file_url = Column(Text, nullable=True)
    file_format = Column(String, nullable=False)  # "pdf" or "csv"
    generated_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    summary = Column(Text, nullable=True)  # JSON string with report statistics
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    generated_by_user = relationship("User", back_populates="reports")
