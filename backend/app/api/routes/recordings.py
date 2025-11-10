from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional
from datetime import datetime, timedelta
import os

from ...core.database import get_db
from ...models import User, VideoRecording, DetectionEvent, Camera
from ...api.routes.auth import get_current_user
from ...core.timezone import get_philippine_time_naive

router = APIRouter()


@router.get("/")
def get_recordings(
    camera_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of video recordings with filters"""

    query = db.query(VideoRecording).filter(VideoRecording.archived == False)

    # Filter by camera
    if camera_id:
        query = query.filter(VideoRecording.camera_id == camera_id)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(VideoRecording.recording_start >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format. Use ISO format (YYYY-MM-DD)."
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            # Add 1 day to include the entire end_date
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(VideoRecording.recording_end <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format. Use ISO format (YYYY-MM-DD)."
            )

    # Order by most recent first
    query = query.order_by(desc(VideoRecording.recording_start))

    # Pagination
    total = query.count()
    recordings = query.offset(offset).limit(limit).all()

    # Format response
    results = []
    for rec in recordings:
        results.append({
            "id": rec.id,
            "detection_event_id": rec.detection_event_id,
            "camera_id": rec.camera_id,
            "camera_name": rec.camera.name if rec.camera else None,
            "file_path": rec.file_path,
            "duration": rec.duration,
            "file_size": rec.file_size,
            "format": rec.format,
            "resolution": rec.resolution,
            "fps": rec.fps,
            "recording_start": rec.recording_start.isoformat(),
            "recording_end": rec.recording_end.isoformat(),
            "created_at": rec.created_at.isoformat(),
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "recordings": results
    }


@router.get("/{recording_id}")
def get_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific recording"""

    recording = db.query(VideoRecording).filter(
        VideoRecording.id == recording_id,
        VideoRecording.archived == False
    ).first()

    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )

    return {
        "id": recording.id,
        "detection_event_id": recording.detection_event_id,
        "camera_id": recording.camera_id,
        "camera_name": recording.camera.name if recording.camera else None,
        "camera_location": recording.camera.location if recording.camera else None,
        "file_path": recording.file_path,
        "duration": recording.duration,
        "file_size": recording.file_size,
        "format": recording.format,
        "resolution": recording.resolution,
        "fps": recording.fps,
        "recording_start": recording.recording_start.isoformat(),
        "recording_end": recording.recording_end.isoformat(),
        "created_at": recording.created_at.isoformat(),
        "detection_event": {
            "id": recording.detection_event.id,
            "timestamp": recording.detection_event.timestamp.isoformat(),
            "violation_type": recording.detection_event.violation_type,
            "is_compliant": recording.detection_event.is_compliant,
        } if recording.detection_event else None
    }


@router.get("/{recording_id}/video")
def stream_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Stream or download a video recording"""

    recording = db.query(VideoRecording).filter(
        VideoRecording.id == recording_id,
        VideoRecording.archived == False
    ).first()

    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )

    # Check if file exists
    if not os.path.exists(recording.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video file not found on disk"
        )

    # Return video file
    return FileResponse(
        recording.file_path,
        media_type=f"video/{recording.format}",
        filename=f"recording_{recording.id}.{recording.format}"
    )


@router.delete("/{recording_id}")
def delete_recording(
    recording_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a recording (soft delete - mark as archived)"""

    # Only admin can delete
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete recordings"
        )

    recording = db.query(VideoRecording).filter(
        VideoRecording.id == recording_id,
        VideoRecording.archived == False
    ).first()

    if not recording:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recording not found"
        )

    # Soft delete
    recording.archived = True
    recording.archived_at = get_philippine_time_naive()
    db.commit()

    return {"message": "Recording archived successfully"}
