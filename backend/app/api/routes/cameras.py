from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ...core.database import get_db
from ...core.security import get_admin_user, get_super_admin_user, get_safety_manager_or_admin
from ...models.user import User, UserRole
from ...models.camera import Camera
from ...schemas.camera import CameraResponse, CameraCreate, CameraUpdate

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("/", response_model=List[CameraResponse])
def get_all_cameras(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Get all cameras"""
    cameras = db.query(Camera).offset(skip).limit(limit).all()
    return cameras


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_safety_manager_or_admin)
):
    """Get a specific camera by ID"""
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )
    return camera


@router.post("/", response_model=CameraResponse, status_code=status.HTTP_201_CREATED)
def create_camera(
    camera_data: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new camera (Admin or Super Admin)"""

    new_camera = Camera(
        name=camera_data.name,
        location=camera_data.location,
        stream_url=camera_data.stream_url,
        description=camera_data.description,
        created_by=current_user.id  # Track who created this camera
    )

    db.add(new_camera)
    db.commit()
    db.refresh(new_camera)

    return new_camera


@router.put("/{camera_id}", response_model=CameraResponse)
def update_camera(
    camera_id: str,
    camera_data: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a camera - Super admin: all cameras, Admin: only cameras they created"""

    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )

    # Permission check: Admins can only edit cameras they created
    if current_user.role == UserRole.ADMIN:
        if camera.created_by != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admins can only edit cameras they created"
            )
    # Super admin can edit any camera

    # Update fields
    if camera_data.name is not None:
        camera.name = camera_data.name

    if camera_data.location is not None:
        camera.location = camera_data.location

    if camera_data.stream_url is not None:
        camera.stream_url = camera_data.stream_url

    if camera_data.status is not None:
        camera.status = camera_data.status

    if camera_data.description is not None:
        camera.description = camera_data.description

    db.commit()
    db.refresh(camera)

    return camera


@router.delete("/{camera_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_camera(
    camera_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_super_admin_user)
):
    """Delete a camera (Super Admin only)"""

    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Camera not found"
        )

    db.delete(camera)
    db.commit()

    return None
