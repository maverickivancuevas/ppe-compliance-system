from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from ...core.database import get_db
from ...models import User, Worker, Camera, Attendance
from ...api.routes.auth import get_current_user
from ...services.qr_service import get_qr_service
from ...core.timezone import get_philippine_time_naive
import os

router = APIRouter()


# Pydantic schemas
class WorkerCreate(BaseModel):
    full_name: str
    contact_number: Optional[str] = None
    position: Optional[str] = None
    emergency_contact: Optional[str] = None


class WorkerUpdate(BaseModel):
    full_name: Optional[str] = None
    contact_number: Optional[str] = None
    position: Optional[str] = None
    emergency_contact: Optional[str] = None
    is_active: Optional[bool] = None


def generate_account_number(db: Session) -> str:
    """Generate next sequential account number in format WKR-###"""
    # Get the latest worker by account number
    latest_worker = db.query(Worker).order_by(desc(Worker.account_number)).first()

    if not latest_worker:
        return "WKR-001"

    # Extract the number from the last account number
    try:
        last_number = int(latest_worker.account_number.split("-")[-1])
        new_number = last_number + 1
        return f"WKR-{new_number:03d}"
    except:
        # Fallback if parsing fails
        count = db.query(Worker).count()
        return f"WKR-{count + 1:03d}"


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_worker(
    worker_data: WorkerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new construction worker"""

    # Only safety managers can create workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can create workers"
        )

    # Generate account number
    account_number = generate_account_number(db)

    # Create worker (site will be assigned during first check-in)
    worker = Worker(
        account_number=account_number,
        full_name=worker_data.full_name,
        contact_number=worker_data.contact_number,
        position=worker_data.position,
        emergency_contact=worker_data.emergency_contact
    )

    db.add(worker)
    db.flush()  # Get worker ID

    # Generate QR code
    qr_service = get_qr_service()
    try:
        qr_path = qr_service.generate_qr_code(account_number)
        worker.qr_code_path = qr_path
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate QR code: {str(e)}"
        )

    db.commit()
    db.refresh(worker)

    # Get camera name if assigned
    camera_name = None
    if worker.camera_id and worker.camera:
        camera_name = worker.camera.name

    return {
        "id": worker.id,
        "account_number": worker.account_number,
        "full_name": worker.full_name,
        "contact_number": worker.contact_number,
        "position": worker.position,
        "emergency_contact": worker.emergency_contact,
        "camera_id": worker.camera_id,
        "camera_name": camera_name,
        "qr_code_url": qr_service.get_qr_code_url(worker.qr_code_path),
        "is_active": worker.is_active,
        "created_at": worker.created_at.isoformat()
    }


@router.get("/")
def get_workers(
    is_active: Optional[bool] = Query(None),
    camera_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of workers with filters"""

    # Only safety managers can view workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view workers"
        )

    query = db.query(Worker)

    # Filter by active status
    if is_active is not None:
        query = query.filter(Worker.is_active == is_active)

    # Filter by camera/location
    if camera_id:
        if camera_id == "unassigned":
            # Filter for workers with no camera assigned
            query = query.filter(Worker.camera_id.is_(None))
        else:
            # Filter for specific camera
            query = query.filter(Worker.camera_id == camera_id)

    # Search by name or account number
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Worker.full_name.ilike(search_term)) |
            (Worker.account_number.ilike(search_term))
        )

    # Order by account number
    query = query.order_by(Worker.account_number)

    # Pagination
    total = query.count()
    workers = query.offset(offset).limit(limit).all()

    qr_service = get_qr_service()

    results = []
    for worker in workers:
        camera_name = worker.camera.name if worker.camera else None
        results.append({
            "id": worker.id,
            "account_number": worker.account_number,
            "full_name": worker.full_name,
            "contact_number": worker.contact_number,
            "position": worker.position,
            "emergency_contact": worker.emergency_contact,
            "camera_id": worker.camera_id,
            "camera_name": camera_name,
            "qr_code_url": qr_service.get_qr_code_url(worker.qr_code_path),
            "is_active": worker.is_active,
            "created_at": worker.created_at.isoformat()
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "workers": results
    }


@router.get("/{worker_id}")
def get_worker(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed worker information"""

    # Only safety managers can view workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view workers"
        )

    worker = db.query(Worker).filter(Worker.id == worker_id).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    qr_service = get_qr_service()
    camera_name = worker.camera.name if worker.camera else None

    # Get full camera details if assigned
    camera_details = None
    if worker.camera:
        camera_details = {
            "id": worker.camera.id,
            "name": worker.camera.name,
            "location": worker.camera.location,
            "status": worker.camera.status,
            "description": worker.camera.description
        }

    # Get attendance stats
    total_days = db.query(Attendance).filter(
        Attendance.worker_id == worker_id,
        Attendance.status == "checked_out"
    ).count()

    total_hours = db.query(func.sum(Attendance.hours_worked)).filter(
        Attendance.worker_id == worker_id
    ).scalar() or 0

    return {
        "id": worker.id,
        "account_number": worker.account_number,
        "full_name": worker.full_name,
        "contact_number": worker.contact_number,
        "position": worker.position,
        "emergency_contact": worker.emergency_contact,
        "camera_id": worker.camera_id,
        "camera_name": camera_name,
        "camera": camera_details,
        "qr_code_url": qr_service.get_qr_code_url(worker.qr_code_path),
        "is_active": worker.is_active,
        "created_at": worker.created_at.isoformat(),
        "updated_at": worker.updated_at.isoformat(),
        "attendance_stats": {
            "total_days_worked": total_days,
            "total_hours_worked": round(total_hours / 60, 2) if total_hours else 0
        }
    }


@router.get("/account/{account_number}")
def get_worker_by_account_number(
    account_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get worker by account number (for QR code scanning)"""

    # Only safety managers can view workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view workers"
        )

    worker = db.query(Worker).filter(Worker.account_number == account_number).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with account number {account_number} not found"
        )

    qr_service = get_qr_service()
    camera_name = worker.camera.name if worker.camera else None

    # Get recent attendance
    recent_attendance = db.query(Attendance).filter(
        Attendance.worker_id == worker.id
    ).order_by(desc(Attendance.check_in_time)).limit(5).all()

    return {
        "id": worker.id,
        "account_number": worker.account_number,
        "full_name": worker.full_name,
        "contact_number": worker.contact_number,
        "position": worker.position,
        "emergency_contact": worker.emergency_contact,
        "camera_id": worker.camera_id,
        "camera_name": camera_name,
        "qr_code_url": qr_service.get_qr_code_url(worker.qr_code_path),
        "is_active": worker.is_active,
        "recent_attendance": [
            {
                "id": att.id,
                "check_in_time": att.check_in_time.isoformat(),
                "check_out_time": att.check_out_time.isoformat() if att.check_out_time else None,
                "hours_worked": round(att.hours_worked / 60, 2) if att.hours_worked else None,
                "status": att.status
            } for att in recent_attendance
        ]
    }


@router.put("/{worker_id}")
def update_worker(
    worker_id: str,
    worker_data: WorkerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update worker information"""

    # Only safety managers can update workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can update workers"
        )

    worker = db.query(Worker).filter(Worker.id == worker_id).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    # Update fields
    if worker_data.full_name is not None:
        worker.full_name = worker_data.full_name
    if worker_data.contact_number is not None:
        worker.contact_number = worker_data.contact_number
    if worker_data.position is not None:
        worker.position = worker_data.position
    if worker_data.emergency_contact is not None:
        worker.emergency_contact = worker_data.emergency_contact
    if worker_data.is_active is not None:
        worker.is_active = worker_data.is_active

    worker.updated_at = get_philippine_time_naive()

    db.commit()
    db.refresh(worker)

    qr_service = get_qr_service()
    camera_name = worker.camera.name if worker.camera else None

    return {
        "id": worker.id,
        "account_number": worker.account_number,
        "full_name": worker.full_name,
        "contact_number": worker.contact_number,
        "position": worker.position,
        "emergency_contact": worker.emergency_contact,
        "camera_id": worker.camera_id,
        "camera_name": camera_name,
        "qr_code_url": qr_service.get_qr_code_url(worker.qr_code_path),
        "is_active": worker.is_active,
        "updated_at": worker.updated_at.isoformat()
    }


@router.delete("/{worker_id}")
def delete_worker(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a worker"""

    # Only safety managers can delete workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can delete workers"
        )

    worker = db.query(Worker).filter(Worker.id == worker_id).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    # Delete QR code file
    qr_service = get_qr_service()
    if worker.qr_code_path:
        qr_service.delete_qr_code(worker.qr_code_path)

    # Delete worker (cascades to attendance records)
    db.delete(worker)
    db.commit()

    return {"message": "Worker deleted successfully"}


@router.get("/{worker_id}/qr")
def download_qr_code(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download worker's QR code image"""

    # Only safety managers can download QR codes
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can download QR codes"
        )

    worker = db.query(Worker).filter(Worker.id == worker_id).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    if not worker.qr_code_path or not os.path.exists(worker.qr_code_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code file not found"
        )

    return FileResponse(
        worker.qr_code_path,
        media_type="image/png",
        filename=f"QR_{worker.account_number}.png"
    )


@router.get("/stats/summary")
def get_worker_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get worker statistics for dashboard"""

    # Only safety managers can view stats
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view statistics"
        )

    total_workers = db.query(Worker).count()
    active_workers = db.query(Worker).filter(Worker.is_active == True).count()
    inactive_workers = total_workers - active_workers

    # Workers checked in today
    today = get_philippine_time_naive().date()
    checked_in_today = db.query(Attendance).filter(
        func.date(Attendance.check_in_time) == today,
        Attendance.status == "checked_in"
    ).count()

    return {
        "total_workers": total_workers,
        "active_workers": active_workers,
        "inactive_workers": inactive_workers,
        "checked_in_today": checked_in_today
    }
