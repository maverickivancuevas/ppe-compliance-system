"""
Push Notification Service for sending notifications to mobile devices

Supports:
- Firebase Cloud Messaging (FCM) for Android and Web
- Apple Push Notification Service (APNS) for iOS

Note: This is a framework/template. You'll need to:
1. Install firebase-admin: pip install firebase-admin
2. Set up Firebase project and download service account key
3. Configure FIREBASE_CREDENTIALS_PATH in environment
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.orm import Session

from ..models import (
    User, PushNotification, DeviceToken, DetectionEvent,
    Incident, NearMissEvent, NotificationPriority
)
from ..core.timezone import get_philippine_time_naive

logger = logging.getLogger("ppe_compliance.push_notifications")

# Try to import Firebase Admin SDK (optional dependency)
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("Firebase Admin SDK not installed. Push notifications will be disabled.")


class PushNotificationService:
    """Service for managing push notifications to mobile devices"""

    def __init__(self, credentials_path: Optional[str] = None):
        self.firebase_app = None
        self.enabled = False

        if FIREBASE_AVAILABLE and credentials_path:
            try:
                cred = credentials.Certificate(credentials_path)
                self.firebase_app = firebase_admin.initialize_app(cred)
                self.enabled = True
                logger.info("✓ Firebase push notifications enabled")
            except Exception as e:
                logger.error(f"Failed to initialize Firebase: {e}")
                self.enabled = False
        else:
            logger.warning("Push notifications disabled - Firebase credentials not configured")

    def send_notification(
        self,
        db: Session,
        user_id: str,
        title: str,
        body: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        data: Optional[Dict[str, Any]] = None,
        detection_event_id: Optional[str] = None,
        incident_id: Optional[str] = None,
        near_miss_id: Optional[str] = None
    ) -> List[str]:
        """
        Send push notification to all devices of a user

        Returns list of notification IDs
        """

        # Get user's active device tokens
        device_tokens = db.query(DeviceToken).filter(
            DeviceToken.user_id == user_id,
            DeviceToken.is_active == True
        ).all()

        if not device_tokens:
            logger.warning(f"No active device tokens found for user {user_id}")
            return []

        notification_ids = []

        for device_token in device_tokens:
            # Create notification record
            notification = PushNotification(
                user_id=user_id,
                device_token_id=device_token.id,
                title=title,
                body=body,
                priority=priority,
                detection_event_id=detection_event_id,
                incident_id=incident_id,
                near_miss_id=near_miss_id,
                data=json.dumps(data) if data else None
            )

            db.add(notification)
            db.flush()  # Get notification ID

            # Send via Firebase if enabled
            if self.enabled:
                success = self._send_fcm_notification(
                    token=device_token.token,
                    title=title,
                    body=body,
                    data=data or {},
                    priority=priority
                )

                if success:
                    notification.sent = True
                    notification.sent_at = get_philippine_time_naive()
                    device_token.last_used = get_philippine_time_naive()
                    logger.info(f"✓ Notification sent to device {device_token.id}")
                else:
                    notification.error_message = "Failed to send notification"
                    logger.error(f"✗ Failed to send notification to device {device_token.id}")
            else:
                # Mark as sent even if disabled (for testing)
                notification.sent = True
                notification.sent_at = get_philippine_time_naive()
                logger.debug(f"Push notifications disabled - notification logged only")

            notification_ids.append(notification.id)

        db.commit()
        return notification_ids

    def _send_fcm_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Dict[str, Any],
        priority: NotificationPriority
    ) -> bool:
        """Send notification via Firebase Cloud Messaging"""

        if not self.enabled:
            return False

        try:
            # Convert priority to FCM priority
            fcm_priority = "high" if priority in [NotificationPriority.HIGH, NotificationPriority.URGENT] else "normal"

            # Build notification
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data={k: str(v) for k, v in data.items()},  # FCM data must be strings
                token=token,
                android=messaging.AndroidConfig(
                    priority=fcm_priority,
                    notification=messaging.AndroidNotification(
                        sound="default",
                        priority="high" if priority == NotificationPriority.URGENT else "default"
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1
                        )
                    )
                )
            )

            # Send message
            response = messaging.send(message)
            logger.debug(f"FCM response: {response}")
            return True

        except Exception as e:
            logger.error(f"FCM send error: {e}")
            return False

    def send_violation_alert(
        self,
        db: Session,
        user_id: str,
        detection_event: DetectionEvent,
        camera_name: str
    ) -> List[str]:
        """Send notification for a violation event"""

        title = f"🚨 Safety Violation Detected"
        body = f"{detection_event.violation_type} detected at {camera_name}"

        data = {
            "type": "violation",
            "detection_event_id": detection_event.id,
            "camera_id": detection_event.camera_id,
            "violation_type": detection_event.violation_type,
            "timestamp": detection_event.timestamp.isoformat()
        }

        return self.send_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            priority=NotificationPriority.HIGH,
            data=data,
            detection_event_id=detection_event.id
        )

    def send_near_miss_alert(
        self,
        db: Session,
        user_id: str,
        near_miss_event: NearMissEvent,
        camera_name: str
    ) -> List[str]:
        """Send notification for a near-miss event"""

        severity_emoji = {
            "low": "⚠️",
            "medium": "⚠️",
            "high": "🔶",
            "critical": "🔴"
        }

        title = f"{severity_emoji.get(near_miss_event.severity.value, '⚠️')} Near-Miss Detected"
        body = f"{near_miss_event.near_miss_type} at {camera_name} - {near_miss_event.severity.value.upper()} severity"

        data = {
            "type": "near_miss",
            "near_miss_id": near_miss_event.id,
            "camera_id": near_miss_event.camera_id,
            "severity": near_miss_event.severity.value,
            "near_miss_type": near_miss_event.near_miss_type,
            "timestamp": near_miss_event.timestamp.isoformat()
        }

        priority = NotificationPriority.URGENT if near_miss_event.severity.value == "critical" else NotificationPriority.HIGH

        return self.send_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            priority=priority,
            data=data,
            near_miss_id=near_miss_event.id
        )

    def send_incident_update(
        self,
        db: Session,
        user_id: str,
        incident: Incident,
        message: str
    ) -> List[str]:
        """Send notification for incident updates"""

        title = f"Incident #{incident.id[:8]} Updated"
        body = message

        data = {
            "type": "incident_update",
            "incident_id": incident.id,
            "status": incident.status.value,
            "timestamp": get_philippine_time_naive().isoformat()
        }

        return self.send_notification(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            priority=NotificationPriority.NORMAL,
            data=data,
            incident_id=incident.id
        )


# Global instance (will be initialized in main.py)
push_service: Optional[PushNotificationService] = None


def get_push_service() -> Optional[PushNotificationService]:
    """Get the global push notification service instance"""
    return push_service


def init_push_service(credentials_path: Optional[str] = None) -> PushNotificationService:
    """Initialize the global push notification service"""
    global push_service
    push_service = PushNotificationService(credentials_path)
    return push_service
