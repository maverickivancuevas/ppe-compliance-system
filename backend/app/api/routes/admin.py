from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional
import io
import csv
from ...core.database import get_db
from ...core.security import get_admin_user, verify_password, get_password_hash
from ...models.user import User
from ...models.detection import DetectionEvent
from ...models.alert import Alert
from ...core.logger import get_logger
from ...core.timezone import get_philippine_time_naive
from ...services.archiving_service import get_archiving_service

router = APIRouter(tags=["Admin"])
logger = get_logger(__name__)


class SetPINRequest(BaseModel):
    current_password: str
    new_pin: str  # 4-digit PIN


class VerifyPINRequest(BaseModel):
    email: str
    password: str
    pin: str


class DeleteDetectionsRequest(BaseModel):
    email: str
    password: str
    pin: str
    days: int  # Delete detections older than X days


@router.post("/set-pin")
def set_deletion_pin(
    request: SetPINRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Set or update the 4-digit PIN for database deletion (Admin only)"""

    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Validate PIN format (must be 4 digits)
    if not request.new_pin.isdigit() or len(request.new_pin) != 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PIN must be exactly 4 digits"
        )

    # Hash the PIN before storing (same as password for security)
    current_user.deletion_pin = get_password_hash(request.new_pin)
    db.commit()

    logger.info(f"Admin {current_user.email} set/updated deletion PIN")

    return {
        "message": "Deletion PIN set successfully",
        "pin_set": True
    }


@router.post("/verify-pin")
def verify_deletion_pin(
    request: VerifyPINRequest,
    db: Session = Depends(get_db)
):
    """Verify admin credentials and PIN before allowing database operations"""

    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or insufficient permissions"
        )

    # Verify password
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Check if PIN is set
    if not user.deletion_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion PIN not set. Please set a PIN first in settings."
        )

    # Verify PIN
    if not verify_password(request.pin, user.deletion_pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )

    logger.info(f"PIN verified successfully for admin {user.email}")

    return {
        "message": "PIN verified successfully",
        "verified": True
    }


@router.post("/delete-detections")
def delete_detections_by_days(
    request: DeleteDetectionsRequest,
    db: Session = Depends(get_db)
):
    """Delete detection events older than specified days (Admin only with PIN verification)"""

    # Find user
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or insufficient permissions"
        )

    # Verify password
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )

    # Check if PIN is set
    if not user.deletion_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deletion PIN not set"
        )

    # Verify PIN
    if not verify_password(request.pin, user.deletion_pin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN"
        )

    # Validate days parameter
    if request.days < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Days must be a positive number"
        )

    try:
        # Calculate cutoff date
        cutoff_date = get_philippine_time_naive() - timedelta(days=request.days)

        # Count detections to be deleted
        detections_query = db.query(DetectionEvent).filter(
            DetectionEvent.timestamp < cutoff_date
        )
        count_before = detections_query.count()

        # Delete associated alerts first (cascade should handle this, but being explicit)
        db.query(Alert).filter(
            Alert.detection_event_id.in_(
                db.query(DetectionEvent.id).filter(
                    DetectionEvent.timestamp < cutoff_date
                )
            )
        ).delete(synchronize_session=False)

        # Delete detections
        detections_query.delete(synchronize_session=False)
        db.commit()

        logger.warning(
            f"Admin {user.email} deleted {count_before} detection events older than {request.days} days"
        )

        return {
            "message": f"Successfully deleted {count_before} detection events",
            "deleted_count": count_before,
            "cutoff_date": cutoff_date.isoformat()
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting detections: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete detections: {str(e)}"
        )


@router.get("/pin-status")
def get_pin_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Check if the admin has set a deletion PIN"""
    return {
        "pin_set": current_user.deletion_pin is not None
    }


class AdminCreateUserRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # "admin" or "safety_manager"
    admin_password: str  # Admin must confirm their password


@router.post("/create-user", status_code=status.HTTP_201_CREATED)
def admin_create_user(
    request: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new user (Admin only - requires password confirmation)"""
    from ...core.validation import validate_email, validate_user_name, validate_password
    from ...models.user import UserRole
    
    # Verify admin's password before allowing user creation
    if not verify_password(request.admin_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin password. Password confirmation required to create users."
        )
    
    # Validate email format
    try:
        validated_email = validate_email(request.email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Validate full name
    try:
        validated_name = validate_user_name(request.full_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Validate password strength
    try:
        validate_password(request.password)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Validate role
    if request.role not in ["admin", "safety_manager"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'admin' or 'safety_manager'"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == validated_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {validated_email} already exists"
        )
    
    # Create new user
    new_user = User(
        email=validated_email,
        full_name=validated_name,
        hashed_password=get_password_hash(request.password),
        role=UserRole.ADMIN if request.role == "admin" else UserRole.SAFETY_MANAGER,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    logger.info(f"Admin {current_user.email} created new user: {new_user.email} (role: {new_user.role.value})")
    
    return {
        "message": "User created successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role.value,
            "is_active": new_user.is_active,
            "created_at": new_user.created_at.isoformat()
        }
    }


# Archive Settings
class UpdateArchiveSettingsRequest(BaseModel):
    archive_days: int


@router.get("/archive-settings")
def get_archive_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get current auto-archive settings"""
    archiving_service = get_archiving_service()

    return {
        "archive_days": archiving_service.archive_days,
        "running": archiving_service.running
    }


@router.put("/archive-settings")
def update_archive_settings(
    request: UpdateArchiveSettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update auto-archive settings"""

    if request.archive_days < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Archive days must be at least 1"
        )

    archiving_service = get_archiving_service()
    archiving_service.archive_days = request.archive_days

    logger.info(f"Admin {current_user.email} updated archive settings: {request.archive_days} days")

    return {
        "message": "Archive settings updated successfully",
        "archive_days": archiving_service.archive_days
    }


@router.post("/archive-now")
async def trigger_archive_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Manually trigger archiving process"""

    archiving_service = get_archiving_service()
    archived_count = await archiving_service.archive_old_detections()

    logger.info(f"Admin {current_user.email} manually triggered archiving: {archived_count} detections archived")

    return {
        "message": f"Archived {archived_count} detection events",
        "archived_count": archived_count
    }


@router.get("/archive-stats")
def get_archive_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Get statistics about archived and active detections"""

    # Count active (non-archived) detections
    active_count = db.query(DetectionEvent).filter(
        DetectionEvent.archived == False
    ).count()

    # Count archived detections
    archived_count = db.query(DetectionEvent).filter(
        DetectionEvent.archived == True
    ).count()

    # Get oldest active detection
    oldest_active = db.query(DetectionEvent).filter(
        DetectionEvent.archived == False
    ).order_by(DetectionEvent.timestamp.asc()).first()

    # Get oldest archived detection
    oldest_archived = db.query(DetectionEvent).filter(
        DetectionEvent.archived == True
    ).order_by(DetectionEvent.timestamp.asc()).first()

    # Get most recent archived detection
    newest_archived = db.query(DetectionEvent).filter(
        DetectionEvent.archived == True
    ).order_by(DetectionEvent.timestamp.desc()).first()

    archiving_service = get_archiving_service()
    cutoff_date = get_philippine_time_naive() - timedelta(days=archiving_service.archive_days)

    # Count detections that will be archived next run
    pending_archive_count = db.query(DetectionEvent).filter(
        and_(
            DetectionEvent.timestamp < cutoff_date,
            DetectionEvent.archived == False
        )
    ).count()

    return {
        "active_count": active_count,
        "archived_count": archived_count,
        "total_count": active_count + archived_count,
        "pending_archive_count": pending_archive_count,
        "archive_days": archiving_service.archive_days,
        "cutoff_date": cutoff_date.isoformat(),
        "oldest_active": oldest_active.timestamp.isoformat() if oldest_active else None,
        "oldest_archived": oldest_archived.timestamp.isoformat() if oldest_archived else None,
        "newest_archived": newest_archived.timestamp.isoformat() if newest_archived else None
    }


@router.get("/export-archived-detections")
def export_archived_detections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Export archived detections to CSV file"""

    # Get all archived detections
    archived_detections = db.query(DetectionEvent).filter(
        DetectionEvent.archived == True
    ).order_by(DetectionEvent.timestamp.desc()).all()

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'ID',
        'Timestamp',
        'Camera ID',
        'Camera Name',
        'Violation Type',
        'Is Compliant',
        'Hardhat Detected',
        'No Hardhat Detected',
        'Safety Vest Detected',
        'No Safety Vest Detected',
        'Person Detected',
        'Worker ID',
        'Snapshot URL',
        'Archived At'
    ])

    # Write data rows
    for detection in archived_detections:
        camera_name = detection.camera.name if detection.camera else 'Unknown'

        writer.writerow([
            detection.id,
            detection.timestamp.isoformat(),
            detection.camera_id or 'N/A',
            camera_name,
            detection.violation_type or 'N/A',
            'Yes' if detection.is_compliant else 'No',
            'TRUE' if detection.hardhat_detected else 'FALSE',
            'TRUE' if detection.no_hardhat_detected else 'FALSE',
            'TRUE' if detection.safety_vest_detected else 'FALSE',
            'TRUE' if detection.no_safety_vest_detected else 'FALSE',
            'TRUE' if detection.person_detected else 'FALSE',
            detection.worker_id or 'N/A',
            detection.snapshot_url or 'N/A',
            detection.archived_at.isoformat() if detection.archived_at else 'N/A'
        ])

    # Prepare the response
    output.seek(0)

    logger.info(f"Admin {current_user.email} exported {len(archived_detections)} archived detections to CSV")

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=archived_detections_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )

