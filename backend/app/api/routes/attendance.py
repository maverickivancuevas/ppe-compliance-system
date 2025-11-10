from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from ...core.database import get_db
from ...models import User, Worker, Attendance, Camera
from ...api.routes.auth import get_current_user
from ...core.timezone import get_philippine_time_naive

router = APIRouter()


# Pydantic schemas
class CheckInRequest(BaseModel):
    account_number: str
    location: Optional[str] = None


class CheckOutRequest(BaseModel):
    account_number: str
    location: Optional[str] = None
    notes: Optional[str] = None


@router.post("/check-in", status_code=status.HTTP_201_CREATED)
def check_in_worker(
    data: CheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check in a worker via QR code scan"""

    # Only safety managers can check in workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can check in workers"
        )

    # Find worker
    worker = db.query(Worker).filter(
        Worker.account_number == data.account_number
    ).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with account number {data.account_number} not found"
        )

    if not worker.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Worker is inactive"
        )

    # Check if already checked in today
    today = get_philippine_time_naive().date()
    existing_checkin = db.query(Attendance).filter(
        Attendance.worker_id == worker.id,
        func.date(Attendance.check_in_time) == today,
        Attendance.status == "checked_in"
    ).first()

    if existing_checkin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Worker already checked in today at {existing_checkin.check_in_time.strftime('%I:%M %p')}"
        )

    # If location is provided, try to find and assign camera to worker
    if data.location:
        # Try to find camera by name
        camera = db.query(Camera).filter(Camera.name == data.location).first()
        if camera:
            # Update worker's assigned camera
            worker.camera_id = camera.id
            worker.updated_at = get_philippine_time_naive()

    # Create attendance record
    attendance = Attendance(
        worker_id=worker.id,
        check_in_time=get_philippine_time_naive(),
        check_in_location=data.location,
        status="checked_in"
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)

    return {
        "id": attendance.id,
        "worker_id": worker.id,
        "worker_name": worker.full_name,
        "account_number": worker.account_number,
        "check_in_time": attendance.check_in_time.isoformat(),
        "check_in_location": attendance.check_in_location,
        "status": attendance.status,
        "message": f"{worker.full_name} checked in successfully"
    }


@router.post("/check-out")
def check_out_worker(
    data: CheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check out a worker via QR code scan"""

    # Only safety managers can check out workers
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can check out workers"
        )

    # Find worker
    worker = db.query(Worker).filter(
        Worker.account_number == data.account_number
    ).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker with account number {data.account_number} not found"
        )

    # Find active check-in for today
    today = get_philippine_time_naive().date()
    attendance = db.query(Attendance).filter(
        Attendance.worker_id == worker.id,
        func.date(Attendance.check_in_time) == today,
        Attendance.status == "checked_in"
    ).first()

    if not attendance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active check-in found for today"
        )

    # Update attendance record
    check_out_time = get_philippine_time_naive()
    attendance.check_out_time = check_out_time
    attendance.check_out_location = data.location
    attendance.status = "checked_out"
    attendance.notes = data.notes

    # Calculate hours worked in minutes
    time_diff = check_out_time - attendance.check_in_time
    attendance.hours_worked = int(time_diff.total_seconds() / 60)

    db.commit()
    db.refresh(attendance)

    return {
        "id": attendance.id,
        "worker_id": worker.id,
        "worker_name": worker.full_name,
        "account_number": worker.account_number,
        "check_in_time": attendance.check_in_time.isoformat(),
        "check_out_time": attendance.check_out_time.isoformat(),
        "hours_worked": round(attendance.hours_worked / 60, 2),
        "status": attendance.status,
        "message": f"{worker.full_name} checked out successfully. Worked {round(attendance.hours_worked / 60, 2)} hours"
    }


@router.get("/")
def get_attendance_records(
    worker_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance records with filters"""

    # Only safety managers can view attendance
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view attendance records"
        )

    query = db.query(Attendance)

    # Filter by worker
    if worker_id:
        query = query.filter(Attendance.worker_id == worker_id)

    # Filter by status
    if status:
        query = query.filter(Attendance.status == status)

    # Filter by date range
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(Attendance.check_in_time >= start_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid start_date format"
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(Attendance.check_in_time <= end_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid end_date format"
            )

    # Order by most recent
    query = query.order_by(desc(Attendance.check_in_time))

    # Pagination
    total = query.count()
    records = query.offset(offset).limit(limit).all()

    results = []
    for record in records:
        worker = record.worker
        results.append({
            "id": record.id,
            "worker_id": worker.id,
            "worker_name": worker.full_name,
            "account_number": worker.account_number,
            "check_in_time": record.check_in_time.isoformat(),
            "check_out_time": record.check_out_time.isoformat() if record.check_out_time else None,
            "hours_worked": round(record.hours_worked / 60, 2) if record.hours_worked else None,
            "check_in_location": record.check_in_location,
            "check_out_location": record.check_out_location,
            "status": record.status,
            "notes": record.notes
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "records": results
    }


@router.get("/today")
def get_todays_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get today's attendance summary"""

    # Only safety managers can view attendance
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view attendance"
        )

    today = get_philippine_time_naive().date()

    # Get today's records
    records = db.query(Attendance).filter(
        func.date(Attendance.check_in_time) == today
    ).all()

    checked_in = []
    checked_out = []

    for record in records:
        worker = record.worker
        data = {
            "id": record.id,
            "worker_id": worker.id,
            "worker_name": worker.full_name,
            "account_number": worker.account_number,
            "check_in_time": record.check_in_time.isoformat(),
            "check_out_time": record.check_out_time.isoformat() if record.check_out_time else None,
            "hours_worked": round(record.hours_worked / 60, 2) if record.hours_worked else None,
            "status": record.status
        }

        if record.status == "checked_in":
            checked_in.append(data)
        else:
            checked_out.append(data)

    return {
        "date": today.isoformat(),
        "total_checked_in": len(checked_in),
        "total_checked_out": len(checked_out),
        "checked_in_workers": checked_in,
        "checked_out_workers": checked_out
    }


@router.get("/stats/worker/{worker_id}")
def get_worker_attendance_stats(
    worker_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance statistics for a specific worker"""

    # Only safety managers can view stats
    if current_user.role not in ["safety_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only safety managers can view statistics"
        )

    worker = db.query(Worker).filter(Worker.id == worker_id).first()

    if not worker:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found"
        )

    # Total days worked
    total_days = db.query(Attendance).filter(
        Attendance.worker_id == worker_id,
        Attendance.status == "checked_out"
    ).count()

    # Total hours worked
    total_minutes = db.query(func.sum(Attendance.hours_worked)).filter(
        Attendance.worker_id == worker_id,
        Attendance.hours_worked.isnot(None)
    ).scalar() or 0

    # Average hours per day
    avg_hours = (total_minutes / total_days / 60) if total_days > 0 else 0

    # Current month stats
    now = get_philippine_time_naive()
    month_start = datetime(now.year, now.month, 1)
    month_days = db.query(Attendance).filter(
        Attendance.worker_id == worker_id,
        Attendance.check_in_time >= month_start,
        Attendance.status == "checked_out"
    ).count()

    return {
        "worker_id": worker_id,
        "worker_name": worker.full_name,
        "account_number": worker.account_number,
        "total_days_worked": total_days,
        "total_hours_worked": round(total_minutes / 60, 2),
        "average_hours_per_day": round(avg_hours, 2),
        "days_this_month": month_days
    }
