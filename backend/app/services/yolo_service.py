import cv2
import cvzone
import math
from ultralytics import YOLO
from typing import Dict, List, Tuple, Any
import numpy as np
from ..core.config import settings
from ..core.logger import get_logger

logger = get_logger(__name__)


class YOLODetectionService:
    """Service for PPE detection using YOLOv8 model"""

    # Class names matching your trained model
    CLASS_NAMES = ['Hardhat', 'No-Hardhat', 'No-Safety Vest', 'Safety Vest', 'Person']

    # Color mapping for bounding boxes (BGR format)
    COLORS = {
        'No-Hardhat': (0, 0, 255),      # Red
        'No-Safety Vest': (0, 0, 255),  # Red
        'Hardhat': (0, 255, 0),         # Green
        'Safety Vest': (0, 255, 0),     # Green
        'Person': (255, 0, 0),          # Blue
        'default': (0, 255, 255)        # Yellow
    }

    def __init__(self, model_path: str = None):
        """Initialize YOLO model"""
        if model_path is None:
            model_path = settings.get_absolute_model_path()

        logger.info(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD
        logger.info(f"Model loaded successfully. Confidence threshold: {self.confidence_threshold}")

    def detect(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Perform PPE detection on a frame

        Args:
            frame: Input image frame (numpy array)

        Returns:
            Tuple of (annotated_frame, detection_results)
        """
        results = self.model(frame, stream=True)
        detected_classes = set()
        detections = []
        confidence_scores = {}

        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                # Get confidence score
                conf = math.ceil((box.conf[0] * 100)) / 100

                # Get class
                cls = int(box.cls[0])
                if cls < len(self.CLASS_NAMES):
                    class_name = self.CLASS_NAMES[cls]
                    detected_classes.add(class_name)

                    # Store detection info
                    detections.append({
                        'class': class_name,
                        'confidence': float(conf),
                        'bbox': [x1, y1, x2, y2]
                    })

                    # Update confidence scores (keep highest for each class)
                    if class_name not in confidence_scores or conf > confidence_scores[class_name]:
                        confidence_scores[class_name] = float(conf)

                    # Draw bounding box and label
                    color = self.COLORS.get(class_name, self.COLORS['default'])

                    cvzone.putTextRect(
                        frame,
                        f'{class_name} {conf}',
                        (max(0, x1), max(35, y1)),
                        scale=1,
                        thickness=1,
                        colorB=color,
                        colorT=(255, 255, 255),
                        colorR=color,
                        offset=5
                    )
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)

        # Analyze detection results
        analysis = self._analyze_detections(detected_classes, confidence_scores)

        return frame, {
            'detected_classes': list(detected_classes),
            'detections': detections,
            'confidence_scores': confidence_scores,
            **analysis
        }

    def _analyze_detections(
        self,
        detected_classes: set,
        confidence_scores: Dict[str, float]
    ) -> Dict[str, Any]:
        """Analyze detection results for compliance"""

        person_detected = 'Person' in detected_classes
        hardhat_detected = 'Hardhat' in detected_classes
        no_hardhat_detected = 'No-Hardhat' in detected_classes
        safety_vest_detected = 'Safety Vest' in detected_classes
        no_safety_vest_detected = 'No-Safety Vest' in detected_classes

        # Determine compliance status
        is_compliant = False
        violation_type = None

        if person_detected:
            # Check if person has both hardhat and safety vest
            has_hardhat = hardhat_detected and not no_hardhat_detected
            has_vest = safety_vest_detected and not no_safety_vest_detected

            is_compliant = has_hardhat and has_vest

            # Determine violation type
            if not is_compliant:
                if not has_hardhat and not has_vest:
                    violation_type = "Missing Hardhat and Safety Vest"
                elif not has_hardhat:
                    violation_type = "Missing Hardhat"
                elif not has_vest:
                    violation_type = "Missing Safety Vest"

        return {
            'person_detected': person_detected,
            'hardhat_detected': hardhat_detected,
            'no_hardhat_detected': no_hardhat_detected,
            'safety_vest_detected': safety_vest_detected,
            'no_safety_vest_detected': no_safety_vest_detected,
            'is_compliant': is_compliant,
            'violation_type': violation_type,
            'safety_status': 'Safely Attired' if is_compliant else 'Not Safely Attired'
        }

    def process_video_stream(self, source: str):
        """
        Generator function to process video stream frame by frame

        Args:
            source: Video source (file path, URL, or device index)

        Yields:
            Tuple of (frame, detection_results)
        """
        cap = cv2.VideoCapture(source if source != "0" else 0)
        cap.set(3, 1280)  # Width
        cap.set(4, 720)   # Height

        try:
            while cap.isOpened():
                success, frame = cap.read()
                if not success:
                    break

                annotated_frame, results = self.detect(frame)
                yield annotated_frame, results

        finally:
            cap.release()


# Global instance (singleton)
_yolo_service = None


def get_yolo_service() -> YOLODetectionService:
    """Get or create YOLO service instance"""
    global _yolo_service
    if _yolo_service is None:
        _yolo_service = YOLODetectionService()
    return _yolo_service
