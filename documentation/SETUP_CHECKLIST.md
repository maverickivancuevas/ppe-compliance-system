# Setup Checklist - After Critical Fixes

Use this checklist to ensure your PPE Compliance System is properly configured after applying the critical fixes.

## Pre-Setup

- [ ] Read [CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md)
- [ ] Read [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- [ ] Backup existing database if you have data: `cp backend/ppe_compliance.db backend/ppe_compliance.db.backup`

## Backend Setup

### 1. Environment Configuration

- [ ] Navigate to backend directory: `cd backend`
- [ ] Copy environment template: `cp .env.example .env`
- [ ] Open `.env` file in editor

#### Required Configuration:

- [ ] **Generate SECRET_KEY**:
  ```bash
  # Linux/Mac:
  openssl rand -hex 32

  # Windows PowerShell:
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
  ```
- [ ] Paste generated key into `.env` file: `SECRET_KEY=<your-generated-key>`
- [ ] **Set MODEL_PATH** (use absolute path):
  ```env
  # Example:
  MODEL_PATH=D:/Ppe Compliance/SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
  ```
- [ ] Verify model file exists at that path

#### Optional Configuration:

- [ ] Set custom admin email: `DEFAULT_ADMIN_EMAIL=your-email@company.com`
- [ ] Set custom admin password: `DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!`
- [ ] Set custom admin name: `DEFAULT_ADMIN_NAME=Your Name`
- [ ] Adjust token expiration if needed: `ACCESS_TOKEN_EXPIRE_MINUTES=480`
- [ ] Configure CORS origins for production: `ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com`

### 2. Database Migration

Choose one option:

**Option A: Fresh Start (Recommended for Development)**
- [ ] Delete old database: `rm ppe_compliance.db` (or `del ppe_compliance.db` on Windows)
- [ ] Database will be created automatically on first run

**Option B: Migrate Existing Data (Production)**
- [ ] Follow migration script in [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md#step-3-database-migration)
- [ ] Run migration script: `python migrate_boolean_fields.py`
- [ ] Verify migration successful

### 3. Virtual Environment

- [ ] Create virtual environment (if not exists):
  ```bash
  python -m venv venv
  ```
- [ ] Activate virtual environment:
  ```bash
  # Windows:
  venv\Scripts\activate

  # Linux/Mac:
  source venv/bin/activate
  ```
- [ ] Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```

### 4. Start Backend

- [ ] Run backend: `python run.py`
- [ ] Check for startup messages:
  - [ ] "Loading YOLO model from: ..." (should show absolute path)
  - [ ] "YOLO model loaded successfully!"
  - [ ] "Default admin user created:" (if first run)
  - [ ] "PPE Compliance System v1.0.0 started!"
- [ ] Verify backend accessible: http://localhost:8000
- [ ] Check API docs: http://localhost:8000/docs
- [ ] Check health endpoint: http://localhost:8000/health

## Frontend Setup

### 1. Environment Configuration

- [ ] Navigate to frontend directory: `cd frontend`
- [ ] Verify `.env.local.example` exists
- [ ] Copy if needed: `cp .env.local.example .env.local`
- [ ] Open `.env.local` file

#### Configuration:

- [ ] Verify `NEXT_PUBLIC_API_URL=http://localhost:8000`
- [ ] Verify `NEXT_PUBLIC_WS_URL=ws://localhost:8000`
- [ ] Update for production if needed

### 2. Dependencies

- [ ] Install dependencies: `npm install`
- [ ] Wait for installation to complete

### 3. Start Frontend

- [ ] Run development server: `npm run dev`
- [ ] Verify frontend accessible: http://localhost:3000
- [ ] Check for console errors in browser dev tools

## Post-Setup Verification

### 1. Authentication Test

- [ ] Navigate to http://localhost:3000
- [ ] Should redirect to `/login`
- [ ] Login with admin credentials from `.env`:
  - Email: (from `DEFAULT_ADMIN_EMAIL`)
  - Password: (from `DEFAULT_ADMIN_PASSWORD`)
- [ ] Login should succeed
- [ ] Should redirect to admin dashboard

### 2. Change Admin Password

- [ ] Navigate to Profile/Settings
- [ ] **CRITICAL**: Change default admin password immediately
- [ ] Logout and login with new password to verify

### 3. Test User Management

- [ ] Navigate to Users section
- [ ] Create a test user
- [ ] Verify user appears in list
- [ ] Check `is_active` displays as checkbox/toggle (not "true" string)
- [ ] Edit user and verify changes save
- [ ] Delete test user

### 4. Test Camera Management

- [ ] Navigate to Cameras section
- [ ] Add a test camera:
  - Name: Test Camera
  - Location: Test Location
  - Stream URL: `0` (for webcam) or video file path
  - Status: Active
- [ ] Verify camera appears in list
- [ ] Edit camera and verify changes save

### 5. Test Video Streaming

- [ ] Navigate to Safety Manager dashboard
- [ ] Click on test camera
- [ ] Should connect to `/ws/stream/{camera_id}` (check browser network tab)
- [ ] Verify video feed appears
- [ ] Verify detections display in real-time
- [ ] Check detection boxes appear on video
- [ ] Verify compliance status updates

### 6. Test Detection Storage

- [ ] Let video stream run for ~1 minute
- [ ] Navigate to Detections/History
- [ ] Verify detections are being saved
- [ ] Check boolean fields display correctly (not "true"/"false" strings)
- [ ] Verify violation types shown correctly

### 7. Test Alerts

- [ ] Trigger a violation (remove hardhat or vest)
- [ ] Verify alert appears in real-time
- [ ] Check alert severity is correct
- [ ] Navigate to Alerts section
- [ ] Verify alert is saved in database

## Production Deployment Checklist

When deploying to production:

- [ ] Use strong, unique SECRET_KEY (64+ characters)
- [ ] Use strong admin password
- [ ] Enable HTTPS
- [ ] Configure CORS for production domains only
- [ ] Set `DEBUG=False` in `.env`
- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Configure database backups
- [ ] Set up monitoring/logging
- [ ] Test all features in production environment
- [ ] Never commit `.env` file to git (check `.gitignore`)

## Troubleshooting

### Backend won't start

- [ ] Check `.env` file exists in `backend/` directory
- [ ] Verify SECRET_KEY is set and not the default placeholder
- [ ] Check MODEL_PATH points to existing file
- [ ] Verify virtual environment is activated
- [ ] Check all dependencies installed: `pip list`
- [ ] Look for error messages in console

### Model not loading

- [ ] Verify MODEL_PATH in `.env` is absolute path
- [ ] Check model file exists: `ls -la "<model-path>"`
- [ ] Ensure path doesn't have typos
- [ ] Check file permissions
- [ ] Try with quotes in path if spaces exist

### Database errors

- [ ] Delete and recreate: `rm ppe_compliance.db && python run.py`
- [ ] Check database not locked by another process
- [ ] Verify disk space available
- [ ] Check file permissions

### Frontend won't connect

- [ ] Verify backend is running on port 8000
- [ ] Check `.env.local` has correct API_URL
- [ ] Check browser console for CORS errors
- [ ] Verify firewall not blocking ports
- [ ] Try in incognito/private window

### WebSocket connection fails

- [ ] Verify using `/ws/stream/{camera_id}` (not `/ws/monitor/`)
- [ ] Check browser network tab for WebSocket connection
- [ ] Verify camera exists and is active
- [ ] Check backend logs for errors
- [ ] Ensure no firewall blocking WebSocket

### Boolean fields show "true"/"false" strings

- [ ] Database migration not completed
- [ ] Delete database and recreate: `rm ppe_compliance.db`
- [ ] Or run migration script from MIGRATION_GUIDE.md

## Success Criteria

Your system is properly configured when:

✅ Backend starts without errors
✅ Model loads successfully
✅ Frontend connects to backend
✅ Login works with admin credentials
✅ Admin password has been changed
✅ Camera streaming works
✅ Detections appear in real-time
✅ Boolean fields display correctly (no "true"/"false" strings)
✅ Violations trigger alerts
✅ Data saves to database

## Support

If you're still having issues after following this checklist:

1. Review error messages carefully
2. Check both backend and frontend logs
3. Verify all steps in [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
4. Review [CRITICAL_FIXES_SUMMARY.md](./CRITICAL_FIXES_SUMMARY.md)

## Next Steps

After successful setup:

1. Review remaining issues in CRITICAL_FIXES_SUMMARY.md
2. Consider implementing high-priority improvements
3. Set up regular database backups
4. Configure monitoring and logging
5. Plan production deployment

---

**Last Updated**: After critical fixes application
**Status**: All critical issues resolved ✅
