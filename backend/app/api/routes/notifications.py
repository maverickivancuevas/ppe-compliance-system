from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

from ...core.database import get_db
from ...models import User, DeviceToken, PushNotification
from ...api.routes.auth import get_current_user
from ...services.push_notification_service import get_push_service
from ...core.timezone import get_philippine_time_naive

router = APIRouter()


class RegisterDeviceRequest(BaseModel):
    token: str
    platform: str  # "ios", "android", "web"
    device_name: Optional[str] = None
    device_model: Optional[str] = None


class SendTestNotification(BaseModel):
    title: str
    body: str


@router.post("/devices/register")
def register_device(
    request: RegisterDeviceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a device for push notifications"""

    # Check if token already exists
    existing_token = db.query(DeviceToken).filter(
        DeviceToken.token == request.token
    ).first()

    if existing_token:
        # Update existing token
        existing_token.user_id = current_user.id
        existing_token.platform = request.platform
        existing_token.device_name = request.device_name
        existing_token.device_model = request.device_model
        existing_token.is_active = True
        existing_token.last_used = get_philippine_time_naive()
        db.commit()

        return {
            "message": "Device token updated",
            "device_id": existing_token.id
        }

    # Create new device token
    device_token = DeviceToken(
        user_id=current_user.id,
        token=request.token,
        platform=request.platform,
        device_name=request.device_name,
        device_model=request.device_model
    )

    db.add(device_token)
    db.commit()

    return {
        "message": "Device registered successfully",
        "device_id": device_token.id
    }


@router.get("/devices")
def get_user_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all registered devices for current user"""

    devices = db.query(DeviceToken).filter(
        DeviceToken.user_id == current_user.id
    ).order_by(desc(DeviceToken.last_used)).all()

    return {
        "devices": [
            {
                "id": device.id,
                "platform": device.platform,
                "device_name": device.device_name,
                "device_model": device.device_model,
                "is_active": device.is_active,
                "last_used": device.last_used.isoformat() if device.last_used else None,
                "created_at": device.created_at.isoformat()
            } for device in devices
        ]
    }


@router.delete("/devices/{device_id}")
def unregister_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Unregister a device"""

    device = db.query(DeviceToken).filter(
        DeviceToken.id == device_id,
        DeviceToken.user_id == current_user.id
    ).first()

    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    # Mark as inactive instead of deleting
    device.is_active = False
    db.commit()

    return {"message": "Device unregistered successfully"}


@router.get("/history")
def get_notification_history(
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification history for current user"""

    query = db.query(PushNotification).filter(
        PushNotification.user_id == current_user.id
    ).order_by(desc(PushNotification.created_at))

    total = query.count()
    notifications = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "notifications": [
            {
                "id": notif.id,
                "title": notif.title,
                "body": notif.body,
                "priority": notif.priority.value,
                "sent": notif.sent,
                "sent_at": notif.sent_at.isoformat() if notif.sent_at else None,
                "delivered": notif.delivered,
                "read": notif.read,
                "read_at": notif.read_at.isoformat() if notif.read_at else None,
                "created_at": notif.created_at.isoformat(),
                "detection_event_id": notif.detection_event_id,
                "incident_id": notif.incident_id,
                "near_miss_id": notif.near_miss_id
            } for notif in notifications
        ]
    }


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""

    notification = db.query(PushNotification).filter(
        PushNotification.id == notification_id,
        PushNotification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    if not notification.read:
        notification.read = True
        notification.read_at = get_philippine_time_naive()
        db.commit()

    return {"message": "Notification marked as read"}


@router.post("/test")
def send_test_notification(
    request: SendTestNotification,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a test push notification to current user's devices"""

    push_service = get_push_service()

    if not push_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Push notification service not available"
        )

    notification_ids = push_service.send_notification(
        db=db,
        user_id=current_user.id,
        title=request.title,
        body=request.body,
        data={"type": "test"}
    )

    if not notification_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active devices found for this user"
        )

    return {
        "message": f"Test notification sent to {len(notification_ids)} device(s)",
        "notification_ids": notification_ids
    }


@router.get("/stats")
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification statistics for current user"""

    # Get notifications from last 30 days
    thirty_days_ago = get_philippine_time_naive() - timedelta(days=30)

    query = db.query(PushNotification).filter(
        PushNotification.user_id == current_user.id,
        PushNotification.created_at >= thirty_days_ago
    )

    total = query.count()
    sent = query.filter(PushNotification.sent == True).count()
    read = query.filter(PushNotification.read == True).count()
    unread = total - read

    return {
        "total_notifications": total,
        "sent": sent,
        "read": read,
        "unread": unread,
        "period": "Last 30 days"
    }
