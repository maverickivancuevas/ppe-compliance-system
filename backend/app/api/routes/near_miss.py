from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from ...core.database import get_db
from ...models import User, NearMissEvent, NearMissSeverity, Camera
from ...api.routes.auth import get_current_user
from ...core.timezone import get_philippine_time_naive

router = APIRouter()


class AcknowledgeNearMiss(BaseModel):
    notes: Optional[str] = None


@router.get("/")
def get_near_miss_events(
    camera_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of near-miss events with filters"""

    query = db.query(NearMissEvent).filter(NearMissEvent.archived == False)

    # Filter by camera
    if camera_id:
        query = query.filter(NearMissEvent.camera_id == camera_id)

    # Filter by severity
    if severity:
        try:
            severity_enum = NearMissSeverity(severity.lower())
            query = query.filter(NearMissEvent.severity == severity_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid severity. Must be one of: {[s.value for s in NearMissSeverity]}"
            )

    # Filter by acknowledged status
    if acknowledged is not None:
        query = query.filter(NearMissEvent.acknowledged == acknowledged)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(NearMissEvent.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(NearMissEvent.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format"
            )

    # Order by most recent first, then by severity
    query = query.order_by(desc(NearMissEvent.timestamp))

    # Pagination
    total = query.count()
    events = query.offset(offset).limit(limit).all()

    # Format response
    results = []
    for event in events:
        results.append({
            "id": event.id,
            "timestamp": event.timestamp.isoformat(),
            "camera_id": event.camera_id,
            "camera_name": event.camera.name if event.camera else None,
            "camera_location": event.camera.location if event.camera else None,
            "severity": event.severity.value,
            "near_miss_type": event.near_miss_type,
            "description": event.description,
            "distance_to_hazard": event.distance_to_hazard,
            "time_in_zone": event.time_in_zone,
            "snapshot_url": event.snapshot_url,
            "acknowledged": event.acknowledged,
            "acknowledged_at": event.acknowledged_at.isoformat() if event.acknowledged_at else None,
            "acknowledged_by": event.acknowledged_by,
            "created_at": event.created_at.isoformat()
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "near_miss_events": results
    }


@router.get("/{event_id}")
def get_near_miss_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific near-miss event"""

    event = db.query(NearMissEvent).filter(
        NearMissEvent.id == event_id,
        NearMissEvent.archived == False
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Near-miss event not found"
        )

    return {
        "id": event.id,
        "timestamp": event.timestamp.isoformat(),
        "camera_id": event.camera_id,
        "camera_name": event.camera.name if event.camera else None,
        "camera_location": event.camera.location if event.camera else None,
        "severity": event.severity.value,
        "near_miss_type": event.near_miss_type,
        "description": event.description,
        "distance_to_hazard": event.distance_to_hazard,
        "time_in_zone": event.time_in_zone,
        "hazard_zone": event.hazard_zone,
        "person_location": event.person_location,
        "snapshot_url": event.snapshot_url,
        "acknowledged": event.acknowledged,
        "acknowledged_at": event.acknowledged_at.isoformat() if event.acknowledged_at else None,
        "acknowledged_by": event.acknowledged_by,
        "notes": event.notes,
        "created_at": event.created_at.isoformat(),
        "detection_event_id": event.detection_event_id
    }


@router.post("/{event_id}/acknowledge")
def acknowledge_near_miss(
    event_id: str,
    data: AcknowledgeNearMiss,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge a near-miss event"""

    event = db.query(NearMissEvent).filter(
        NearMissEvent.id == event_id,
        NearMissEvent.archived == False
    ).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Near-miss event not found"
        )

    if event.acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Near-miss event already acknowledged"
        )

    # Update acknowledgement
    event.acknowledged = True
    event.acknowledged_by = current_user.id
    event.acknowledged_at = get_philippine_time_naive()
    if data.notes:
        event.notes = data.notes

    db.commit()

    return {
        "message": "Near-miss event acknowledged successfully",
        "acknowledged_at": event.acknowledged_at.isoformat(),
        "acknowledged_by": current_user.username
    }


@router.get("/stats/summary")
def get_near_miss_stats(
    camera_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get near-miss statistics"""

    query = db.query(NearMissEvent).filter(NearMissEvent.archived == False)

    # Filter by camera
    if camera_id:
        query = query.filter(NearMissEvent.camera_id == camera_id)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(NearMissEvent.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(NearMissEvent.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format"
            )

    # Get all events
    all_events = query.all()
    total_events = len(all_events)

    # Count by severity
    severity_counts = {
        "low": 0,
        "medium": 0,
        "high": 0,
        "critical": 0
    }
    for event in all_events:
        severity_counts[event.severity.value] += 1

    # Count by type
    type_counts = {}
    for event in all_events:
        type_counts[event.near_miss_type] = type_counts.get(event.near_miss_type, 0) + 1

    # Acknowledgement stats
    acknowledged_count = sum(1 for event in all_events if event.acknowledged)
    unacknowledged_count = total_events - acknowledged_count

    return {
        "total_near_miss_events": total_events,
        "acknowledged": acknowledged_count,
        "unacknowledged": unacknowledged_count,
        "by_severity": severity_counts,
        "by_type": type_counts,
        "acknowledgement_rate": round(acknowledged_count / total_events * 100, 2) if total_events > 0 else 0
    }
