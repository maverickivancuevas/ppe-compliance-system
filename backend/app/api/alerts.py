from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import datetime

from ..core.database import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.alert import Alert, AlertSeverity
from ..models.detection import DetectionEvent
from ..models.camera import Camera

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("/")
def get_alerts(
    acknowledged: Optional[bool] = None,
    severity: Optional[AlertSeverity] = None,
    camera_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alerts with optional filters"""

    query = db.query(Alert).options(
        joinedload(Alert.detection_event).joinedload(DetectionEvent.camera),
        joinedload(Alert.acknowledged_by_user)
    )

    # Apply filters
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)

    if severity:
        query = query.filter(Alert.severity == severity)

    if camera_id:
        query = query.join(DetectionEvent).filter(DetectionEvent.camera_id == camera_id)

    # Order by created_at descending (most recent first)
    query = query.order_by(desc(Alert.created_at))

    # Paginate
    total = query.count()
    alerts = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "alerts": [
            {
                "id": alert.id,
                "message": alert.message,
                "severity": alert.severity,
                "acknowledged": alert.acknowledged,
                "acknowledged_by": alert.acknowledged_by_user.full_name if alert.acknowledged_by_user else None,
                "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None,
                "created_at": alert.created_at.isoformat(),
                "camera": {
                    "id": alert.detection_event.camera.id,
                    "name": alert.detection_event.camera.name,
                    "location": alert.detection_event.camera.location
                } if alert.detection_event and alert.detection_event.camera else None,
                "detection": {
                    "id": alert.detection_event.id,
                    "violation_type": alert.detection_event.violation_type,
                    "timestamp": alert.detection_event.timestamp.isoformat()
                } if alert.detection_event else None
            }
            for alert in alerts
        ]
    }


@router.put("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Acknowledge an alert"""

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()

    db.commit()
    db.refresh(alert)

    return {"message": "Alert acknowledged", "alert_id": alert_id}


@router.get("/stats")
def get_alert_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get alert statistics"""

    total_alerts = db.query(Alert).count()
    unacknowledged = db.query(Alert).filter(Alert.acknowledged == False).count()
    high_severity = db.query(Alert).filter(
        Alert.severity == AlertSeverity.HIGH,
        Alert.acknowledged == False
    ).count()

    return {
        "total_alerts": total_alerts,
        "unacknowledged": unacknowledged,
        "high_severity_unacknowledged": high_severity,
        "acknowledgement_rate": round((total_alerts - unacknowledged) / total_alerts * 100, 1) if total_alerts > 0 else 0
    }
