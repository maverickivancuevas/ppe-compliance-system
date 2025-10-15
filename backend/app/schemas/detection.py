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
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        import json
        # Convert string booleans to actual booleans
        data = {
            "id": obj.id,
            "camera_id": obj.camera_id,
            "timestamp": obj.timestamp,
            "person_detected": obj.person_detected == "true",
            "hardhat_detected": obj.hardhat_detected == "true",
            "no_hardhat_detected": obj.no_hardhat_detected == "true",
            "safety_vest_detected": obj.safety_vest_detected == "true",
            "no_safety_vest_detected": obj.no_safety_vest_detected == "true",
            "is_compliant": obj.is_compliant == "true",
            "confidence_scores": json.loads(obj.confidence_scores) if obj.confidence_scores else None,
            "snapshot_url": obj.snapshot_url,
            "violation_type": obj.violation_type,
            "created_at": obj.created_at,
        }
        return cls(**data)


class DetectionStats(BaseModel):
    total_detections: int
    compliant_count: int
    violation_count: int
    compliance_rate: float
    common_violations: Dict[str, int]
