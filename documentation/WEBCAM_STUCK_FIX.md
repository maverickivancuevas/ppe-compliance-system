# WebSocket Stuck Issue - Diagnosis & Fix

## Problem
The live monitoring page shows "Connected - Analyzing feed..." but no video appears.

## Root Cause
The backend WebSocket is trying to open webcam source "0" but:
1. Webcam may not exist
2. Webcam may be in use by another application
3. Webcam permissions not granted
4. OpenCV cannot access the camera

## Quick Fix Options

### Option 1: Use Sample Video File (Recommended for Testing)

Instead of webcam (which may not work), use a sample video file:

**Step 1: Create or find a sample video**
- Any MP4/AVI video file will work
- Construction site footage is ideal
- Can be any video for testing

**Step 2: Update camera in database**
1. Go to: http://localhost:3000/admin/cameras
2. Click Edit on "dasd" camera
3. Change Stream URL from `0` to:
   ```
   C:\path\to\your\video.mp4
   ```
4. Save

**Step 3: Try monitoring again**

### Option 2: Test Webcam Directly

Test if OpenCV can access your webcam:

```bash
cd ppe-compliance-system/backend
./venv/Scripts/python.exe -c "import cv2; cap = cv2.VideoCapture(0); print('Can open:', cap.isOpened()); cap.release()"
```

**Expected Output**:
- `Can open: True` = Webcam works ✅
- `Can open: False` = Webcam issue ❌

### Option 3: Check Webcam Usage

**Windows**:
1. Open Task Manager
2. Check if any app is using the camera
3. Close apps like Zoom, Teams, Skype
4. Try again

### Option 4: Use Different Webcam Index

If you have multiple cameras, try:
- Stream URL: `1` (second camera)
- Stream URL: `2` (third camera)

## Technical Details

### What's Happening Behind the Scenes

When you click "Start Monitoring":

1. ✅ Frontend connects to WebSocket
2. ✅ Backend accepts connection
3. ❌ Backend tries `cv2.VideoCapture(0)`
4. ❌ Camera fails to open
5. ❌ No frames are sent
6. ⏸️ Frontend waits indefinitely

### The Problem Code

In `backend/app/api/websocket.py` around line 95:

```python
cap = cv2.VideoCapture(source)  # source = 0 for webcam

if not cap.isOpened():
    # Error message should be sent here
    # But connection stays open
```

## Immediate Solution

**Create a test video or use existing video file**:

1. **Find any video** on your computer
2. **Update camera stream URL** to point to that video
3. **Test** - should work immediately

## Alternative: Download Sample Video

```bash
# Download a free sample video
curl -o test_video.mp4 https://www.sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4

# Then use: stream_url = "D:\path\to\test_video.mp4"
```

## Debugging Steps

### Step 1: Check Backend Logs

```bash
cd ppe-compliance-system/backend
tail -f backend_with_model.log
```

Look for:
- "Unable to open camera" messages
- WebSocket connection messages
- Error messages

### Step 2: Test Camera Opening

```python
import cv2

# Test webcam
cap = cv2.VideoCapture(0)
print(f"Webcam opened: {cap.isOpened()}")

if cap.isOpened():
    ret, frame = cap.read()
    print(f"Can read frame: {ret}")
    print(f"Frame shape: {frame.shape if ret else 'N/A'}")
cap.release()
```

### Step 3: Check Permissions

**Windows**:
1. Settings → Privacy → Camera
2. Allow apps to access camera
3. Allow desktop apps to access camera

## Best Practice for Production

For production deployment:

1. **Don't use webcam 0** - unreliable
2. **Use IP cameras** with RTSP URLs:
   ```
   rtsp://username:password@192.168.1.100:554/stream
   ```
3. **Use USB cameras** with stable index
4. **Test camera connectivity** before adding to system

## Summary

**Immediate Action Needed**:
- Change Stream URL from `0` to an actual video file path
- OR fix webcam issue on your machine
- Then retry monitoring

**Long-term**:
- Add better error handling in WebSocket
- Show error messages to user when camera fails
- Add camera connectivity test before starting stream
