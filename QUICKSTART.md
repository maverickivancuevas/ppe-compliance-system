# Quick Start Guide

Get your PPE Compliance System up and running in 5 minutes!

## Step 1: Backend Setup (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies (this may take a few minutes)
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# The default .env should work out of the box
# It points to your model at: ../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
```

## Step 2: Start Backend (30 seconds)

```bash
# Make sure you're in the backend directory with venv activated
python run.py
```

You should see:
```
============================================================
Default admin user created:
Email: admin@example.com
Password: admin123
PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN!
============================================================

PPE Compliance System v1.0.0 started!
Environment: development
API Docs: http://0.0.0.0:8000/docs
```

**✅ Backend is running!** Keep this terminal open.

## Step 3: Frontend Setup (2 minutes)

Open a **NEW terminal window**:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local
copy .env.local.example .env.local

# No need to edit - defaults work for local development
```

## Step 4: Start Frontend (30 seconds)

```bash
# In the frontend directory
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- Local:        http://localhost:3000
```

**✅ Frontend is running!**

## Step 5: Login and Test

1. **Open your browser**: Go to `http://localhost:3000`

2. **Login with default credentials**:
   - Email: `admin@example.com`
   - Password: `admin123`

3. **You're in!** You should be redirected to the admin dashboard.

## Next Steps

### Add Your First Camera

1. In the admin dashboard, click **"Cameras"**
2. Click **"Add New Camera"**
3. Fill in the form:
   - **Name**: "Main Entrance"
   - **Location**: "Building A"
   - **Stream URL**: `0` (for your webcam) or full path to a video file
   - **Description**: "Primary monitoring point"
4. Click **"Create Camera"**

### Create a Safety Manager User

1. Click **"Users"** in the admin dashboard
2. Click **"Add New User"**
3. Fill in:
   - **Email**: your-email@example.com
   - **Full Name**: Your Name
   - **Password**: (choose a password)
   - **Role**: Safety Manager
4. Click **"Create User"**

### Start Monitoring

1. Logout from admin
2. Login as Safety Manager
3. Click on a camera to start real-time monitoring
4. You'll see:
   - Live video feed with bounding boxes
   - Real-time detection results
   - Compliance status
   - Detection log

## Troubleshooting

### Backend won't start

**Error: "No module named 'fastapi'"**
- Make sure virtual environment is activated
- Run: `pip install -r requirements.txt`

**Error: "Model file not found"**
- Check the MODEL_PATH in `.env`
- Make sure it points to: `../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt`
- Try using absolute path if relative doesn't work

### Frontend won't start

**Error: "npm: command not found"**
- Install Node.js from: https://nodejs.org/

**Error: Port 3000 already in use**
- Use different port: `npm run dev -- -p 3001`

### Cannot login

**Error: "Network Error" or "Connection refused"**
- Make sure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local`

### Video stream not showing

1. Check if camera is connected
2. Try different stream URL (0, 1, 2 for different cameras)
3. Check browser console for errors (F12)
4. Make sure WebSocket connection is established

## Testing with Sample Video

If you don't have a webcam, use a video file:

1. Add camera with stream URL: `C:\path\to\your\video.mp4`
2. Use forward slashes or double backslashes in path
3. Supported formats: .mp4, .avi, .mov

## Default Credentials

**Admin Account:**
- Email: `admin@example.com`
- Password: `admin123`

**⚠️ IMPORTANT: Change this password immediately after first login!**

## System Requirements

- **Python**: 3.9 or higher
- **Node.js**: 18 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **GPU**: NVIDIA GPU with CUDA (optional, for faster inference)
- **OS**: Windows, Linux, or macOS

## What Each Terminal Does

- **Terminal 1 (Backend)**: Runs Python FastAPI server + YOLOv8 model
- **Terminal 2 (Frontend)**: Runs Next.js development server

**Both must be running** for the system to work!

## Next: Check out README.md

For full documentation, deployment guide, and advanced features, see [README.md](README.md)

## Need Help?

1. Check API documentation: `http://localhost:8000/docs`
2. Check health status: `http://localhost:8000/health`
3. Review logs in your terminals
4. See troubleshooting section in README.md
