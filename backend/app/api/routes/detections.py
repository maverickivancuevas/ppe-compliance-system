from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import json
from ...core.database import get_db
from ...core.security import get_safety_manager_or_admin
from ...core.timezone import get_philippine_time_naive
from ...core.detection_utils import calculate_violation_type
from ...models.user import User
from ...models.detection import DetectionEvent
from ...models.camera import Camera
from ...models.alert import Alert, AlertSeverity
from ...schemas.detection import DetectionEventResponse, DetectionStats
from pydantic import BaseModel

router = APIRouter(prefix="/detections", tags=["Detections"])


class ManualDetectionCreate(BaseModel):
    camera_id: str
    person_detected: bool
    hardhat_detected: bool
    no_hardhat_detected: bool
    safety_vest_detected: bool
    no_safety_vest_detected: bool
    is_compliant: bool
    violation_type: Optional[str] = None
    confidence_scores: Dict[str, float]


@router.post("/manual", status_code=status.HTTP_201_CREATED)
def create_manual_detection(
    detection: ManualDetectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Manually save a detection event to the database"""

    # Verify camera exists
    camera = db.query(Camera).filter(Camera.id == detection.camera_id).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )

    # Calculate violation type if not provided
    calculated_violation_type = calculate_violation_type(
        person_detected=detection.person_detected,
        hardhat_detected=detection.hardhat_detected,
        no_hardhat_detected=detection.no_hardhat_detected,
        safety_vest_detected=detection.safety_vest_detected,
        no_safety_vest_detected=detection.no_safety_vest_detected,
        is_compliant=detection.is_compliant
    )

    # Use calculated violation type if not explicitly provided
    final_violation_type = detection.violation_type or calculated_violation_type

    # Create detection event
    detection_event = DetectionEvent(
        camera_id=detection.camera_id,
        person_detected=detection.person_detected,
        hardhat_detected=detection.hardhat_detected,
        no_hardhat_detected=detection.no_hardhat_detected,
        safety_vest_detected=detection.safety_vest_detected,
        no_safety_vest_detected=detection.no_safety_vest_detected,
        is_compliant=detection.is_compliant,
        violation_type=final_violation_type,
        confidence_scores=json.dumps(detection.confidence_scores),
        timestamp=get_philippine_time_naive()
    )

    db.add(detection_event)
    db.flush()  # Get the ID without committing yet

    # Create alert if not compliant
    if not detection.is_compliant and detection.person_detected:
        # Determine severity based on violation type
        severity = AlertSeverity.HIGH
        if final_violation_type:
            if "both" in final_violation_type.lower():
                severity = AlertSeverity.HIGH
            elif "hardhat" in final_violation_type.lower():
                severity = AlertSeverity.HIGH
            elif "vest" in final_violation_type.lower():
                severity = AlertSeverity.MEDIUM

        alert_message = f"PPE violation detected: {final_violation_type or 'Safety violation'} at {camera.name}"

        alert = Alert(
            detection_event_id=detection_event.id,
            message=alert_message,
            severity=severity,
            acknowledged=False,
            created_at=get_philippine_time_naive()
        )
        db.add(alert)

    db.commit()
    db.refresh(detection_event)

    return {
        "message": "Detection saved successfully",
        "detection_id": detection_event.id,
        "violation_type": final_violation_type,
        "alert_created": not detection.is_compliant and detection.person_detected
    }


@router.get("/", response_model=List[DetectionEventResponse])
def get_all_detections(
    skip: int = 0,
    limit: int = 100,
    camera_id: Optional[str] = None,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    violations_only: bool = False,
    compliant_only: bool = False,
    has_snapshot: bool = False,
    include_archived: bool = Query(False, description="Include archived detections"),
    archived_only: bool = Query(False, description="Show only archived detections"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Get all detection events with optional filters"""

    query = db.query(DetectionEvent)

    # Filter archived status
    if archived_only:
        query = query.filter(DetectionEvent.archived == True)
    elif not include_archived:
        query = query.filter(DetectionEvent.archived == False)

    # Apply filters
    if camera_id:
        query = query.filter(DetectionEvent.camera_id == camera_id)

    if start_date:
        start_dt = datetime.fromisoformat(start_date.replace('Z', ''))
        query = query.filter(DetectionEvent.timestamp >= start_dt)

    if end_date:
        end_dt = datetime.fromisoformat(end_date.replace('Z', ''))
        # Add 1 day to include all detections on end_date
        end_dt = end_dt + timedelta(days=1)
        query = query.filter(DetectionEvent.timestamp < end_dt)

    if violations_only:
        query = query.filter(
            and_(
                DetectionEvent.is_compliant == False,
                DetectionEvent.person_detected == True
            )
        )

    if compliant_only:
        query = query.filter(
            and_(
                DetectionEvent.is_compliant == True,
                DetectionEvent.person_detected == True
            )
        )

    if has_snapshot:
        query = query.filter(DetectionEvent.snapshot_url != None)

    # Order by timestamp descending (newest first)
    query = query.order_by(DetectionEvent.timestamp.desc())

    detections = query.offset(skip).limit(limit).all()
    return [DetectionEventResponse.from_orm(detection) for detection in detections]


@router.get("/{detection_id}", response_model=DetectionEventResponse)
def get_detection(
    detection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Get a specific detection event by ID"""
    detection = db.query(DetectionEvent).filter(DetectionEvent.id == detection_id).first()
    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection event not found"
        )
    return DetectionEventResponse.from_orm(detection)


@router.get("/stats/summary", response_model=DetectionStats)
def get_detection_stats(
    camera_id: Optional[str] = None,
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Get detection statistics"""

    # Default to last 7 days if no dates provided
    if not start_date:
        start_date = get_philippine_time_naive() - timedelta(days=7)
    if not end_date:
        end_date = get_philippine_time_naive()

    # Validate date range
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date"
        )

    query = db.query(DetectionEvent).filter(
        and_(
            DetectionEvent.timestamp >= start_date,
            DetectionEvent.timestamp <= end_date,
            DetectionEvent.person_detected == True,
            DetectionEvent.archived == False  # Exclude archived detections
        )
    )

    if camera_id:
        query = query.filter(DetectionEvent.camera_id == camera_id)

    # Get all relevant detections
    detections = query.all()

    total_detections = len(detections)
    compliant_count = sum(1 for d in detections if d.is_compliant == True)
    violation_count = total_detections - compliant_count

    compliance_rate = (compliant_count / total_detections * 100) if total_detections > 0 else 0

    # Count common violations
    common_violations = {}
    for detection in detections:
        if detection.is_compliant == False and detection.violation_type:
            vtype = detection.violation_type
            common_violations[vtype] = common_violations.get(vtype, 0) + 1

    return DetectionStats(
        total_detections=total_detections,
        compliant_count=compliant_count,
        violation_count=violation_count,
        compliance_rate=round(compliance_rate, 2),
        common_violations=common_violations
    )


@router.delete("/{detection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_detection(
    detection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Delete a detection event"""

    detection = db.query(DetectionEvent).filter(DetectionEvent.id == detection_id).first()
    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection event not found"
        )

    db.delete(detection)
    db.commit()

    return None


@router.post("/{detection_id}/clear-snapshot", status_code=status.HTTP_200_OK)
def clear_detection_snapshot(
    detection_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Clear the snapshot URL from a detection event without deleting the detection"""

    detection = db.query(DetectionEvent).filter(DetectionEvent.id == detection_id).first()
    if not detection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Detection event not found"
        )

    # Clear the snapshot URL but keep the detection event
    detection.snapshot_url = None
    db.commit()

    return {"message": "Snapshot cleared successfully"}


@router.post("/clear-all-snapshots", status_code=status.HTTP_200_OK)
def clear_all_snapshots(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Clear all snapshot URLs from detection events without deleting the detections"""

    # Update all detection events that have snapshots
    detections_with_snapshots = db.query(DetectionEvent).filter(
        DetectionEvent.snapshot_url != None
    ).all()

    count = len(detections_with_snapshots)

    for detection in detections_with_snapshots:
        detection.snapshot_url = None

    db.commit()

    return {"message": f"Cleared {count} snapshots successfully", "count": count}
