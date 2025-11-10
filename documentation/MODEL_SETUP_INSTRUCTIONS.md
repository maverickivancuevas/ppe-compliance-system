# YOLO Model Setup Instructions

## 🎯 Quick Setup Guide

You mentioned you'll place the model file. Here's exactly what to do:

### Step 1: Place Your Model File

**Copy your `best.pt` file to this exact location:**
```
D:\Ppe Compliance\SMART SAFETY PROJECT\SMART SAFETY PROJECT\TRAINED MODEL RESULT\weights\best.pt
```

**Directory structure should look like:**
```
D:\Ppe Compliance\SMART SAFETY PROJECT\
├── SMART SAFETY PROJECT\
│   └── TRAINED MODEL RESULT\
│       └── weights\
│           ├── best.pt          ← YOUR MODEL FILE HERE
│           └── README.md
├── ppe-compliance-system\
│   ├── backend\
│   └── frontend\
└── PROJECT_DOCUMENTATION.md
```

### Step 2: Verify Configuration

The backend is already configured to look for the model at this path.

**Check configuration:**
```bash
cd ppe-compliance-system/backend
notepad .env
```

**Verify this line exists:**
```env
MODEL_PATH=../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
```

✅ This is already correct in your `.env` file!

### Step 3: Test Model Loading

After placing the file, test if it loads:

```bash
cd ppe-compliance-system/backend
./venv/Scripts/python.exe -c "from app.services.yolo_service import get_yolo_service; service = get_yolo_service(); print('✓ Model loaded successfully!')"
```

**Expected output:**
```
Loading YOLO model from: D:\Ppe Compliance\SMART SAFETY PROJECT\...
Model loaded successfully. Confidence threshold: 0.5
✓ Model loaded successfully!
```

### Step 4: Restart Backend

If backend is running, restart it:
```bash
# Kill current process (Ctrl+C in terminal)
# Or kill by process ID:
taskkill /F /PID <process_id>

# Start fresh
cd ppe-compliance-system/backend
./venv/Scripts/python.exe run.py
```

### Step 5: Test WebSocket Connection

Open your browser and test live monitoring:
```
http://localhost:3000/safety-manager/monitor
```

Click "Start Monitoring" on any camera - you should see real detection now!

---

## 🔄 Alternative: Use Pre-trained Model (If Original Lost)

If you don't have your trained `best.pt`, you can use YOLOv8 pre-trained temporarily:

### Option A: Download YOLOv8n (Fastest)
```bash
cd ppe-compliance-system/backend
./venv/Scripts/python.exe -c "from ultralytics import YOLO; model = YOLO('yolov8n.pt'); print('Downloaded to:', model.ckpt_path)"
```

This downloads ~6MB model to: `C:\Users\<you>\.ultralytics\yolov8n.pt`

**Update `.env`:**
```env
MODEL_PATH=C:\Users\<YourUsername>\.ultralytics\yolov8n.pt
```

⚠️ **Note**: This is a general object detection model, NOT trained for PPE. It will detect:
- People ✅
- But NOT hardhats or safety vests ❌

**Good for**: Testing WebSocket connection
**Not good for**: Actual PPE compliance detection

### Option B: Train New Model

If original model is completely lost, you'll need to re-train:

**Requirements:**
1. Training dataset (labeled images)
2. GPU with CUDA (recommended)
3. 2-4 hours training time

**Training Script:**
```python
from ultralytics import YOLO

# Load base model
model = YOLO('yolov8n.pt')

# Train
results = model.train(
    data='ppe_dataset.yaml',  # Your dataset config
    epochs=100,
    imgsz=640,
    batch=16,
    name='ppe_detection',
    device=0  # GPU 0, or 'cpu'
)

# Best model saved to: runs/detect/ppe_detection/weights/best.pt
```

---

## ✅ Verification Checklist

After placing the model file:

- [ ] File exists at correct path
- [ ] File size is reasonable (6-30 MB)
- [ ] Backend can load model without errors
- [ ] Test detection on sample image works
- [ ] WebSocket connection establishes
- [ ] Live monitoring displays video feed
- [ ] Detections appear on video

---

## 🐛 Troubleshooting

### Error: "Model file not found"
```
✗ Check file path exactly matches
✗ Check file is named exactly "best.pt"
✗ Try absolute path in .env instead of relative
```

### Error: "Failed to load model"
```
✗ Check file is not corrupted
✗ Check file is actually YOLOv8 format
✗ Check ultralytics package is installed
```

### WebSocket connects but no video
```
✗ Check camera source (webcam/video file) exists
✗ Check stream_url in database is correct
✗ Try webcam: stream_url = "0"
```

---

## 📞 Need Help?

**If model loading fails**, run this diagnostic:

```bash
cd ppe-compliance-system/backend
./venv/Scripts/python.exe << EOF
import os
from app.core.config import settings

model_path = settings.get_absolute_model_path()
print(f"Looking for model at: {model_path}")
print(f"File exists: {os.path.exists(model_path)}")
if os.path.exists(model_path):
    print(f"File size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")
EOF
```

Share the output and I'll help debug!

---

## 🎬 Ready to Test?

Once you place the `best.pt` file:

1. ✅ Verify file is in correct location
2. ✅ Restart backend server
3. ✅ Open frontend: http://localhost:3000
4. ✅ Login as admin
5. ✅ Go to Safety Manager → Monitor
6. ✅ Click "Start Monitoring"
7. ✅ Watch real-time PPE detection! 🎉

---

**Status**: ⏳ Waiting for you to place `best.pt` file

**Next Steps After Model Setup**:
- Complete missing features (if needed)
- Proceed to Step 1: Architecture Audit
- Fix any issues found during audit
- Prepare for production deployment
