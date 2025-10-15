import cv2
import sys

print("Testing camera access...")

# Try to open camera
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("ERROR: Cannot open camera 0")
    print("Possible causes:")
    print("1. Camera is being used by another application")
    print("2. No camera permissions")
    print("3. No camera connected")
    sys.exit(1)

print("SUCCESS: Camera opened successfully")

# Try to read a frame
ret, frame = cap.read()

if not ret:
    print("ERROR: Cannot read from camera")
    cap.release()
    sys.exit(1)

print("SUCCESS: Successfully read frame from camera")
print(f"Frame shape: {frame.shape}")

cap.release()
print("\nSUCCESS: All camera tests passed!")
print("\nIf this works but WebSocket doesn't, the issue is in the WebSocket code.")
