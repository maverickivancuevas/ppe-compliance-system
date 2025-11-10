from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import cv2
import base64
import json
import asyncio
import uuid
from typing import Optional
from pathlib import Path
from ..core.database import get_db
from ..core.logger import get_logger
from ..core.config import settings
from ..core.exceptions import CameraConnectionError, DetectionSaveError
from ..models.camera import Camera
from ..models.detection import DetectionEvent
from ..models.alert import Alert, AlertSeverity
from ..models.incident import Incident, IncidentSeverity, IncidentStatus
from ..services.yolo_service import get_yolo_service
from ..services.email_service import get_email_service
from datetime import datetime
from ..core.timezone import get_philippine_time_naive

logger = get_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.active_streams: dict[str, bool] = {}  # Track active camera streams

    async def connect(self, websocket: WebSocket, camera_id: str):
        """Connect a client to a camera stream"""
        await websocket.accept()
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = []
        self.active_connections[camera_id].append(websocket)

    def disconnect(self, websocket: WebSocket, camera_id: str):
        """Disconnect a client from a camera stream"""
        if camera_id in self.active_connections:
            if websocket in self.active_connections[camera_id]:
                self.active_connections[camera_id].remove(websocket)
            if not self.active_connections[camera_id]:
                del self.active_connections[camera_id]
                # Stop the stream when no clients are connected
                self.active_streams[camera_id] = False

    def is_stream_active(self, camera_id: str) -> bool:
        """Check if a stream should continue running"""
        return camera_id in self.active_connections and len(self.active_connections[camera_id]) > 0

    async def broadcast(self, camera_id: str, message: dict):
        """Broadcast message to all clients watching a camera"""
        if camera_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[camera_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)

            # Remove disconnected clients
            for conn in disconnected:
                self.disconnect(conn, camera_id)


manager = ConnectionManager()


def detect_partial_visibility(results: dict) -> tuple[bool, str]:
    """
    Detect if person is only partially visible (e.g., only head visible, body not in frame).

    Args:
        results: Detection results from YOLO

    Returns:
        Tuple of (is_partial, reason)
    """
    person_detected = results.get('person_detected', False)
    hardhat_detected = results.get('hardhat_detected', False)
    no_hardhat_detected = results.get('no_hardhat_detected', False)
    safety_vest_detected = results.get('safety_vest_detected', False)
    no_safety_vest_detected = results.get('no_safety_vest_detected', False)

    # If person is detected but no vest-related detection at all (neither vest nor no-vest)
    # This suggests the body/vest area is not visible in frame
    if person_detected and not safety_vest_detected and not no_safety_vest_detected:
        return True, "Partial Detection - Body/Vest area not visible"

    return False, ""


async def process_camera_stream(
    camera_id: str,
    camera: Camera,
    save_detections: bool = True
):
    """Process camera stream and broadcast to connected clients"""

    # Create new database session for this task (thread-safe)
    from ..core.database import SessionLocal
    db = SessionLocal()

    try:
        # Send status update: Loading model
        await manager.broadcast(camera_id, {
            'type': 'status',
            'message': 'Loading YOLO detection model...'
        })

        yolo_service = get_yolo_service()

        # Send status update: Opening camera
        await manager.broadcast(camera_id, {
            'type': 'status',
            'message': 'Opening camera stream...'
        })

        stream_source = camera.stream_url if camera.stream_url else "0"

        # Cooldown timer per camera (10 seconds)
        last_detection_save_time = None
        cooldown_seconds = 10

        # Convert stream_source to integer if it's a digit
        try:
            source = int(stream_source)
        except (ValueError, TypeError):
            source = stream_source

        cap = cv2.VideoCapture(source)

        if not cap.isOpened():
            error_msg = f"Unable to open camera {source}. Please check if the camera is connected and not being used by another application."
            logger.error(f"Failed to open camera stream: {stream_source}")

            # Send error to client
            await manager.broadcast(camera_id, {
                'type': 'error',
                'message': error_msg
            })
            return

        cap.set(3, 1280)
        cap.set(4, 720)

        # Send success message: Stream started
        await manager.broadcast(camera_id, {
            'type': 'status',
            'message': 'Stream started successfully!'
        })

        frame_count = 0

        while cap.isOpened() and manager.is_stream_active(camera_id):
            success, frame = cap.read()
            if not success:
                break

            # Perform detection (no tracking)
            annotated_frame, results = yolo_service.detect_with_tracking(frame)

            # Check for partial visibility
            is_partial, partial_reason = detect_partial_visibility(results)

            # Encode frame to base64 for transmission
            _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            # Prepare message
            message = {
                'type': 'frame',
                'camera_id': camera_id,
                'frame': frame_base64,
                'results': {
                    'detected_classes': results['detected_classes'],
                    'is_compliant': results['is_compliant'],
                    'safety_status': results['safety_status'],
                    'violation_type': results.get('violation_type'),
                    'confidence_scores': results['confidence_scores'],
                    'person_detected': results.get('person_detected', False),
                    'person_count': sum(1 for d in results.get('detections', []) if d.get('class') == 'Person'),
                    'is_partial': is_partial,
                    'partial_reason': partial_reason
                },
                'timestamp': get_philippine_time_naive().isoformat()
            }

            # Broadcast to all connected clients
            await manager.broadcast(camera_id, message)

            # Save detection with cooldown timer (only violations)
            current_time = get_philippine_time_naive()

            # Check if cooldown period has passed
            can_save = (
                last_detection_save_time is None or
                (current_time - last_detection_save_time).total_seconds() >= cooldown_seconds
            )

            # Only save if:
            # 1. Cooldown has passed
            # 2. Person is detected
            # 3. Person is NOT compliant (violation)
            # 4. Detection is NOT partial (full body visible)
            if save_detections and can_save and results.get('person_detected', False) and not results['is_compliant'] and not is_partial:
                try:
                    detection_event = DetectionEvent(
                        camera_id=camera_id,
                        track_id=None,  # No longer using track_id
                        person_detected=results['person_detected'],
                        hardhat_detected=results['hardhat_detected'],
                        no_hardhat_detected=results['no_hardhat_detected'],
                        safety_vest_detected=results['safety_vest_detected'],
                        no_safety_vest_detected=results['no_safety_vest_detected'],
                        is_compliant=results['is_compliant'],
                        confidence_scores=json.dumps(results['confidence_scores']),
                        violation_type=results.get('violation_type')
                    )
                    db.add(detection_event)
                    db.commit()
                    db.refresh(detection_event)

                    logger.info(f"Saved violation detection for camera {camera_id}: {results.get('violation_type')}")

                    # Update last save time
                    last_detection_save_time = current_time

                    # Create immediate alert for violation
                    alert = Alert(
                        detection_event_id=detection_event.id,
                        track_id=None,  # No longer using track_id
                        severity=AlertSeverity.HIGH,
                        message=f"PPE Violation detected at {camera.location}: {results.get('violation_type', 'Safety violation')}"
                    )
                    db.add(alert)
                    db.commit()
                    logger.info(f"Created alert for violation at camera {camera_id}")

                    # Send immediate alert notification
                    alert_message = {
                        'type': 'alert',
                        'camera_id': camera_id,
                        'alert': {
                            'id': alert.id,
                            'severity': alert.severity.value,
                            'message': alert.message,
                            'timestamp': alert.created_at.isoformat()
                        }
                    }
                    await manager.broadcast(camera_id, alert_message)

                except SQLAlchemyError as e:
                    logger.error(f"Database error saving detection for camera {camera_id}: {e}", exc_info=True)
                    db.rollback()
                except Exception as e:
                    logger.error(f"Unexpected error saving detection for camera {camera_id}: {e}", exc_info=True)
                    db.rollback()

            # If partial detection, log it
            if is_partial and results.get('person_detected', False):
                logger.debug(f"Partial detection at camera {camera_id}: {partial_reason}")

            frame_count += 1

            # Small delay to control frame rate
            await asyncio.sleep(0.03)  # ~30 FPS

    finally:
        if cap is not None:
            cap.release()
        db.close()  # Close the database session
        # Clean up stream tracking to prevent memory leak
        if camera_id in manager.active_streams:
            del manager.active_streams[camera_id]
            logger.info(f"Cleaned up stream tracking for camera {camera_id}")


async def start_stream_handler(camera_id: str, websocket: WebSocket, db: Session):
    """Handle streaming for a specific camera"""
    # Get camera
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        await websocket.send_json({'type': 'error', 'message': 'Camera not found'})
        return

    # Check if stream is already active
    if camera_id not in manager.active_connections or len(manager.active_connections[camera_id]) == 1:
        # Start processing stream (creates its own DB session)
        asyncio.create_task(process_camera_stream(camera_id, camera))

    try:
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle client commands if needed
            if data == "ping":
                await websocket.send_json({'type': 'pong'})
    except WebSocketDisconnect:
        pass
