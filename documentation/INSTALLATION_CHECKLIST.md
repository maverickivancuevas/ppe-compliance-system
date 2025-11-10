# Installation Checklist

Use this checklist to ensure everything is set up correctly.

## Prerequisites Check

- [ ] **Python 3.9+** installed
  ```bash
  python --version
  # Should show: Python 3.9.x or higher
  ```

- [ ] **Node.js 18+** installed
  ```bash
  node --version
  # Should show: v18.x.x or higher
  ```

- [ ] **npm** installed
  ```bash
  npm --version
  # Should show: 9.x.x or higher
  ```

- [ ] **Git** installed (optional, for version control)
  ```bash
  git --version
  ```

## Backend Setup

- [ ] Navigate to backend folder
  ```bash
  cd "c:\Users\ubald\Downloads\SMART SAFETY PROJECT\ppe-compliance-system\backend"
  ```

- [ ] Create virtual environment
  ```bash
  python -m venv venv
  ```

- [ ] Activate virtual environment
  ```bash
  # Windows:
  venv\Scripts\activate

  # You should see (venv) in your terminal prompt
  ```

- [ ] Install dependencies
  ```bash
  pip install -r requirements.txt
  # This may take 5-10 minutes
  # Watch for any errors
  ```

- [ ] Create .env file
  ```bash
  copy .env.example .env
  ```

- [ ] Verify model path in .env
  ```bash
  # Open .env and check MODEL_PATH
  # Default: ../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
  # Should point to your best.pt file
  ```

- [ ] Test backend
  ```bash
  python run.py
  ```

  **Expected output:**
  ```
  ============================================================
  Default admin user created:
  Email: admin@example.com
  Password: admin123
  ============================================================

  PPE Compliance System v1.0.0 started!
  Environment: development
  API Docs: http://0.0.0.0:8000/docs

  INFO:     Uvicorn running on http://0.0.0.0:8000
  ```

- [ ] Test API in browser
  - Open: http://localhost:8000/health
  - Should see: `{"status":"healthy",...}`

- [ ] Check API docs
  - Open: http://localhost:8000/docs
  - Should see interactive API documentation

- [ ] **Keep backend running!** Don't close this terminal.

## Frontend Setup

- [ ] Open **NEW** terminal window

- [ ] Navigate to frontend folder
  ```bash
  cd "c:\Users\ubald\Downloads\SMART SAFETY PROJECT\ppe-compliance-system\frontend"
  ```

- [ ] Install dependencies
  ```bash
  npm install
  # This may take 3-5 minutes
  # Watch for any errors
  ```

- [ ] Create .env.local file
  ```bash
  copy .env.local.example .env.local
  ```

- [ ] Verify .env.local settings
  ```bash
  # Open .env.local and check:
  # NEXT_PUBLIC_API_URL=http://localhost:8000
  # NEXT_PUBLIC_WS_URL=ws://localhost:8000
  ```

- [ ] Start frontend
  ```bash
  npm run dev
  ```

  **Expected output:**
  ```
  - ready started server on 0.0.0.0:3000
  - Local:        http://localhost:3000
  ```

- [ ] **Keep frontend running!** Don't close this terminal.

## System Test

- [ ] Open browser: http://localhost:3000

- [ ] Should see login page

- [ ] Login with default credentials:
  - Email: `admin@example.com`
  - Password: `admin123`

- [ ] Should redirect to Admin Dashboard

- [ ] Check stats cards display (may show 0 initially)

- [ ] Logout and login again to verify

## Create First Camera (via API)

- [ ] Open: http://localhost:8000/docs

- [ ] Click on **POST /api/cameras/** endpoint

- [ ] Click "Try it out"

- [ ] First, get auth token:
  1. Scroll to **POST /api/auth/login**
  2. Click "Try it out"
  3. Enter:
     ```json
     {
       "email": "admin@example.com",
       "password": "admin123"
     }
     ```
  4. Click "Execute"
  5. Copy the `access_token` from response

- [ ] Authorize API:
  1. Click "Authorize" button at top
  2. Paste token (format: `your-token-here`)
  3. Click "Authorize" then "Close"

- [ ] Create camera:
  1. Go back to **POST /api/cameras/**
  2. Click "Try it out"
  3. Enter:
     ```json
     {
       "name": "Main Camera",
       "location": "Entrance",
       "stream_url": "0",
       "description": "Primary monitoring camera"
     }
     ```
  4. Click "Execute"
  5. Should get 201 response with camera data

- [ ] Refresh frontend - camera should appear

## Create Safety Manager User

- [ ] In API docs, go to **POST /api/users/**

- [ ] Click "Try it out"

- [ ] Enter:
  ```json
  {
    "email": "manager@example.com",
    "password": "manager123",
    "full_name": "Safety Manager",
    "role": "safety_manager"
  }
  ```

- [ ] Click "Execute"

- [ ] Should get 201 response

- [ ] Logout from admin in frontend

- [ ] Login as Safety Manager:
  - Email: `manager@example.com`
  - Password: `manager123`

- [ ] Should see Safety Manager Dashboard

## Test Video Streaming

- [ ] As Safety Manager, click "Start Monitoring" on camera

- [ ] Should see alert: "Coming soon!"
  - Full video streaming component needs additional implementation
  - Backend WebSocket is ready
  - Frontend needs video player component

## Troubleshooting

### Backend Issues

**ModuleNotFoundError:**
- [ ] Ensure venv is activated (see `(venv)` in prompt)
- [ ] Run: `pip install -r requirements.txt` again

**Model not found:**
- [ ] Check `.env` file `MODEL_PATH` setting
- [ ] Verify file exists: `../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt`
- [ ] Try absolute path if relative doesn't work

**Port 8000 in use:**
- [ ] Change PORT in `.env` to 8001
- [ ] Update frontend `.env.local` to match

### Frontend Issues

**Module not found:**
- [ ] Run: `npm install` again
- [ ] Delete `node_modules` folder and `package-lock.json`
- [ ] Run: `npm install` fresh

**Connection refused:**
- [ ] Ensure backend is running
- [ ] Check `NEXT_PUBLIC_API_URL` in `.env.local`
- [ ] Try: http://127.0.0.1:8000 instead of localhost

**Port 3000 in use:**
- [ ] Run: `npm run dev -- -p 3001`
- [ ] Access at: http://localhost:3001

### General Issues

**Cannot login:**
- [ ] Check browser console (F12) for errors
- [ ] Verify backend is running: http://localhost:8000/health
- [ ] Clear browser cache and cookies
- [ ] Try incognito/private window

**Database errors:**
- [ ] Stop backend
- [ ] Delete `ppe_compliance.db` file
- [ ] Restart backend (database will be recreated)

## Final Verification

- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Can login as admin
- [ ] Can see admin dashboard
- [ ] Can create camera via API
- [ ] Can create user via API
- [ ] Can login as safety manager
- [ ] Can see safety manager dashboard

## Next Steps

Once everything above is checked:

1. **Customize Settings**
   - Change default admin password
   - Update `.env` configuration as needed
   - Add your company logo

2. **Add Cameras**
   - Via API or create UI forms
   - Test with webcam (stream_url: "0")
   - Test with video files

3. **Add Users**
   - Create safety manager accounts
   - Assign appropriate roles

4. **Implement Additional Features**
   - Video monitoring page
   - Camera management UI
   - User management UI
   - Analytics dashboard
   - Report generation

5. **Deploy to Production**
   - Follow deployment guide in README.md
   - Set up Cloudflare Tunnel
   - Deploy frontend to Vercel

## Support

If you encounter issues:

1. Check this checklist again
2. Review QUICKSTART.md
3. Check README.md troubleshooting section
4. Review API docs at http://localhost:8000/docs
5. Check terminal logs for errors

## System is Ready!

✅ If all items are checked, your PPE Compliance System is fully operational!

You now have:
- Working backend with YOLOv8 integration
- Authentication system
- Admin and Safety Manager dashboards
- Database with all models
- REST API with full documentation
- WebSocket support for real-time streaming
- Professional dark-themed UI

**Congratulations! 🎉**
