"""
DEPRECATED: WebSocket endpoint for real-time PPE monitoring

NOTE: This module is deprecated and not included in the main application.
Use websocket.py instead which provides the same functionality with better error handling.

This file is kept for reference only.
"""
import cv2
import base64
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
import numpy as np

from ...core.database import get_db
from ...core.logger import get_logger
from ...services.detector import get_detector
from ...models.camera import Camera
from ...models.detection import DetectionEvent
from datetime import datetime

logger = get_logger(__name__)

router = APIRouter()


def save_detection_to_db(camera_id: str, detections: List[Dict], db: Session) -> DetectionEvent:
    """Save detection event to database"""
    try:
        # Extract detection information
        detected_classes = [d['class_name'].lower() for d in detections]

        # Check what was detected
        person_detected = any('person' in cls for cls in detected_classes)
        hardhat_detected = any('hardhat' in cls and 'no-' not in cls for cls in detected_classes)
        no_hardhat_detected = any('no-hardhat' in cls or 'no hardhat' in cls for cls in detected_classes)
        safety_vest_detected = any(('vest' in cls or 'safety' in cls) and 'no-' not in cls for cls in detected_classes)
        no_safety_vest_detected = any('no-vest' in cls or 'no vest' in cls or 'no-safety' in cls for cls in detected_classes)

        # Determine compliance
        is_compliant = person_detected and not (no_hardhat_detected or no_safety_vest_detected)

        # Determine violation type
        violation_type = None
        if person_detected and not is_compliant:
            if no_hardhat_detected and no_safety_vest_detected:
                violation_type = "Both Missing"
            elif no_hardhat_detected:
                violation_type = "Missing Hardhat"
            elif no_safety_vest_detected:
                violation_type = "Missing Safety Vest"

        # Build confidence scores
        confidence_scores = {d['class_name']: d['confidence'] for d in detections}

        # Create detection event
        detection_event = DetectionEvent(
            camera_id=camera_id,
            person_detected=person_detected,
            hardhat_detected=hardhat_detected,
            no_hardhat_detected=no_hardhat_detected,
            safety_vest_detected=safety_vest_detected,
            no_safety_vest_detected=no_safety_vest_detected,
            is_compliant=is_compliant,
            confidence_scores=json.dumps(confidence_scores),
            violation_type=violation_type
        )

        db.add(detection_event)
        db.commit()
        db.refresh(detection_event)

        return detection_event
    except Exception as e:
        logger.error(f"Error saving detection to database for camera {camera_id}: {e}", exc_info=True)
        db.rollback()
        return None


class VideoProcessor:
    """Handles video processing and YOLO detection"""

    def __init__(self, camera: Camera, detector):
        self.camera = camera
        self.detector = detector
        self.cap = None
        self.is_running = False

    async def start(self):
        """Initialize video capture"""
        try:
            # Try to convert stream_url to int for webcam, otherwise use as path
            try:
                source = int(self.camera.stream_url)
            except ValueError:
                source = self.camera.stream_url

            self.cap = cv2.VideoCapture(source)

            if not self.cap.isOpened():
                raise Exception(f"Failed to open video source: {source}")

            self.is_running = True
            return True
        except Exception as e:
            logger.error(f"Error starting video capture for camera {self.camera.id}: {e}", exc_info=True)
            return False

    async def process_frame(self) -> Dict:
        """Process a single frame and return detection results"""
        if not self.cap or not self.cap.isOpened():
            return None

        ret, frame = self.cap.read()
        if not ret:
            return None

        # Run YOLO detection
        results = self.detector.predict(frame)

        # Draw bounding boxes on frame
        annotated_frame = results[0].plot()

        # Convert frame to base64 for transmission
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        frame_base64 = base64.b64encode(buffer).decode('utf-8')

        # Extract detection information
        detections = []
        boxes = results[0].boxes

        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            class_name = results[0].names[class_id]

            detections.append({
                'class_name': class_name,
                'confidence': confidence,
                'bbox': box.xyxy[0].tolist()
            })

        return {
            'frame': frame_base64,
            'detections': detections,
            'timestamp': datetime.now().isoformat()
        }

    async def stop(self):
        """Clean up resources"""
        self.is_running = False
        if self.cap:
            self.cap.release()


@router.websocket("/ws/monitor/{camera_id}")
async def monitor_camera(
    websocket: WebSocket,
    camera_id: str,
    db: Session = Depends(get_db)
):
    """
    WebSocket endpoint for real-time PPE monitoring

    Streams video frames with YOLO detections to connected clients
    """
    await websocket.accept()

    processor = None

    try:
        # Get camera from database
        camera = db.query(Camera).filter(Camera.id == camera_id).first()

        if not camera:
            await websocket.send_json({
                'error': 'Camera not found',
                'camera_id': camera_id
            })
            await websocket.close()
            return

        if camera.status != 'active':
            await websocket.send_json({
                'error': 'Camera is not active',
                'status': camera.status
            })
            await websocket.close()
            return

        # Initialize detector and video processor
        detector = get_detector()
        processor = VideoProcessor(camera, detector)

        # Start video capture
        started = await processor.start()
        if not started:
            await websocket.send_json({
                'error': 'Failed to start video capture',
                'camera_id': camera_id
            })
            await websocket.close()
            return

        # Send initial success message
        await websocket.send_json({
            'status': 'connected',
            'camera': {
                'id': camera.id,
                'name': camera.name,
                'location': camera.location
            }
        })

        # Main streaming loop
        frame_count = 0
        while processor.is_running:
            try:
                # Process frame
                result = await processor.process_frame()

                if result is None:
                    # End of video or error
                    await websocket.send_json({
                        'status': 'stream_ended',
                        'message': 'Video stream ended'
                    })
                    break

                # Save detection to database every 30 frames (~1 second at 30fps)
                # This prevents saving too many records
                if result['detections'] and len(result['detections']) > 0 and frame_count % 30 == 0:
                    save_detection_to_db(camera_id, result['detections'], db)

                # Send frame and detections to client
                await websocket.send_json(result)

                # Increment frame counter
                frame_count += 1

                # Small delay to control frame rate (30 FPS = ~33ms per frame)
                await asyncio.sleep(0.033)

            except WebSocketDisconnect:
                logger.info(f"Client disconnected from camera {camera_id}")
                break
            except Exception as e:
                logger.error(f"Error processing frame for camera {camera_id}: {e}", exc_info=True)
                await websocket.send_json({
                    'error': f'Processing error: {str(e)}'
                })
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for camera {camera_id}")
    except Exception as e:
        logger.error(f"WebSocket error for camera {camera_id}: {e}", exc_info=True)
        try:
            await websocket.send_json({
                'error': f'Server error: {str(e)}'
            })
        except:
            pass
    finally:
        # Clean up
        if processor:
            await processor.stop()
        try:
            await websocket.close()
        except:
            pass
