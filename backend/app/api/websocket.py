from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import cv2
import base64
import json
import asyncio
from typing import Optional
from ..core.database import get_db
from ..core.logger import get_logger
from ..core.exceptions import CameraConnectionError, DetectionSaveError
from ..models.camera import Camera
from ..models.detection import DetectionEvent
from ..models.alert import Alert, AlertSeverity
from ..services.yolo_service import get_yolo_service
from datetime import datetime

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

        # Track last violation time to avoid spam
        last_violation_time = None
        violation_cooldown = 5  # seconds

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
        detection_interval = 30  # Save detection every 30 frames (1 sec at 30fps)

        while cap.isOpened() and manager.is_stream_active(camera_id):
            success, frame = cap.read()
            if not success:
                break

            # Perform detection
            annotated_frame, results = yolo_service.detect(frame)

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
                    'confidence_scores': results['confidence_scores']
                },
                'timestamp': datetime.utcnow().isoformat()
            }

            # Broadcast to all connected clients
            await manager.broadcast(camera_id, message)

            # Save detection event periodically
            if save_detections and frame_count % detection_interval == 0 and results['person_detected']:
                try:
                    detection_event = DetectionEvent(
                        camera_id=camera_id,
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

                    # Create alert for violations
                    if not results['is_compliant'] and results['person_detected']:
                        current_time = datetime.utcnow()
                        should_create_alert = True

                        # Check cooldown
                        if last_violation_time:
                            time_diff = (current_time - last_violation_time).total_seconds()
                            if time_diff < violation_cooldown:
                                should_create_alert = False

                        if should_create_alert:
                            alert = Alert(
                                detection_event_id=detection_event.id,
                                severity=AlertSeverity.HIGH,
                                message=f"PPE Violation detected at {camera.location}: {results.get('violation_type', 'Safety violation')}"
                            )
                            db.add(alert)
                            db.commit()
                            last_violation_time = current_time

                            # Send alert notification to clients
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
                    # Continue processing, don't break the stream
                except Exception as e:
                    logger.error(f"Unexpected error saving detection for camera {camera_id}: {e}", exc_info=True)
                    db.rollback()
                    # Continue processing, don't break the stream

            frame_count += 1

            # Small delay to control frame rate
            await asyncio.sleep(0.03)  # ~30 FPS

    finally:
        cap.release()
        db.close()  # Close the database session


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
