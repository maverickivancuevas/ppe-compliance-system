from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import base64
import uuid
from pathlib import Path

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.config import settings
from ...models.user import User
from ...models.incident import Incident, IncidentSeverity, IncidentStatus
from ...models.camera import Camera
from ...models.detection import DetectionEvent
from ...core.timezone import get_philippine_time_naive

router = APIRouter(prefix="/incidents", tags=["Incidents"])


# Pydantic models
class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: IncidentSeverity
    camera_id: Optional[str] = None
    detection_event_id: Optional[str] = None
    screenshot_base64: Optional[str] = None  # Base64 encoded screenshot
    incident_time: Optional[datetime] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    camera_id: Optional[str]
    detection_event_id: Optional[str]
    screenshot_url: Optional[str]
    reported_by: Optional[str]
    assigned_to: Optional[str]
    resolution_notes: Optional[str]
    incident_time: datetime
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new incident report"""

    # Validate camera if provided
    if incident_data.camera_id:
        camera = db.query(Camera).filter(Camera.id == incident_data.camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )

    # Validate detection event if provided
    if incident_data.detection_event_id:
        detection = db.query(DetectionEvent).filter(DetectionEvent.id == incident_data.detection_event_id).first()
        if not detection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Detection event not found"
            )

    # Handle screenshot if provided
    screenshot_url = None
    if incident_data.screenshot_base64:
        try:
            # Create uploads directory if not exists
            upload_dir = Path(settings.UPLOAD_DIR) / "incidents"
            upload_dir.mkdir(parents=True, exist_ok=True)

            # Generate unique filename
            filename = f"incident_{uuid.uuid4()}.jpg"
            filepath = upload_dir / filename

            # Decode and save base64 image
            image_data = base64.b64decode(incident_data.screenshot_base64.split(',')[1] if ',' in incident_data.screenshot_base64 else incident_data.screenshot_base64)
            with open(filepath, 'wb') as f:
                f.write(image_data)

            screenshot_url = f"/uploads/incidents/{filename}"
        except Exception as e:
            # Log error but continue creating incident
            print(f"Error saving screenshot: {e}")

    # Create incident
    incident = Incident(
        title=incident_data.title,
        description=incident_data.description,
        severity=incident_data.severity,
        camera_id=incident_data.camera_id,
        detection_event_id=incident_data.detection_event_id,
        screenshot_url=screenshot_url,
        reported_by=current_user.id,
        incident_time=incident_data.incident_time or get_philippine_time_naive()
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        "message": "Incident report created successfully",
        "incident_id": incident.id,
        "screenshot_saved": screenshot_url is not None
    }


@router.get("/", response_model=List[IncidentResponse])
def get_incidents(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[IncidentStatus] = None,
    severity_filter: Optional[IncidentSeverity] = None,
    camera_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all incidents with optional filters"""

    query = db.query(Incident)

    # Apply filters
    if status_filter:
        query = query.filter(Incident.status == status_filter)

    if severity_filter:
        query = query.filter(Incident.severity == severity_filter)

    if camera_id:
        query = query.filter(Incident.camera_id == camera_id)

    # Order by incident time descending (most recent first)
    query = query.order_by(desc(Incident.incident_time))

    incidents = query.offset(skip).limit(limit).all()
    return incidents


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific incident by ID"""

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    return incident


@router.put("/{incident_id}")
def update_incident(
    incident_id: str,
    update_data: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an incident"""

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    # Update fields if provided
    if update_data.title:
        incident.title = update_data.title
    if update_data.description:
        incident.description = update_data.description
    if update_data.severity:
        incident.severity = update_data.severity
    if update_data.status:
        incident.status = update_data.status
        # Mark as resolved if status is resolved or closed
        if update_data.status in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] and not incident.resolved_at:
            incident.resolved_at = get_philippine_time_naive()
    if update_data.assigned_to:
        incident.assigned_to = update_data.assigned_to
    if update_data.resolution_notes:
        incident.resolution_notes = update_data.resolution_notes

    incident.updated_at = get_philippine_time_naive()

    db.commit()
    db.refresh(incident)

    return {"message": "Incident updated successfully", "incident_id": incident.id}


@router.delete("/{incident_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an incident"""

    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )

    db.delete(incident)
    db.commit()

    return None


@router.get("/stats/summary")
def get_incident_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get incident statistics"""

    total_incidents = db.query(Incident).count()
    open_incidents = db.query(Incident).filter(Incident.status == IncidentStatus.OPEN).count()
    in_progress = db.query(Incident).filter(Incident.status == IncidentStatus.IN_PROGRESS).count()
    resolved = db.query(Incident).filter(Incident.status == IncidentStatus.RESOLVED).count()

    critical = db.query(Incident).filter(
        Incident.severity == IncidentSeverity.CRITICAL,
        Incident.status.in_([IncidentStatus.OPEN, IncidentStatus.IN_PROGRESS])
    ).count()

    return {
        "total_incidents": total_incidents,
        "open": open_incidents,
        "in_progress": in_progress,
        "resolved": resolved,
        "critical_open": critical,
        "resolution_rate": round((resolved / total_incidents * 100), 1) if total_incidents > 0 else 0
    }
