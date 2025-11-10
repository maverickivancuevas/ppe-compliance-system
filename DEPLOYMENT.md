# PPE Compliance System - Free Deployment Guide

This guide will help you deploy your PPE Compliance System for **FREE** using the best available hosting services.

## Architecture Overview

- **Frontend (Next.js)**: Deploy to Vercel (Free)
- **Backend (FastAPI + SQLite)**: Deploy to Render.com or Railway.app (Free)
- **Database**: SQLite (included, no external database needed)

---

## Option 1: Vercel (Frontend) + Render.com (Backend) ⭐ RECOMMENDED

### Part A: Deploy Backend to Render.com

#### Step 1: Create a Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for easy deployment)

#### Step 2: Push Code to GitHub
```bash
# Navigate to your project
cd "SMART SAFETY PROJECT/ppe-compliance-system"

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/ppe-compliance-system.git
git branch -M main
git push -u origin main
```

#### Step 3: Deploy Backend on Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `ppe-backend` (or any name you like)
   - **Region**: Choose closest to Philippines (Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

5. Add Environment Variables:
   - `SECRET_KEY`: Generate a random secret (use: `openssl rand -hex 32`)
   - `ENVIRONMENT`: `production`
   - `ALLOWED_ORIGINS`: `*` (or your frontend URL later)

6. Click "Create Web Service"
7. Wait 5-10 minutes for deployment
8. **Copy your backend URL** (e.g., `https://ppe-backend.onrender.com`)

#### Important Notes for Render:
- Free tier spins down after 15 minutes of inactivity
- First request after inactivity takes ~30-60 seconds
- 750 hours/month free (enough for 1 app)

### Part B: Deploy Frontend to Vercel

#### Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

#### Step 2: Update Frontend Environment
1. Create/update `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://ppe-backend.onrender.com
```

2. Commit the changes:
```bash
git add frontend/.env.production
git commit -m "Add production environment variables"
git push
```

#### Step 3: Deploy Frontend on Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

5. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: `https://ppe-backend.onrender.com`

6. Click "Deploy"
7. Wait 3-5 minutes
8. **Your app is live!** (e.g., `https://ppe-compliance.vercel.app`)

#### Step 4: Update Backend CORS
1. Go back to Render Dashboard
2. Update `ALLOWED_ORIGINS` environment variable to your Vercel URL:
   - `ALLOWED_ORIGINS`: `https://ppe-compliance.vercel.app`
3. Restart the service

---

## Option 2: Vercel (Frontend) + Railway.app (Backend)

### Part A: Deploy Backend to Railway

#### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your repository
3. Configure:
   - **Root Directory**: `backend`
   - Railway auto-detects Python and uses Procfile

4. Add Environment Variables (click on service → Variables):
   - `SECRET_KEY`: (generate with `openssl rand -hex 32`)
   - `ENVIRONMENT`: `production`
   - `ALLOWED_ORIGINS`: `*`

5. Railway will automatically deploy
6. Click "Settings" → "Generate Domain" to get your backend URL
7. **Copy the URL** (e.g., `https://ppe-backend.railway.app`)

### Part B: Deploy Frontend to Vercel
Follow the same steps as Option 1, Part B above.

---

## Option 3: All-in-One with Vercel (Frontend + Backend)

Vercel can host both Next.js frontend and Python backend using serverless functions.

#### Step 1: Create `backend/vercel.json`
```json
{
  "builds": [
    {
      "src": "app/main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "app/main.py"
    }
  ]
}
```

#### Step 2: Deploy to Vercel
1. Push both frontend and backend to GitHub
2. Import project to Vercel
3. Set Root Directory to `/` (project root)
4. Vercel will automatically detect and deploy both

**Limitation**: This works but has limitations with WebSocket support and YOLO model size.

---

## Post-Deployment Configuration

### 1. Update Backend CORS Settings
Edit `backend/app/core/config.py`:
```python
ALLOWED_ORIGINS = [
    "https://your-app.vercel.app",
    "http://localhost:3000",  # Keep for local development
]
```

### 2. Create Initial Admin User
After deployment, create an admin user by accessing:
```
https://your-backend-url.com/docs
```

Use the Swagger UI to call `POST /api/auth/register` with:
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "yourSecurePassword",
  "full_name": "Admin User",
  "role": "admin"
}
```

### 3. Upload YOLO Model
Your `best.pt` model file needs to be included in the backend deployment:
- Make sure `best.pt` is in `backend/` directory
- Include it in your git repository (add to git if not already)
- Some platforms have file size limits (Railway: 100MB, Render: varies)

---

## Free Tier Limitations & Solutions

### Render.com Free Tier
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Spins down after 15 min inactivity (30-60s cold start)
- ✅ 512MB RAM (enough for basic YOLO)
- 💡 **Solution**: Use a service like [UptimeRobot](https://uptimerobot.com) (free) to ping your backend every 10 minutes

### Railway.app Free Tier
- ✅ $5 credit/month (usually ~500 hours)
- ✅ No cold starts
- ✅ 512MB RAM
- ⚠️ Need to verify with credit card (no charges)

### Vercel Free Tier
- ✅ Unlimited bandwidth
- ✅ 100GB bandwidth/month
- ✅ Auto-scaling
- ✅ No cold starts for frontend
- ✅ Perfect for Next.js

---

## Monitoring and Maintenance

### Keep Backend Alive (Prevent Cold Starts)
Use **UptimeRobot** (free):
1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/`
   - Interval: 10 minutes
3. This keeps your backend warm and responsive

### View Logs
- **Render**: Dashboard → Your Service → Logs
- **Railway**: Dashboard → Your Service → Logs tab
- **Vercel**: Dashboard → Your Project → Deployments → Click deployment → Function Logs

---

## Cost Comparison (All Free Tiers)

| Platform | Frontend | Backend | Database | Total/Month |
|----------|----------|---------|----------|-------------|
| **Vercel + Render** | Free | Free | Free (SQLite) | $0 |
| **Vercel + Railway** | Free | Free | Free (SQLite) | $0 |
| **All Vercel** | Free | Free* | Free (SQLite) | $0 |

*Serverless functions have execution limits

---

## Recommended Setup for Philippines

**Best Option**: Vercel (Frontend) + Render.com Singapore Region (Backend)

**Why?**
- ✅ Completely free
- ✅ Render Singapore region = low latency to Philippines
- ✅ Vercel CDN = fast globally
- ✅ Easy to deploy and maintain
- ✅ Automatic HTTPS
- ✅ Good for small-medium teams

---

## Deployment Checklist

### Before Deployment
- [ ] Push code to GitHub
- [ ] Add `frontend/.env.production` with backend URL
- [ ] Ensure `backend/requirements.txt` is complete
- [ ] Include `backend/best.pt` YOLO model
- [ ] Create `backend/Procfile` (already exists)

### Backend Deployment
- [ ] Create Render/Railway account
- [ ] Deploy backend from GitHub
- [ ] Add environment variables
- [ ] Generate domain/URL
- [ ] Test API endpoints at `/docs`

### Frontend Deployment
- [ ] Create Vercel account
- [ ] Update `NEXT_PUBLIC_API_URL` to backend URL
- [ ] Deploy from GitHub
- [ ] Test frontend access

### Post-Deployment
- [ ] Update backend CORS with frontend URL
- [ ] Create admin user account
- [ ] Test camera detection functionality
- [ ] Set up UptimeRobot monitoring (optional)

---

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify `requirements.txt` has all dependencies
- Ensure `Procfile` is correct
- Check Python version (3.9+)

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running (check Render/Railway dashboard)

### YOLO model not loading
- Check file size limits on platform
- Verify `best.pt` is in repository
- Check backend logs for model loading errors

### Camera detection not working
- WebSockets might not work on all free platforms
- Consider using REST API polling instead of WebSocket for free hosting

---

## Need Help?

If you encounter issues during deployment, check:
1. Platform documentation (Vercel, Render, Railway)
2. Application logs in platform dashboard
3. Browser console for frontend errors (F12)

Good luck with your deployment! 🚀
