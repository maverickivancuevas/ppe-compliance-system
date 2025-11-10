# Quick Start Guide - PPE Compliance System

## 🚀 Get Started in 5 Minutes

All problems have been fixed! Follow these steps to get your system running.

## Prerequisites

- Python 3.9+
- Node.js 18+
- Git

## Step 1: Clone/Navigate to Project

```bash
cd "D:\Ppe Compliance\SMART SAFETY PROJECT\ppe-compliance-system"
```

## Step 2: Backend Setup (2 minutes)

```bash
cd backend

# Create .env file
copy .env.example .env

# EDIT .env file and set:
# 1. SECRET_KEY (generate with: openssl rand -hex 32)
# 2. MODEL_PATH (absolute path to your best.pt file)

# Example MODEL_PATH:
# MODEL_PATH=D:/Ppe Compliance/SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt

# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate
# OR (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Delete old database (IMPORTANT!)
del ppe_compliance.db

# Start backend
python run.py
```

## Step 3: Frontend Setup (1 minute)

```bash
# New terminal
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

## Step 4: First Login (1 minute)

1. Open http://localhost:3000
2. Login with credentials from your `.env` file:
   - Email: `DEFAULT_ADMIN_EMAIL`
   - Password: `DEFAULT_ADMIN_PASSWORD`
3. **IMMEDIATELY change the password!**

## Step 5: Add a Camera (1 minute)

1. Go to Admin → Cameras
2. Click "Add Camera"
3. Fill in:
   - Name: Test Camera
   - Location: Office
   - Stream URL: `0` (for webcam)
4. Click Save

## Step 6: Start Monitoring

1. Go to Safety Manager → Monitor
2. Select your camera
3. Watch real-time PPE detection!

## 🎉 You're Done!

Your system is now running with:
- ✅ Secure authentication
- ✅ Input validation
- ✅ Structured logging
- ✅ Optimized database
- ✅ Error handling

## Troubleshooting

### Backend won't start
- Check `.env` file exists
- Verify SECRET_KEY is set (not the placeholder)
- Check MODEL_PATH points to existing file

### "Model not found"
- Use absolute path in MODEL_PATH
- Example: `D:/path/to/model/best.pt`
- Forward slashes, even on Windows

### "Password too weak"
- Must be 8+ characters
- Must have letter AND number
- Example: `Password123`

### "Database error"
- Delete database: `del ppe_compliance.db`
- Restart backend

### Frontend connection error
- Verify backend running on port 8000
- Check `.env.local` has correct API_URL

## What Changed?

All problems fixed:
- ✅ Security vulnerabilities patched
- ✅ Boolean fields fixed
- ✅ Logging implemented
- ✅ Validation added
- ✅ Errors handled properly
- ✅ Database indexed
- ✅ Duplicates removed

## Documentation

For detailed information:
- **[ALL_FIXES_COMPLETE.md](./ALL_FIXES_COMPLETE.md)** - Complete summary
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Migration details
- **[SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)** - Verification checklist
- **[CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md)** - Security fixes
- **[HIGH_PRIORITY_FIXES_SUMMARY.md](./HIGH_PRIORITY_FIXES_SUMMARY.md)** - Quality improvements

## Key URLs

- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Health Check**: http://localhost:8000/health

## Default Credentials

Check your `backend/.env` file:
- Email: `DEFAULT_ADMIN_EMAIL`
- Password: `DEFAULT_ADMIN_PASSWORD`

**⚠️ Change these immediately after first login!**

## Logs Location

- All logs: `backend/logs/ppe_compliance.log`
- Errors only: `backend/logs/errors.log`

## Success Indicators

You'll know it's working when:
- ✅ Backend starts without errors
- ✅ "YOLO model loaded successfully!" appears
- ✅ Frontend accessible at port 3000
- ✅ Login works
- ✅ Camera streams video with detection boxes
- ✅ Detections show in real-time

## Need Help?

1. Check logs in `backend/logs/`
2. Review error messages carefully
3. Verify all steps completed
4. Check documentation files

## Production Deployment

For production:
1. Use strong SECRET_KEY
2. Change default admin password
3. Set `DEBUG=False`
4. Enable HTTPS
5. Configure proper CORS
6. Set up backups

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for production checklist.

---

**Status**: ✅ All problems fixed
**Ready**: Production-ready after migration
**Support**: Comprehensive documentation included
