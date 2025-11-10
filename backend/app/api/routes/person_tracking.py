from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func
from typing import List, Optional
from datetime import datetime, timedelta

from ...core.database import get_db
from ...models import User, PersonTrack, PersonDetection, Camera
from ...api.routes.auth import get_current_user

router = APIRouter()


@router.get("/tracks")
def get_person_tracks(
    camera_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    is_compliant: Optional[bool] = Query(None),
    min_cameras: Optional[int] = Query(None, description="Minimum number of cameras visited"),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of person tracks with filters"""

    query = db.query(PersonTrack)

    # Filter by compliance status
    if is_compliant is not None:
        query = query.filter(PersonTrack.is_compliant == is_compliant)

    # Filter by minimum cameras visited
    if min_cameras:
        query = query.filter(PersonTrack.total_cameras_visited >= min_cameras)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(PersonTrack.first_seen >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(PersonTrack.last_seen <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format"
            )

    # Filter by camera (get tracks that have detections from this camera)
    if camera_id:
        query = query.join(PersonDetection).filter(PersonDetection.camera_id == camera_id).distinct()

    # Order by most recent last_seen
    query = query.order_by(desc(PersonTrack.last_seen))

    # Pagination
    total = query.count()
    tracks = query.offset(offset).limit(limit).all()

    # Format response
    results = []
    for track in tracks:
        # Get unique cameras visited
        cameras_visited = db.query(Camera.id, Camera.name, Camera.location).join(
            PersonDetection, Camera.id == PersonDetection.camera_id
        ).filter(PersonDetection.person_track_id == track.id).distinct().all()

        results.append({
            "id": track.id,
            "track_id": track.track_id,
            "first_seen": track.first_seen.isoformat(),
            "last_seen": track.last_seen.isoformat(),
            "total_cameras_visited": track.total_cameras_visited,
            "is_compliant": track.is_compliant,
            "total_violations": track.total_violations,
            "cameras_visited": [
                {
                    "id": cam.id,
                    "name": cam.name,
                    "location": cam.location
                } for cam in cameras_visited
            ],
            "total_detections": len(track.detections)
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "tracks": results
    }


@router.get("/tracks/{track_id}")
def get_person_track_details(
    track_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed information about a specific person track"""

    track = db.query(PersonTrack).filter(PersonTrack.id == track_id).first()

    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Person track not found"
        )

    # Get all detections with camera info
    detections = db.query(PersonDetection).filter(
        PersonDetection.person_track_id == track.id
    ).order_by(PersonDetection.timestamp).all()

    # Get camera path (sequence of cameras visited)
    camera_path = []
    for detection in detections:
        camera_info = {
            "camera_id": detection.camera_id,
            "camera_name": detection.camera.name if detection.camera else None,
            "camera_location": detection.camera.location if detection.camera else None,
            "timestamp": detection.timestamp.isoformat(),
            "is_compliant": detection.is_compliant
        }
        # Avoid duplicates in path
        if not camera_path or camera_path[-1]["camera_id"] != detection.camera_id:
            camera_path.append(camera_info)

    # Get unique cameras visited
    unique_cameras = db.query(Camera).join(
        PersonDetection, Camera.id == PersonDetection.camera_id
    ).filter(PersonDetection.person_track_id == track.id).distinct().all()

    return {
        "id": track.id,
        "track_id": track.track_id,
        "first_seen": track.first_seen.isoformat(),
        "last_seen": track.last_seen.isoformat(),
        "duration": (track.last_seen - track.first_seen).total_seconds(),
        "total_cameras_visited": track.total_cameras_visited,
        "is_compliant": track.is_compliant,
        "total_violations": track.total_violations,
        "cameras_visited": [
            {
                "id": cam.id,
                "name": cam.name,
                "location": cam.location
            } for cam in unique_cameras
        ],
        "camera_path": camera_path,
        "detections": [
            {
                "id": det.id,
                "timestamp": det.timestamp.isoformat(),
                "camera_id": det.camera_id,
                "camera_name": det.camera.name if det.camera else None,
                "is_compliant": det.is_compliant,
                "confidence": det.confidence,
                "bounding_box": det.bounding_box
            } for det in detections
        ]
    }


@router.get("/stats/multi-camera")
def get_multi_camera_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics about people moving across multiple cameras"""

    query = db.query(PersonTrack)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(PersonTrack.first_seen >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(PersonTrack.last_seen <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format"
            )

    # Total tracks
    total_tracks = query.count()

    # Tracks that visited multiple cameras
    multi_camera_tracks = query.filter(PersonTrack.total_cameras_visited > 1).count()

    # Non-compliant tracks
    non_compliant_tracks = query.filter(PersonTrack.is_compliant == False).count()

    # Average cameras visited
    avg_cameras = db.query(func.avg(PersonTrack.total_cameras_visited)).filter(
        PersonTrack.id.in_([t.id for t in query.all()])
    ).scalar() or 0

    # Most visited camera pairs (transitions)
    # This would require more complex query, simplified for now

    return {
        "total_tracks": total_tracks,
        "multi_camera_tracks": multi_camera_tracks,
        "single_camera_tracks": total_tracks - multi_camera_tracks,
        "non_compliant_tracks": non_compliant_tracks,
        "compliance_rate": round((total_tracks - non_compliant_tracks) / total_tracks * 100, 2) if total_tracks > 0 else 100,
        "avg_cameras_visited": round(avg_cameras, 2)
    }
