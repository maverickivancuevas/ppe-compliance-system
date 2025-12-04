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

    # Color constants (BGR format)
    COLOR_VIOLATION = (0, 0, 255)   # Red - for violations/non-compliance
    COLOR_COMPLIANT = (0, 255, 0)   # Green - for compliant PPE
    COLOR_PERSON = (255, 0, 0)      # Blue - for person detections

    # Color mapping for bounding boxes (using normalized class names)
    COLORS = {
        'No-Hardhat': COLOR_VIOLATION,
        'No-Safety-Vest': COLOR_VIOLATION,
        'Hardhat': COLOR_COMPLIANT,
        'Safety-Vest': COLOR_COMPLIANT,
        'Person': COLOR_PERSON,
        'default': COLOR_VIOLATION  # Fallback for any violations
    }

    def __init__(self, model_path: str = None, use_gpu: bool = True):
        """Initialize YOLO model"""
        if model_path is None:
            model_path = settings.get_absolute_model_path()

        # Person tracking system - maintains worker IDs across frames PER CAMERA
        # Structure: {camera_id: {'tracked_workers': {}, 'next_worker_id': 1, 'frame_count': 0}}
        self.camera_trackers = {}
        self.max_frames_missing = 30  # Remove worker ID after 30 frames (1 second at 30fps)

        # IoU tracking thresholds (configurable)
        self.iou_matching_threshold = 0.3  # Minimum IoU to match worker across frames
        self.ppe_overlap_threshold = 0.5  # Minimum overlap to assign PPE to worker

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

        # NMS (Non-Maximum Suppression) settings
        self.iou_threshold = 0.45  # IOU threshold for NMS (default 0.45)
        self.max_det = 300  # Maximum number of detections per image

        # Use model's actual class names (overrides hardcoded CLASS_NAMES)
        # Normalize class names by replacing spaces with hyphens for consistency
        raw_class_names = self.model.names
        self.CLASS_NAMES = {k: v.replace(' ', '-') for k, v in raw_class_names.items()}
        logger.info(f"✓ Loaded class names from model: {list(self.CLASS_NAMES.values())}")
        if raw_class_names != self.CLASS_NAMES:
            logger.info(f"  Normalized class names (spaces → hyphens)")

        # Performance settings
        self.input_size = 640  # YOLO input size (can be adjusted: 320, 416, 512, 640)
        self.jpeg_quality = 85  # Default JPEG quality for compression

        logger.info(f"✓ Model loaded on {self.device.upper()}. Confidence threshold: {self.confidence_threshold}")
        logger.info(f"  NMS IOU threshold: {self.iou_threshold}, Max detections: {self.max_det}")
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

    def _run_inference(self, frame: np.ndarray, preprocess: bool = True) -> Tuple[List[Dict], Dict[str, float], float]:
        """
        Run YOLO inference on a frame and extract detections.

        Args:
            frame: Input image frame
            preprocess: Whether to apply preprocessing

        Returns:
            Tuple of (detections_list, confidence_scores_dict, scale_factor)
        """
        # Apply preprocessing if enabled
        processing_frame = frame.copy()
        scale_factor = 1.0

        if preprocess:
            processing_frame, scale_factor = self.preprocess_frame(processing_frame)

        # Run inference on the specified device (GPU or CPU)
        use_half = self.device == 'cuda'
        results = self.model(
            processing_frame,
            stream=True,
            device=self.device,
            half=use_half,
            verbose=False,
            conf=self.confidence_threshold,
            iou=self.iou_threshold,
            max_det=self.max_det
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

                    # Store detection info
                    detections.append({
                        'class': class_name,
                        'confidence': float(conf),
                        'bbox': [x1, y1, x2, y2]
                    })

                    # Update confidence scores (keep highest for each class)
                    if class_name not in confidence_scores or conf > confidence_scores[class_name]:
                        confidence_scores[class_name] = float(conf)

        return detections, confidence_scores, scale_factor

    def detect(self, frame: np.ndarray, preprocess: bool = True, camera_id: str = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Perform PPE detection on a frame

        Args:
            frame: Input image frame (numpy array)
            preprocess: Whether to apply frame preprocessing for performance
            camera_id: Camera identifier for per-camera worker tracking

        Returns:
            Tuple of (annotated_frame, detection_results)
        """
        # Run YOLO inference (extracted to reduce duplication)
        detections, confidence_scores, _ = self._run_inference(frame, preprocess)

        # Draw bounding boxes on frame
        for detection in detections:
            x1, y1, x2, y2 = detection['bbox']
            class_name = detection['class']
            conf = detection['confidence']

            # Determine color based on class name
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

        # Analyze detection results per worker
        analysis = self._analyze_detections_per_worker(detections, camera_id)

        # Get unique detected classes
        detected_classes = list(set(d['class'] for d in detections))

        return frame, {
            'detected_classes': detected_classes,
            'detections': detections,
            'confidence_scores': confidence_scores,
            **analysis
        }

    def detect_with_tracking(self, frame: np.ndarray, preprocess: bool = True, camera_id: str = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Perform PPE detection on a frame with IoU-based worker tracking.

        This method performs object detection and assigns stable worker IDs across frames
        using Intersection over Union (IoU) matching. Worker IDs are tracked separately
        per camera to avoid ID collision across multiple camera streams.

        Args:
            frame: Input image frame (numpy array)
            preprocess: Whether to apply frame preprocessing for performance
            camera_id: Camera identifier for per-camera worker tracking (required for tracking)

        Returns:
            Tuple of (annotated_frame, detection_results)
            - annotated_frame: Frame with bounding boxes and worker IDs drawn
            - detection_results: Dictionary with detected classes, workers, compliance status
        """
        # Run YOLO inference (extracted to reduce duplication)
        detections, confidence_scores, _ = self._run_inference(frame, preprocess)

        # Analyze detection results per worker (assigns worker_id per camera)
        analysis = self._analyze_detections_per_worker(detections, camera_id)

        # Draw bounding boxes with worker IDs
        for detection in detections:
            x1, y1, x2, y2 = detection['bbox']
            class_name = detection['class']
            conf = detection['confidence']

            # Determine color based on class name
            color = self.COLORS.get(class_name, self.COLORS['default'])
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

        # Draw worker IDs on Person bounding boxes
        workers = analysis.get('workers', [])
        for worker in workers:
            if 'worker_id' in worker and 'bbox' in worker:
                x1, y1, x2, y2 = worker['bbox']
                worker_id = worker['worker_id']

                # Draw worker ID label at top-left of person bbox
                worker_label = f'Worker #{worker_id}'
                cvzone.putTextRect(
                    frame,
                    worker_label,
                    (max(0, x1), max(15, y1 - 25)),
                    scale=1.2,
                    thickness=2,
                    colorB=(255, 255, 0),  # Yellow background
                    colorT=(0, 0, 0),      # Black text
                    colorR=(255, 255, 0),
                    offset=8
                )
            else:
                logger.warning(f"Worker missing worker_id or bbox: {worker}")

        # Get unique detected classes
        detected_classes = list(set(d['class'] for d in detections))

        return frame, {
            'detected_classes': detected_classes,
            'detections': detections,
            'confidence_scores': confidence_scores,
            **analysis
        }

    def _get_camera_tracker(self, camera_id: str) -> dict:
        """
        Get or create tracker for a specific camera

        Args:
            camera_id: Camera identifier

        Returns:
            Dictionary with tracking state for this camera
        """
        if camera_id not in self.camera_trackers:
            self.camera_trackers[camera_id] = {
                'tracked_workers': {},
                'next_worker_id': 1,
                'frame_count': 0
            }
        return self.camera_trackers[camera_id]

    def cleanup_camera_tracker(self, camera_id: str) -> bool:
        """
        Remove tracker for a specific camera (called when camera disconnects).

        Args:
            camera_id: Camera identifier to clean up

        Returns:
            True if tracker was removed, False if it didn't exist
        """
        if camera_id in self.camera_trackers:
            worker_count = len(self.camera_trackers[camera_id].get('tracked_workers', {}))
            del self.camera_trackers[camera_id]
            logger.info(f"Cleaned up tracker for camera {camera_id} ({worker_count} workers removed)")
            return True
        return False

    def _calculate_iou(self, bbox1: List[int], bbox2: List[int]) -> float:
        """
        Calculate Intersection over Union (IoU) between two bounding boxes

        Args:
            bbox1: [x1, y1, x2, y2]
            bbox2: [x1, y1, x2, y2]

        Returns:
            IoU score (0.0 to 1.0)
        """
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2

        # Calculate intersection
        x_left = max(x1_1, x1_2)
        y_top = max(y1_1, y1_2)
        x_right = min(x2_1, x2_2)
        y_bottom = min(y2_1, y2_2)

        if x_right < x_left or y_bottom < y_top:
            return 0.0

        intersection_area = (x_right - x_left) * (y_bottom - y_top)

        # Calculate union
        bbox1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
        bbox2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
        union_area = bbox1_area + bbox2_area - intersection_area

        return intersection_area / union_area if union_area > 0 else 0.0

    def _track_workers(self, current_persons: List[Dict], camera_id: str) -> List[Dict]:
        """
        Assign stable IDs to workers across frames using IoU tracking (per camera)

        Args:
            current_persons: List of detected persons in current frame
            camera_id: Camera identifier to track workers separately per camera

        Returns:
            List of persons with assigned worker_id
        """
        # Get tracker for this specific camera
        tracker = self._get_camera_tracker(camera_id)
        tracker['frame_count'] += 1

        tracked_workers = tracker['tracked_workers']
        frame_count = tracker['frame_count']

        # Track which workers were matched
        matched_worker_ids = set()
        assigned_persons = []

        # Match current detections to tracked workers using IoU
        for person in current_persons:
            best_match_id = None
            best_iou = self.iou_matching_threshold  # Minimum IoU threshold for matching

            # Find best matching tracked worker
            for worker_id, worker_data in tracked_workers.items():
                iou = self._calculate_iou(person['bbox'], worker_data['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_match_id = worker_id

            # Assign ID (existing or new)
            if best_match_id is not None:
                worker_id = best_match_id
                matched_worker_ids.add(worker_id)
            else:
                worker_id = tracker['next_worker_id']
                tracker['next_worker_id'] += 1

            # Update tracking data
            tracked_workers[worker_id] = {
                'bbox': person['bbox'],
                'last_seen_frame': frame_count
            }

            person['worker_id'] = worker_id
            assigned_persons.append(person)

        # Remove workers not seen for too long
        workers_to_remove = []
        for worker_id, worker_data in tracked_workers.items():
            if frame_count - worker_data['last_seen_frame'] > self.max_frames_missing:
                workers_to_remove.append(worker_id)

        for worker_id in workers_to_remove:
            del tracked_workers[worker_id]

        return assigned_persons

    def _parse_detections(self, detections: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """
        Separate detections into persons and PPE items.

        Args:
            detections: List of all detections

        Returns:
            Tuple of (persons_list, ppe_items_list)
        """
        persons = []
        ppe_items = []

        for detection in detections:
            class_name = detection['class']
            bbox = detection['bbox']
            confidence = detection['confidence']

            if class_name == 'Person':
                persons.append({
                    'bbox': bbox,
                    'hardhat': False,
                    'no_hardhat': False,
                    'vest': False,
                    'no_vest': False,
                    'confidence': confidence,
                    'is_compliant': None,
                    'status': 'Unknown',
                    'violation_type': None
                })
            else:
                ppe_items.append({
                    'class': class_name,
                    'bbox': bbox,
                    'confidence': confidence
                })

        return persons, ppe_items

    def _assign_ppe_to_workers(self, persons: List[Dict], ppe_items: List[Dict]) -> None:
        """
        Assign PPE items to workers based on bounding box overlap.

        Args:
            persons: List of person detections (modified in-place)
            ppe_items: List of PPE item detections
        """
        for item in ppe_items:
            ix1, iy1, ix2, iy2 = item['bbox']
            item_class = item['class']

            # Find which person this PPE belongs to
            best_person = None
            best_overlap = 0

            for person in persons:
                px1, py1, px2, py2 = person['bbox']

                # Calculate intersection over PPE area
                x_overlap = max(0, min(ix2, px2) - max(ix1, px1))
                y_overlap = max(0, min(iy2, py2) - max(iy1, py1))
                overlap_area = x_overlap * y_overlap
                ppe_area = (ix2 - ix1) * (iy2 - iy1)

                if ppe_area > 0:
                    overlap_ratio = overlap_area / ppe_area

                    # If PPE overlaps with person by threshold, assign it
                    if overlap_ratio > self.ppe_overlap_threshold and overlap_ratio > best_overlap:
                        best_overlap = overlap_ratio
                        best_person = person

            # Assign PPE to the best matching person (using normalized class names)
            if best_person is not None:
                if item_class == 'Hardhat':
                    best_person['hardhat'] = True
                elif item_class == 'No-Hardhat':
                    best_person['no_hardhat'] = True
                elif item_class == 'Safety-Vest':
                    best_person['vest'] = True
                elif item_class == 'No-Safety-Vest':
                    best_person['no_vest'] = True

    def _evaluate_worker_compliance(self, persons: List[Dict]) -> None:
        """
        Evaluate PPE compliance for each worker.

        Args:
            persons: List of person detections with PPE flags (modified in-place)
        """
        for person in persons:
            head_visible = person['hardhat'] or person['no_hardhat']
            body_visible = person['vest'] or person['no_vest']

            missing_items = []
            violation_count = 0

            # Check for violations
            if head_visible and person['no_hardhat']:
                missing_items.append("Hardhat")
                violation_count += 1
            if body_visible and person['no_vest']:
                missing_items.append("Safety Vest")
                violation_count += 1

            person['violation_count'] = violation_count

            if len(missing_items) > 0:
                person['violation_type'] = f"Missing {' and '.join(missing_items)}"
                person['is_compliant'] = False
                person['status'] = 'Not Safely Attired'
            else:
                # Check if they have PPE
                if head_visible and body_visible:
                    # Both parts visible - require both PPE
                    person['is_compliant'] = person['hardhat'] and person['vest']
                    person['status'] = 'Safely Attired' if person['is_compliant'] else 'Not Safely Attired'
                elif head_visible:
                    # Only head visible
                    person['is_compliant'] = person['hardhat']
                    person['status'] = 'Safely Attired' if person['is_compliant'] else 'Not Safely Attired'
                elif body_visible:
                    # Only body visible
                    person['is_compliant'] = person['vest']
                    person['status'] = 'Safely Attired' if person['is_compliant'] else 'Not Safely Attired'
                else:
                    # No PPE info available
                    person['is_compliant'] = None
                    person['status'] = 'Person Detected'

    def _calculate_aggregate_statistics(self, persons: List[Dict]) -> Dict[str, Any]:
        """
        Calculate aggregate compliance statistics.

        Args:
            persons: List of evaluated person detections

        Returns:
            Dictionary with aggregate statistics
        """
        total_workers = len(persons)
        compliant_workers = sum(1 for p in persons if p['is_compliant'] is True)
        violation_workers = sum(1 for p in persons if p['is_compliant'] is False)
        unknown_workers = sum(1 for p in persons if p['is_compliant'] is None)

        # Calculate TOTAL violation count
        total_violation_count = sum(p['violation_count'] for p in persons)

        # Overall compliance (backward compatibility)
        person_detected = total_workers > 0
        is_compliant = False if violation_workers > 0 else (None if unknown_workers == total_workers else True)

        # Aggregate status
        if not person_detected:
            safety_status = 'No Person Detected'
        elif total_violation_count > 0:
            safety_status = f'Not Safely Attired ({total_violation_count} violation{"s" if total_violation_count > 1 else ""})'
        elif unknown_workers == total_workers:
            safety_status = 'Person Detected'
        else:
            safety_status = 'Safely Attired'

        # Backward compatibility flags
        hardhat_detected = any(p['hardhat'] for p in persons)
        no_hardhat_detected = any(p['no_hardhat'] for p in persons)
        vest_detected = any(p['vest'] for p in persons)
        no_vest_detected = any(p['no_vest'] for p in persons)

        violation_type = None
        if violation_workers > 0:
            violation_types = [p['violation_type'] for p in persons if p['violation_type']]
            if violation_types:
                violation_type = ', '.join(set(violation_types))

        return {
            'workers': persons,
            'total_workers': total_workers,
            'compliant_workers': compliant_workers,
            'violation_workers': violation_workers,
            'unknown_workers': unknown_workers,
            'total_violation_count': total_violation_count,
            # Backward compatibility
            'person_detected': person_detected,
            'hardhat_detected': hardhat_detected,
            'no_hardhat_detected': no_hardhat_detected,
            'safety_vest_detected': vest_detected,
            'no_safety_vest_detected': no_vest_detected,
            'is_compliant': is_compliant,
            'violation_type': violation_type,
            'safety_status': safety_status
        }

    def _analyze_detections_per_worker(self, detections: List[Dict], camera_id: str = None) -> Dict[str, Any]:
        """
        Analyze PPE compliance for each individual worker in the frame.

        This orchestrates the complete analysis pipeline:
        1. Parse detections into persons and PPE items
        2. Assign worker IDs using tracking
        3. Assign PPE items to workers
        4. Evaluate compliance for each worker
        5. Calculate aggregate statistics

        Args:
            detections: List of all detections with class, confidence, and bbox
            camera_id: Camera identifier for per-camera worker tracking

        Returns:
            Dictionary with workers array and aggregate statistics
        """
        # Step 1: Separate persons from PPE items
        persons, ppe_items = self._parse_detections(detections)

        # Step 2: Assign stable worker IDs using tracking
        if camera_id:
            persons = self._track_workers(persons, camera_id)
        else:
            # Fallback: sequential IDs if no camera_id
            for idx, person in enumerate(persons):
                person['worker_id'] = idx + 1

        # Step 3: Assign PPE items to workers
        self._assign_ppe_to_workers(persons, ppe_items)

        # Step 4: Evaluate compliance for each worker
        self._evaluate_worker_compliance(persons)

        # Step 5: Calculate aggregate statistics
        return self._calculate_aggregate_statistics(persons)

    def set_input_size(self, size: int):
        """
        Update input size for preprocessing.

        Note: This only affects future detections. Does not re-process existing frames.
        Recommended sizes: 320, 416, 512, 640, 1280
        """
        if size in [320, 416, 512, 640, 1280]:
            self.input_size = size
            logger.info(f"Updated input size to {size}x{size}")
        else:
            logger.warning(f"Invalid input size {size}. Using current: {self.input_size}")

    def set_jpeg_quality(self, quality: int):
        """
        Update JPEG quality for compression.

        Note: This only affects future detections. Does not re-compress existing frames.
        Valid range: 1-100 (higher = better quality, larger size)
        """
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

    def set_confidence_threshold(self, threshold: float):
        """
        Update confidence threshold for detections.

        Note: This only affects future detections. Does not re-filter existing results.
        Valid range: 0.0-1.0 (higher = stricter filtering, fewer false positives)
        """
        if 0.0 <= threshold <= 1.0:
            self.confidence_threshold = threshold
            logger.info(f"Updated confidence threshold to {threshold}")
        else:
            logger.warning(f"Invalid confidence threshold {threshold}. Must be between 0.0 and 1.0")

    def set_iou_threshold(self, threshold: float):
        """
        Update IOU threshold for Non-Maximum Suppression (NMS).

        Note: This only affects future detections. Does not re-process existing frames.
        Valid range: 0.0-1.0 (higher = allow more overlapping boxes)
        """
        if 0.0 <= threshold <= 1.0:
            self.iou_threshold = threshold
            logger.info(f"Updated IOU threshold to {threshold}")
        else:
            logger.warning(f"Invalid IOU threshold {threshold}. Must be between 0.0 and 1.0")

    def get_performance_settings(self) -> Dict[str, Any]:
        """Get current performance settings"""
        return {
            'device': self.device,
            'input_size': self.input_size,
            'jpeg_quality': self.jpeg_quality,
            'gpu_available': torch.cuda.is_available(),
            'confidence_threshold': self.confidence_threshold,
            'iou_threshold': self.iou_threshold,
            'max_det': self.max_det
        }

    def process_video_stream(self, source: str, width: int = 1280, height: int = 720):
        """
        Generator function to process video stream frame by frame

        Args:
            source: Video source (file path, URL, or device index)
            width: Video capture width in pixels (default: 1280)
            height: Video capture height in pixels (default: 720)

        Yields:
            Tuple of (frame, detection_results)
        """
        cap = cv2.VideoCapture(source if source != "0" else 0)
        cap.set(3, width)   # Width (cv2.CAP_PROP_FRAME_WIDTH)
        cap.set(4, height)  # Height (cv2.CAP_PROP_FRAME_HEIGHT)

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

