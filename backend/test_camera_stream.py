"""
Quick test to see if camera streaming works
"""
import cv2
from app.services.yolo_service import get_yolo_service
import time

print("=" * 60)
print("CAMERA STREAMING TEST")
print("=" * 60)

# Test 1: Load model
print("\n1. Loading YOLO model...")
try:
    yolo_service = get_yolo_service()
    print("   ✓ Model loaded successfully")
except Exception as e:
    print(f"   ✗ Model loading failed: {e}")
    exit(1)

# Test 2: Open webcam
print("\n2. Opening webcam (source 0)...")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("   ✗ Cannot open webcam")
    print("   Try changing camera source or use a video file")
    exit(1)
else:
    print("   ✓ Webcam opened successfully")

# Test 3: Read frames
print("\n3. Reading frames...")
frame_count = 0
detection_count = 0

try:
    for i in range(10):  # Test 10 frames
        ret, frame = cap.read()
        if not ret:
            print(f"   ✗ Failed to read frame {i+1}")
            break

        frame_count += 1

        # Test detection
        annotated_frame, results = yolo_service.detect(frame)

        if results['detected_classes']:
            detection_count += 1
            print(f"   Frame {i+1}: Detected {results['detected_classes']}")
        else:
            print(f"   Frame {i+1}: No detections")

        time.sleep(0.1)  # Small delay

except KeyboardInterrupt:
    print("\n   Stopped by user")
except Exception as e:
    print(f"\n   ✗ Error: {e}")
finally:
    cap.release()

# Summary
print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print(f"Frames read: {frame_count}/10")
print(f"Detections: {detection_count}/{frame_count}")
print("\nIf you see this, the camera and model are working!")
print("The issue might be in the WebSocket implementation.")
print("=" * 60)
