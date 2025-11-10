# Migration Guide - Critical Fixes Applied

This document describes the critical changes made to fix security vulnerabilities and improve code quality.

## Overview of Changes

### 1. Security Improvements
- Removed hardcoded credentials from code
- Updated JWT secret key default to require manual configuration
- Increased token expiration from 30 to 480 minutes (8 hours)
- Admin credentials now configurable via environment variables

### 2. Database Schema Changes
- Changed boolean fields from String ("true"/"false") to proper Boolean type
- Affects: `users.is_active` and all detection event boolean fields
- **IMPORTANT**: Existing database needs migration

### 3. WebSocket Consolidation
- Removed duplicate `/ws/monitor/{camera_id}` endpoint
- Use `/ws/stream/{camera_id}` for all video streaming
- `monitor.py` route removed from main.py (file kept for reference)

### 4. Model Path Handling
- Added helper method to resolve relative paths to absolute
- Prevents path issues when running from different directories

## Migration Steps

### Step 1: Backup Your Data
```bash
# Backup your existing database
cp backend/ppe_compliance.db backend/ppe_compliance.db.backup
```

### Step 2: Update Environment Files

#### Backend (.env)
```bash
cd backend
cp .env.example .env
```

Edit `.env` and configure:
1. **Generate secure SECRET_KEY**:
   ```bash
   # On Linux/Mac:
   openssl rand -hex 32

   # On Windows (PowerShell):
   -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
   ```

2. **Set MODEL_PATH** to absolute path:
   ```env
   MODEL_PATH=D:/Ppe Compliance/SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
   ```

3. **Configure admin credentials** (optional - defaults work):
   ```env
   DEFAULT_ADMIN_EMAIL=your-admin@company.com
   DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!
   DEFAULT_ADMIN_NAME=Admin User
   ```

#### Frontend (.env.local)
```bash
cd frontend
cp .env.local.example .env.local
```

Defaults should work for local development.

### Step 3: Database Migration

Since boolean fields changed from String to Boolean, you need to recreate the database:

**Option A: Fresh Start (Recommended for Development)**
```bash
# Delete old database
rm backend/ppe_compliance.db

# Start backend - database will be recreated automatically
cd backend
python run.py
```

**Option B: Migrate Existing Data (Production)**

If you have important data, create a migration script:

```python
# backend/migrate_boolean_fields.py
import sqlite3

conn = sqlite3.connect('ppe_compliance.db')
cursor = conn.cursor()

# Migrate users table
cursor.execute("""
    UPDATE users
    SET is_active = CASE
        WHEN is_active = 'true' THEN 1
        WHEN is_active = 'false' THEN 0
        ELSE 1
    END
""")

# Migrate detection_events table
cursor.execute("""
    UPDATE detection_events
    SET
        person_detected = CASE WHEN person_detected = 'true' THEN 1 ELSE 0 END,
        hardhat_detected = CASE WHEN hardhat_detected = 'true' THEN 1 ELSE 0 END,
        no_hardhat_detected = CASE WHEN no_hardhat_detected = 'true' THEN 1 ELSE 0 END,
        safety_vest_detected = CASE WHEN safety_vest_detected = 'true' THEN 1 ELSE 0 END,
        no_safety_vest_detected = CASE WHEN no_safety_vest_detected = 'true' THEN 1 ELSE 0 END,
        is_compliant = CASE WHEN is_compliant = 'true' THEN 1 ELSE 0 END
""")

conn.commit()
conn.close()
print("Migration completed successfully!")
```

Run the migration:
```bash
cd backend
python migrate_boolean_fields.py
```

### Step 4: Update Frontend WebSocket URLs

If your frontend code hardcodes WebSocket URLs, update them:

**OLD**: `/ws/monitor/{camera_id}`
**NEW**: `/ws/stream/{camera_id}`

Check these files:
- `frontend/src/app/safety-manager/monitor/[cameraId]/page.tsx`
- Any custom components that connect to WebSocket

### Step 5: Change Default Admin Password

1. Start the backend
2. Login with default credentials (from your .env file)
3. Navigate to Profile/Settings
4. **IMMEDIATELY** change the password

### Step 6: Test Everything

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python run.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Visit http://localhost:3000 and verify:
- [ ] Login works
- [ ] User management works
- [ ] Camera streaming works via `/ws/stream/{camera_id}`
- [ ] Detections are saved correctly
- [ ] Boolean fields display correctly (no "true"/"false" strings)

## Breaking Changes

### 1. Database Schema
- All boolean fields changed from String to Boolean
- Data migration required (see Step 3)

### 2. WebSocket Endpoint
- `/ws/monitor/{camera_id}` endpoint removed
- Use `/ws/stream/{camera_id}` instead
- Update frontend code if needed

### 3. Environment Variables Required
- Must create `.env` file before running backend
- Must set SECRET_KEY to a secure value
- MODEL_PATH should be absolute path

## Rollback Procedure

If you need to rollback:

```bash
# Restore database backup
cp backend/ppe_compliance.db.backup backend/ppe_compliance.db

# Revert code changes (if using git)
git checkout <previous-commit-hash>
```

## Security Checklist

After migration, verify:

- [ ] SECRET_KEY is unique and secure (not the default)
- [ ] Default admin password has been changed
- [ ] `.env` file is in `.gitignore` (never commit secrets!)
- [ ] CORS origins are properly configured for production
- [ ] HTTPS enabled in production
- [ ] Database backups configured

## Support

If you encounter issues:

1. Check backend logs for errors
2. Verify `.env` file exists and is properly configured
3. Ensure model file exists at configured MODEL_PATH
4. Check database migration completed successfully

## Additional Notes

### Why These Changes?

1. **Security**: Hardcoded secrets are a major vulnerability
2. **Data Integrity**: Proper boolean types prevent string comparison errors
3. **Maintainability**: Single WebSocket endpoint is easier to maintain
4. **Reliability**: Absolute paths prevent file-not-found errors

### Performance Impact

- No performance impact expected
- Boolean fields slightly more efficient than strings
- Model path resolution happens once at startup

### Future Migrations

Consider setting up Alembic for proper database migrations:

```bash
pip install alembic
alembic init alembic
```

This will help manage schema changes more gracefully in the future.
