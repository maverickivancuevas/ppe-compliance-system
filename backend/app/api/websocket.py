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
from ..models.camera import Camera
from ..models.detection import DetectionEvent
from ..models.alert import Alert, AlertSeverity
from ..services.yolo_service import get_yolo_service
from datetime import datetime
from ..core.timezone import get_philippine_time_naive
from ..core.detection_utils import calculate_violation_type

logger = get_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections"""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.active_streams: dict[str, bool] = {}  # Track active camera streams
        self._stream_locks: dict[str, asyncio.Lock] = {}  # Prevent race conditions
        self._stream_tasks: dict[str, asyncio.Task] = {}  # Track background tasks for monitoring

        # Global violation tracking - persists across stream sessions to prevent duplicates
        # Key format: f"{camera_id}_{worker_id}"
        self.worker_violation_start_time: dict[str, datetime] = {}  # When violation started
        self.last_worker_violation_save_time: dict[str, datetime] = {}  # Last violation save time
        self.last_worker_screenshot_time: dict[str, datetime] = {}  # Last screenshot time

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

    def get_stream_lock(self, camera_id: str) -> asyncio.Lock:
        """Get or create a lock for a camera stream (prevents race conditions)"""
        if camera_id not in self._stream_locks:
            self._stream_locks[camera_id] = asyncio.Lock()
        return self._stream_locks[camera_id]

    def is_stream_running(self, camera_id: str) -> bool:
        """Check if a stream is already running"""
        return self.active_streams.get(camera_id, False)

    def mark_stream_running(self, camera_id: str):
        """Mark a stream as running"""
        self.active_streams[camera_id] = True

    def mark_stream_stopped(self, camera_id: str):
        """Mark a stream as stopped"""
        self.active_streams[camera_id] = False
        # Clean up lock
        if camera_id in self._stream_locks:
            del self._stream_locks[camera_id]
        # Clean up task reference
        if camera_id in self._stream_tasks:
            del self._stream_tasks[camera_id]

    def register_stream_task(self, camera_id: str, task: asyncio.Task):
        """Register a background stream task for monitoring"""
        self._stream_tasks[camera_id] = task
        # Add callback to handle task completion/errors
        task.add_done_callback(lambda t: self._handle_task_completion(camera_id, t))

    def _handle_task_completion(self, camera_id: str, task: asyncio.Task):
        """Handle stream task completion or error"""
        try:
            # Check if task completed with exception
            if task.exception():
                logger.error(f"Stream task for camera {camera_id} failed with exception: {task.exception()}")
            elif task.cancelled():
                logger.info(f"Stream task for camera {camera_id} was cancelled")
            else:
                logger.info(f"Stream task for camera {camera_id} completed normally")
        except asyncio.CancelledError:
            logger.info(f"Stream task for camera {camera_id} was cancelled")
        except Exception as e:
            logger.error(f"Error handling task completion for camera {camera_id}: {e}")
        finally:
            # Ensure stream is marked as stopped even if task crashed
            self.mark_stream_stopped(camera_id)

    async def broadcast(self, camera_id: str, message: dict):
        """Broadcast message to all clients watching a camera"""
        if camera_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[camera_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.debug(f"Failed to send message to client on camera {camera_id}: {e}")
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


def cleanup_stale_workers(
    camera_id: str,
    manager: 'ConnectionManager',
    last_worker_seen_time: dict,
    current_worker_ids: set,
    current_time: datetime,
    stale_threshold: int
) -> None:
    """
    Remove tracking data for workers not seen recently (prevents memory leaks).

    Args:
        camera_id: Camera identifier
        manager: ConnectionManager with global tracking dictionaries
        last_worker_seen_time: Dict tracking when workers were last detected
        current_worker_ids: Set of worker IDs currently in frame
        current_time: Current timestamp
        stale_threshold: Seconds after which to remove stale workers
    """
    # Check each tracked worker in local last_seen dictionary
    workers_to_remove = []
    for worker_id in list(last_worker_seen_time.keys()):
        if worker_id not in current_worker_ids:
            # Worker is not in current frame - check if stale
            time_since_last_seen = (current_time - last_worker_seen_time[worker_id]).total_seconds()
            if time_since_last_seen > stale_threshold:
                workers_to_remove.append(worker_id)

    # Remove stale worker data from all tracking dictionaries (using composite keys)
    for worker_id in workers_to_remove:
        tracking_key = f"{camera_id}_{worker_id}"

        # Clean up global tracking dictionaries
        if tracking_key in manager.worker_violation_start_time:
            del manager.worker_violation_start_time[tracking_key]
        if tracking_key in manager.last_worker_violation_save_time:
            del manager.last_worker_violation_save_time[tracking_key]
        if tracking_key in manager.last_worker_screenshot_time:
            del manager.last_worker_screenshot_time[tracking_key]

        # Clean up local tracking
        if worker_id in last_worker_seen_time:
            del last_worker_seen_time[worker_id]

        logger.debug(f"Cleaned up tracking data for Worker #{worker_id} (camera {camera_id}, not seen for {stale_threshold}+ seconds)")


async def save_violation_with_snapshot(
    worker: dict,
    camera_id: str,
    camera: Camera,
    annotated_frame,
    results: dict,
    db: Session,
    current_time: datetime,
    violation_duration: float
) -> None:
    """
    Save a violation event with snapshot to database and create an alert.

    Args:
        worker: Worker dictionary with violation info
        camera_id: Camera identifier
        camera: Camera object
        annotated_frame: Frame with annotations for snapshot
        results: Detection results
        db: Database session
        current_time: Current timestamp
        violation_duration: How long violation has persisted
    """
    worker_id = worker.get('worker_id')
    worker_violation_type = worker.get('violation_type', 'Safety violation')

    # Capture snapshot for this worker's violation
    snapshot_url = None
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / "violations" / camera_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        timestamp_str = current_time.strftime("%Y%m%d_%H%M%S")
        filename = f"violation_worker{worker_id}_{timestamp_str}_{uuid.uuid4().hex[:8]}.jpg"
        filepath = upload_dir / filename
        cv2.imwrite(str(filepath), annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        snapshot_url = f"/uploads/violations/{camera_id}/{filename}"
        logger.info(f"Captured snapshot for Worker #{worker_id} at camera {camera_id}: {snapshot_url}")
    except Exception as e:
        logger.error(f"Failed to capture snapshot for Worker #{worker_id}: {e}")

    # Create detection event
    detection_event = DetectionEvent(
        camera_id=camera_id,
        worker_id=str(worker_id),
        track_id=None,
        person_detected=True,
        hardhat_detected=worker.get('hardhat', False),
        no_hardhat_detected=worker.get('no_hardhat', False),
        safety_vest_detected=worker.get('vest', False),
        no_safety_vest_detected=worker.get('no_vest', False),
        is_compliant=False,
        confidence_scores=json.dumps(results.get('confidence_scores', {})),
        violation_type=worker_violation_type,
        snapshot_url=snapshot_url
    )
    db.add(detection_event)
    db.commit()
    db.refresh(detection_event)

    logger.info(f"Saved violation for Worker #{worker_id} at camera {camera_id}: {worker_violation_type} (persisted {violation_duration:.1f}s)")

    # Create alert with dynamic severity based on violation type
    severity = AlertSeverity.HIGH  # Default
    if worker_violation_type:
        violation_lower = worker_violation_type.lower()
        if "hardhat" in violation_lower and "safety vest" in violation_lower:
            # Both items missing
            severity = AlertSeverity.HIGH
        elif "hardhat" in violation_lower:
            # Only hardhat missing
            severity = AlertSeverity.HIGH
        elif "safety vest" in violation_lower:
            # Only safety vest missing
            severity = AlertSeverity.MEDIUM

    alert = Alert(
        detection_event_id=detection_event.id,
        worker_id=str(worker_id),
        track_id=None,
        severity=severity,
        message=f"Worker #{worker_id}: {worker_violation_type} at {camera.location}"
    )
    db.add(alert)
    db.commit()
    logger.info(f"Created alert for Worker #{worker_id} at camera {camera_id}")

    # Send alert notification
    alert_message = {
        'type': 'alert',
        'camera_id': camera_id,
        'alert': {
            'id': alert.id,
            'worker_id': str(worker_id),
            'severity': alert.severity.value,
            'message': alert.message,
            'timestamp': alert.created_at.isoformat()
        }
    }
    await manager.broadcast(camera_id, alert_message)


async def save_compliance_snapshot(
    worker: dict,
    camera_id: str,
    results: dict,
    db: Session
) -> bool:
    """
    Save a compliance snapshot for a worker.

    Args:
        worker: Worker dictionary
        camera_id: Camera identifier
        results: Detection results
        db: Database session

    Returns:
        True if saved successfully, False otherwise
    """
    worker_id = worker.get('worker_id')

    try:
        detection_event = DetectionEvent(
            camera_id=camera_id,
            worker_id=str(worker_id),
            track_id=None,
            person_detected=True,
            hardhat_detected=worker.get('hardhat', False),
            no_hardhat_detected=worker.get('no_hardhat', False),
            safety_vest_detected=worker.get('vest', False),
            no_safety_vest_detected=worker.get('no_vest', False),
            is_compliant=True,
            confidence_scores=json.dumps(results.get('confidence_scores', {})),
            violation_type=None,
            snapshot_url=None
        )
        db.add(detection_event)
        db.commit()
        db.refresh(detection_event)

        logger.info(f"Saved compliance snapshot for Worker #{worker_id} at camera {camera_id}")
        return True
    except SQLAlchemyError as e:
        logger.error(f"Database error saving compliance for Worker #{worker_id} at camera {camera_id}: {e}", exc_info=True)
        db.rollback()
        return False
    except Exception as e:
        logger.error(f"Unexpected error saving compliance for Worker #{worker_id} at camera {camera_id}: {e}", exc_info=True)
        db.rollback()
        return False


async def process_camera_stream(
    camera_id: str,
    camera: Camera,
    save_detections: bool = True
):
    """
    Process camera stream and broadcast to connected clients.

    This function runs as a background asyncio task and creates its own database session
    to ensure thread-safety, since it may run concurrently with other database operations.
    """

    # Create new database session for this background task (thread-safe)
    from ..core.database import SessionLocal
    db = None
    cap = None

    try:
        db = SessionLocal()
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

        # Violation persistence tracking - use GLOBAL dictionaries from ConnectionManager
        # This prevents duplicate violations when streams restart
        violation_persistence_seconds = 5
        violation_cooldown_seconds = 5
        screenshot_interval_seconds = 10

        # Track when workers were last seen (for cleanup logic)
        last_worker_seen_time = {}  # {worker_id: datetime} - when worker was last detected

        # Periodic compliance snapshot - save compliant status more frequently
        # Global snapshot timer (not per-worker) - triggers every 10 seconds for accurate compliance rate
        # Initialize to current time to prevent immediate save on first frame
        last_global_compliance_snapshot_time = get_philippine_time_naive()
        compliance_snapshot_interval_seconds = 10  # 10 seconds - frequent enough for accurate compliance metrics

        # Convert stream_source to integer if it's a digit, otherwise treat as file path
        try:
            source = int(stream_source)
            is_video_file = False
        except (ValueError, TypeError):
            source = stream_source
            # Check if it's a video file (MP4, AVI, MOV, etc.)
            is_video_file = isinstance(source, str) and any(source.lower().endswith(ext) for ext in ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'])
            logger.info(f"Detected {'video file' if is_video_file else 'stream URL'}: {source}")

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

        # Get total frame count for video files (for loop support)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if is_video_file else 0
        fps = cap.get(cv2.CAP_PROP_FPS) if is_video_file else 30
        logger.info(f"Stream info - Total frames: {total_frames}, FPS: {fps}, Is video file: {is_video_file}")

        # Send success message: Stream started
        await manager.broadcast(camera_id, {
            'type': 'status',
            'message': 'Stream started successfully!'
        })

        frame_count = 0

        while cap.isOpened() and manager.is_stream_active(camera_id):
            success, frame = cap.read()
            if not success:
                # For video files, loop back to the beginning
                if is_video_file and total_frames > 0:
                    logger.info(f"Video {source} reached end, looping back to start")
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # Reset to first frame
                    success, frame = cap.read()
                    if not success:
                        logger.error(f"Failed to loop video {source}")
                        break
                else:
                    # For live streams or if loop fails, exit
                    break

            # Perform detection with per-camera worker tracking
            annotated_frame, results = yolo_service.detect_with_tracking(frame, camera_id=camera_id)

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

            # Get current time for all timing operations
            current_time = get_philippine_time_naive()
            workers = results.get('workers', [])

            # Get current worker IDs to detect workers who left
            current_worker_ids = {worker.get('worker_id') for worker in workers if worker.get('worker_id') is not None}

            # Update last seen time for all current workers
            for worker in workers:
                worker_id = worker.get('worker_id')
                if worker_id is not None:
                    last_worker_seen_time[worker_id] = current_time

            # Clean up tracking dictionaries for workers who left the frame (memory leak prevention)
            # Check every 5 seconds (30 FPS * 5 sec = 150 frames) for better memory management
            if frame_count % 150 == 0:  # Check every 5 seconds
                stale_threshold = 15  # seconds - workers not seen for 15+ seconds are removed
                cleanup_stale_workers(
                    camera_id,
                    manager,
                    last_worker_seen_time,
                    current_worker_ids,
                    current_time,
                    stale_threshold
                )

            # NEW DETECTION SAVING LOGIC:
            # 1. Save violations only after 5 seconds of persistence
            # 2. Save periodic compliance snapshots every 5 minutes
            if save_detections:
                for worker in workers:
                    worker_id = worker.get('worker_id')
                    is_compliant = worker.get('is_compliant')

                    # Skip workers with unknown status (None)
                    if is_compliant is None:
                        continue

                    # ========== HANDLE VIOLATIONS (with 5-second persistence) ==========
                    if is_compliant is False:
                        worker_violation_type = worker.get('violation_type', 'Safety violation')

                        # Use composite key (camera_id + worker_id) for global tracking
                        tracking_key = f"{camera_id}_{worker_id}"

                        # Track when violation started
                        if tracking_key not in manager.worker_violation_start_time:
                            # First time seeing this violation
                            manager.worker_violation_start_time[tracking_key] = current_time
                            logger.debug(f"Worker #{worker_id} (camera {camera_id}) violation started at {current_time}")
                            continue  # Don't save yet, need to persist for 5 seconds

                        # Check if violation has persisted for 5 seconds
                        violation_duration = (current_time - manager.worker_violation_start_time[tracking_key]).total_seconds()

                        if violation_duration < violation_persistence_seconds:
                            # Violation not yet persisted long enough
                            continue

                        # Check if cooldown period has passed since last violation save
                        last_violation_save = manager.last_worker_violation_save_time.get(tracking_key)
                        if last_violation_save is not None:
                            time_since_last_save = (current_time - last_violation_save).total_seconds()
                            logger.debug(f"Worker #{worker_id} cooldown check: {time_since_last_save:.1f}s since last save (key: {tracking_key})")
                            if time_since_last_save < violation_cooldown_seconds:
                                logger.debug(f"Worker #{worker_id} BLOCKED by cooldown ({time_since_last_save:.1f}s < {violation_cooldown_seconds}s)")
                                continue  # Still in cooldown
                        else:
                            logger.debug(f"Worker #{worker_id} first violation save for tracking_key: {tracking_key}")

                        # Save the violation (it has persisted for 5+ seconds)
                        try:
                            await save_violation_with_snapshot(
                                worker, camera_id, camera, annotated_frame,
                                results, db, current_time, violation_duration
                            )
                            # Update last violation save time (global)
                            manager.last_worker_violation_save_time[tracking_key] = current_time
                            logger.info(f"Saved violation for Worker #{worker_id} (duration: {violation_duration:.1f}s)")

                        except SQLAlchemyError as e:
                            logger.error(f"Database error saving violation for Worker #{worker_id} at camera {camera_id}: {e}", exc_info=True)
                            db.rollback()
                        except Exception as e:
                            logger.error(f"Unexpected error saving violation for Worker #{worker_id} at camera {camera_id}: {e}", exc_info=True)
                            db.rollback()

                    else:
                        # ========== HANDLE COMPLIANCE ==========
                        # Worker is compliant - clear violation start time if exists
                        tracking_key = f"{camera_id}_{worker_id}"
                        if tracking_key in manager.worker_violation_start_time:
                            del manager.worker_violation_start_time[tracking_key]
                            logger.debug(f"Worker #{worker_id} violation cleared (now compliant)")

            # ========== GLOBAL COMPLIANCE SNAPSHOT TIMER ==========
            # Check if it's time for a global compliance snapshot (every 5 minutes)
            # This runs AFTER processing all workers, so we can save ALL compliant workers at once
            should_save_global_compliance = (
                (current_time - last_global_compliance_snapshot_time).total_seconds() >= compliance_snapshot_interval_seconds
            )

            if should_save_global_compliance and save_detections:
                # Save compliance snapshot for ALL currently compliant workers
                compliant_workers_saved = 0
                for worker in workers:
                    worker_id = worker.get('worker_id')
                    is_compliant = worker.get('is_compliant')

                    # Only save if worker is compliant (True)
                    if is_compliant is True:
                        if await save_compliance_snapshot(worker, camera_id, results, db):
                            compliant_workers_saved += 1

                # Update global snapshot timer
                last_global_compliance_snapshot_time = current_time
                if compliant_workers_saved > 0:
                    logger.info(f"Global compliance snapshot: saved {compliant_workers_saved} compliant worker(s) at camera {camera_id}")

            # If partial detection, log it
            if is_partial and results.get('person_detected', False):
                logger.debug(f"Partial detection at camera {camera_id}: {partial_reason}")

            frame_count += 1

            # Adaptive delay to maintain target frame rate from settings
            # Calculate sleep time based on configured FPS
            target_fps = settings.VIDEO_STREAM_FPS
            await asyncio.sleep(1.0 / target_fps)

    except asyncio.CancelledError:
        logger.info(f"Stream cancelled for camera {camera_id}")
        # Re-raise to properly handle cancellation
        raise

    except Exception as e:
        logger.error(f"Unexpected error in stream {camera_id}: {e}", exc_info=True)
        # Try to notify clients of the error
        try:
            await manager.broadcast(camera_id, {
                'type': 'error',
                'message': f'Stream error: {str(e)}'
            })
        except Exception as broadcast_error:
            logger.debug(f"Failed to broadcast error message for camera {camera_id}: {broadcast_error}")

    finally:
        # Ensure cleanup happens no matter what
        if cap is not None:
            try:
                cap.release()
                logger.debug(f"Released video capture for camera {camera_id}")
            except Exception as e:
                logger.error(f"Error releasing video capture for camera {camera_id}: {e}")

        if db is not None:
            try:
                db.close()
                logger.debug(f"Closed database session for camera {camera_id}")
            except Exception as e:
                logger.error(f"Error closing database session for camera {camera_id}: {e}")

        # Clean up YOLO service camera tracker (prevent memory leak)
        try:
            yolo_service.cleanup_camera_tracker(camera_id)
        except Exception as e:
            logger.error(f"Error cleaning up camera tracker for {camera_id}: {e}")

        # Clean up global violation tracking for this camera (prevent false immediate saves on restart)
        try:
            # Remove all tracking entries for this camera
            keys_to_remove = [key for key in manager.worker_violation_start_time.keys() if key.startswith(f"{camera_id}_")]
            for key in keys_to_remove:
                if key in manager.worker_violation_start_time:
                    del manager.worker_violation_start_time[key]
                if key in manager.last_worker_violation_save_time:
                    del manager.last_worker_violation_save_time[key]
                if key in manager.last_worker_screenshot_time:
                    del manager.last_worker_screenshot_time[key]
            if keys_to_remove:
                logger.debug(f"Cleaned up {len(keys_to_remove)} violation tracking entries for camera {camera_id}")
        except Exception as e:
            logger.error(f"Error cleaning up violation tracking for {camera_id}: {e}")

        # Mark stream as stopped and clean up lock
        manager.mark_stream_stopped(camera_id)
        logger.info(f"Stream cleanup completed for camera {camera_id}")


async def start_stream_handler(camera_id: str, websocket: WebSocket, db: Session):
    """Handle streaming for a specific camera"""
    # Get camera from provided session (this session is from the WebSocket handler)
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        await websocket.send_json({'type': 'error', 'message': 'Camera not found'})
        return

    # Use lock to prevent race condition when multiple clients connect simultaneously
    async with manager.get_stream_lock(camera_id):
        if not manager.is_stream_running(camera_id):
            # Mark stream as running BEFORE creating task to prevent duplicate starts
            manager.mark_stream_running(camera_id)

            # Start processing stream (creates its own DB session)
            task = asyncio.create_task(process_camera_stream(camera_id, camera))

            # Register task for monitoring and error handling
            manager.register_stream_task(camera_id, task)

            logger.info(f"Started stream processing task for camera {camera_id}")

    try:
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle client commands if needed
            if data == "ping":
                await websocket.send_json({'type': 'pong'})
    except WebSocketDisconnect:
        pass
