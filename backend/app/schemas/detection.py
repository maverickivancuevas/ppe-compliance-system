from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime


class DetectionEventBase(BaseModel):
    camera_id: str


class DetectionEventCreate(DetectionEventBase):
    person_detected: bool = False
    hardhat_detected: bool = False
    no_hardhat_detected: bool = False
    safety_vest_detected: bool = False
    no_safety_vest_detected: bool = False
    is_compliant: bool = False
    confidence_scores: Optional[Dict[str, float]] = None
    snapshot_url: Optional[str] = None
    violation_type: Optional[str] = None


class DetectionEventResponse(DetectionEventBase):
    id: str
    timestamp: datetime
    person_detected: bool
    hardhat_detected: bool
    no_hardhat_detected: bool
    safety_vest_detected: bool
    no_safety_vest_detected: bool
    is_compliant: bool
    confidence_scores: Optional[Dict[str, float]] = None
    snapshot_url: Optional[str] = None
    violation_type: Optional[str] = None
    worker_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        import json
        # Database stores booleans directly, no conversion needed
        data = {
            "id": obj.id,
            "camera_id": obj.camera_id,
            "timestamp": obj.timestamp,
            "person_detected": bool(obj.person_detected),
            "hardhat_detected": bool(obj.hardhat_detected),
            "no_hardhat_detected": bool(obj.no_hardhat_detected),
            "safety_vest_detected": bool(obj.safety_vest_detected),
            "no_safety_vest_detected": bool(obj.no_safety_vest_detected),
            "is_compliant": bool(obj.is_compliant),
            "confidence_scores": json.loads(obj.confidence_scores) if obj.confidence_scores else None,
            "snapshot_url": obj.snapshot_url,
            "violation_type": obj.violation_type,
            "worker_id": obj.worker_id,
            "created_at": obj.created_at,
        }
        return cls(**data)


class DetectionStats(BaseModel):
    total_detections: int
    compliant_count: int
    violation_count: int
    compliance_rate: float
    common_violations: Dict[str, int]
