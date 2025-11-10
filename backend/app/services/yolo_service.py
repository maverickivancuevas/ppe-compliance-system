import cv2
import cvzone
import math
import torch
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
        'No-Safety Vest': (0, 0, 255),  # Red (with space)
        'No-Safety-Vest': (0, 0, 255),  # Red (with hyphen)
        'Hardhat': (0, 255, 0),         # Green
        'Safety Vest': (0, 255, 0),     # Green (with space)
        'Safety-Vest': (0, 255, 0),     # Green (with hyphen)
        'Person': (255, 0, 0),          # Blue
        'default': (0, 0, 255)          # Red (fallback for any violations)
    }

    def __init__(self, model_path: str = None, use_gpu: bool = True):
        """Initialize YOLO model"""
        if model_path is None:
            model_path = settings.get_absolute_model_path()

        # Device selection with manual override option
        gpu_available = torch.cuda.is_available()
        self.device = 'cuda' if (gpu_available and use_gpu) else 'cpu'

        if self.device == 'cuda':
            logger.info(f"✓ Using GPU acceleration")
            logger.info(f"  GPU: {torch.cuda.get_device_name(0)}")
            logger.info(f"  CUDA Version: {torch.version.cuda}")
        else:
            if gpu_available and not use_gpu:
                logger.info(f"✓ Using CPU (GPU available but disabled by settings)")
            else:
                logger.info(f"✓ Using CPU (no GPU detected)")
            logger.info(f"  Performance will be slower but functional")

        logger.info(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)
        # Move model to appropriate device (GPU or CPU)
        self.model.to(self.device)
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD

        # Use model's actual class names (overrides hardcoded CLASS_NAMES)
        self.CLASS_NAMES = self.model.names
        logger.info(f"✓ Loaded class names from model: {list(self.CLASS_NAMES.values())}")

        # Performance settings
        self.input_size = 640  # YOLO input size (can be adjusted: 320, 416, 512, 640)
        self.jpeg_quality = 85  # Default JPEG quality for compression

        logger.info(f"✓ Model loaded on {self.device.upper()}. Confidence threshold: {self.confidence_threshold}")
        logger.info(f"  Input size: {self.input_size}x{self.input_size}, JPEG quality: {self.jpeg_quality}")

    def preprocess_frame(self, frame: np.ndarray, target_width: int = None) -> Tuple[np.ndarray, float]:
        """
        Preprocess frame for better performance

        Args:
            frame: Input frame
            target_width: Target width for resizing (maintains aspect ratio)

        Returns:
            Tuple of (preprocessed_frame, scale_factor)
        """
        if target_width is None:
            target_width = self.input_size

        original_height, original_width = frame.shape[:2]

        # Calculate new dimensions maintaining aspect ratio
        if original_width > target_width:
            scale_factor = target_width / original_width
            new_width = target_width
            new_height = int(original_height * scale_factor)

            # Resize frame for faster processing
            resized_frame = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_LINEAR)
            return resized_frame, scale_factor

        return frame, 1.0

    def compress_frame(self, frame: np.ndarray, quality: int = None) -> np.ndarray:
        """
        Compress frame using JPEG encoding

        Args:
            frame: Input frame
            quality: JPEG quality (1-100)

        Returns:
            Compressed frame as numpy array
        """
        if quality is None:
            quality = self.jpeg_quality

        # Encode and decode to simulate compression
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
        _, encoded = cv2.imencode('.jpg', frame, encode_param)
        compressed_frame = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

        return compressed_frame

    def detect(self, frame: np.ndarray, preprocess: bool = True) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Perform PPE detection on a frame

        Args:
            frame: Input image frame (numpy array)
            preprocess: Whether to apply frame preprocessing for performance

        Returns:
            Tuple of (annotated_frame, detection_results)
        """
        # Apply preprocessing if enabled
        processing_frame = frame.copy()
        scale_factor = 1.0

        if preprocess:
            processing_frame, scale_factor = self.preprocess_frame(processing_frame)

        # Run inference on the specified device (GPU or CPU)
        # Using half=True for FP16 on GPU for better performance
        use_half = self.device == 'cuda'
        results = self.model(processing_frame, stream=True, device=self.device, half=use_half, verbose=False)
        detected_classes = set()
        detections = []
        confidence_scores = {}

        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                # Scale coordinates back to original frame size if preprocessing was applied
                if preprocess and scale_factor != 1.0:
                    x1 = int(x1 / scale_factor)
                    y1 = int(y1 / scale_factor)
                    x2 = int(x2 / scale_factor)
                    y2 = int(y2 / scale_factor)

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

                    # Draw bounding box and label on original frame
                    # Determine color based on class name
                    color = self.COLORS.get(class_name, self.COLORS['default'])
                    logger.debug(f"Class: {class_name}, Color: {color}")

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

    def detect_with_tracking(self, frame: np.ndarray, persist: bool = True, preprocess: bool = True) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Perform PPE detection on a frame.

        Note: This method no longer uses tracking. The name is kept for backward compatibility.
        It now performs simple frame-by-frame detection without object tracking.

        Args:
            frame: Input image frame (numpy array)
            persist: Unused, kept for backward compatibility
            preprocess: Whether to apply frame preprocessing for performance

        Returns:
            Tuple of (annotated_frame, detection_results)
        """
        # Apply preprocessing if enabled
        processing_frame = frame.copy()
        scale_factor = 1.0

        if preprocess:
            processing_frame, scale_factor = self.preprocess_frame(processing_frame)

        # Run regular detection (no tracking)
        use_half = self.device == 'cuda'
        results = self.model(
            processing_frame,
            device=self.device,
            half=use_half,
            verbose=False
        )

        detected_classes = set()
        detections = []
        confidence_scores = {}

        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0]
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                # Scale coordinates back to original frame size if preprocessing was applied
                if preprocess and scale_factor != 1.0:
                    x1 = int(x1 / scale_factor)
                    y1 = int(y1 / scale_factor)
                    x2 = int(x2 / scale_factor)
                    y2 = int(y2 / scale_factor)

                # Get confidence score
                conf = math.ceil((box.conf[0] * 100)) / 100

                # Get class
                cls = int(box.cls[0])
                if cls < len(self.CLASS_NAMES):
                    class_name = self.CLASS_NAMES[cls]
                    detected_classes.add(class_name)

                    # Store detection info (no track_id)
                    detection_info = {
                        'class': class_name,
                        'confidence': float(conf),
                        'bbox': [x1, y1, x2, y2]
                    }
                    detections.append(detection_info)

                    # Update confidence scores (keep highest for each class)
                    if class_name not in confidence_scores or conf > confidence_scores[class_name]:
                        confidence_scores[class_name] = float(conf)

                    # Draw bounding box and label on original frame
                    # Determine color based on class name
                    color = self.COLORS.get(class_name, self.COLORS['default'])
                    logger.debug(f"Class: {class_name}, Color: {color}")
                    label = f'{class_name} {conf}'

                    cvzone.putTextRect(
                        frame,
                        label,
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

        # Support both naming conventions: "Safety Vest" and "Safety-Vest"
        safety_vest_detected = 'Safety Vest' in detected_classes or 'Safety-Vest' in detected_classes
        no_safety_vest_detected = 'No-Safety Vest' in detected_classes or 'No-Safety-Vest' in detected_classes

        # Determine compliance status
        is_compliant = False
        violation_type = None

        if person_detected:
            # Only flag violations based on explicit "No-" detections
            missing_items = []
            if no_hardhat_detected:
                missing_items.append("Hardhat")
            if no_safety_vest_detected:
                missing_items.append("Safety Vest")

            if len(missing_items) > 0:
                violation_type = f"Missing {' and '.join(missing_items)}"
                is_compliant = False
            else:
                # Check if they have PPE (not just absence of violations)
                has_hardhat = hardhat_detected
                has_vest = safety_vest_detected
                is_compliant = has_hardhat and has_vest

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

    def set_input_size(self, size: int):
        """Update input size for preprocessing"""
        if size in [320, 416, 512, 640, 1280]:
            self.input_size = size
            logger.info(f"Updated input size to {size}x{size}")
        else:
            logger.warning(f"Invalid input size {size}. Using current: {self.input_size}")

    def set_jpeg_quality(self, quality: int):
        """Update JPEG quality for compression"""
        if 1 <= quality <= 100:
            self.jpeg_quality = quality
            logger.info(f"Updated JPEG quality to {quality}")
        else:
            logger.warning(f"Invalid JPEG quality {quality}. Using current: {self.jpeg_quality}")

    def set_device(self, use_gpu: bool):
        """Switch between CPU and GPU"""
        new_device = 'cuda' if (torch.cuda.is_available() and use_gpu) else 'cpu'
        if new_device != self.device:
            self.device = new_device
            self.model.to(self.device)
            logger.info(f"Switched to {self.device.upper()}")
        else:
            logger.info(f"Already using {self.device.upper()}")

    def get_performance_settings(self) -> Dict[str, Any]:
        """Get current performance settings"""
        return {
            'device': self.device,
            'input_size': self.input_size,
            'jpeg_quality': self.jpeg_quality,
            'gpu_available': torch.cuda.is_available(),
            'confidence_threshold': self.confidence_threshold
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
