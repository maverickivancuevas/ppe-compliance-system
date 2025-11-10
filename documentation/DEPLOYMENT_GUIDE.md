# FREE DEPLOYMENT GUIDE - PPE Compliance System

This guide will help you deploy your PPE Compliance System for **FREE** using Vercel (frontend) and Render (backend).

## Prerequisites

1. GitHub account (free)
2. Vercel account (free) - Sign up at https://vercel.com
3. Render account (free) - Sign up at https://render.com

## Part 1: Prepare Your Code

### Step 1: Push to GitHub

```bash
# Initialize git repository (if not already done)
cd "D:\Ppe Compliance\SMART SAFETY PROJECT\ppe-compliance-system"
git init
git add .
git commit -m "Initial commit - PPE Compliance System"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/ppe-compliance-system.git
git branch -M main
git push -u origin main
```

### Step 2: Important Files Created

✅ `backend/render.yaml` - Render configuration
✅ `backend/Procfile` - Process file for deployment
✅ `backend/.env.example` - Environment variables template
✅ `frontend/vercel.json` - Vercel configuration

---

## Part 2: Deploy Backend on Render (FREE)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub
3. Authorize Render to access your repositories

### Step 2: Deploy Backend
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `ppe-compliance-backend`
   - **Region:** Choose closest to your users
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`

### Step 3: Add Environment Variables
In Render dashboard, add these environment variables:

```
SECRET_KEY=YOUR_RANDOM_SECRET_KEY_HERE
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://your-app.vercel.app
DATABASE_URL=sqlite:///./ppe_compliance.db
DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
DEFAULT_ADMIN_PASSWORD=SecurePassword123!
MODEL_PATH=./weights/best.pt
```

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 4: Upload YOLO Model
⚠️ **IMPORTANT:** Your YOLO model (`best.pt`) needs to be accessible:

**Option A: Include in Git (if < 100MB)**
```bash
# Move model to backend directory
mkdir backend/weights
cp "TRAINED MODEL RESULT/weights/best.pt" backend/weights/
git add backend/weights/best.pt
git commit -m "Add YOLO model"
git push
```

**Option B: Use Render Disk (Recommended for large models)**
1. In Render dashboard → Your service → "Disk"
2. Create a disk (1GB free)
3. Mount at `/opt/render/project/src/weights`
4. Upload model via SFTP or API

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Note your backend URL: `https://ppe-compliance-backend.onrender.com`

⚠️ **Free Tier Limitations:**
- Server spins down after 15 minutes of inactivity
- First request may take 30-60 seconds (cold start)
- 750 hours/month free

---

## Part 3: Deploy Frontend on Vercel (FREE)

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Configure:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### Step 3: Add Environment Variables
Add these in Vercel:

```
NEXT_PUBLIC_API_URL=https://ppe-compliance-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://ppe-compliance-backend.onrender.com
```

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Your app will be live at: `https://your-project.vercel.app`

### Step 5: Update Backend CORS
Go back to Render → Your backend service → Environment Variables:
```
ALLOWED_ORIGINS=https://your-project.vercel.app,http://localhost:3000
```
(Replace `your-project.vercel.app` with your actual Vercel URL)

---

## Part 4: Testing Your Deployment

### Test Backend
1. Visit: `https://ppe-compliance-backend.onrender.com/health`
2. Should return: `{"status":"healthy"}`

### Test Frontend
1. Visit: `https://your-project.vercel.app`
2. Login with default admin credentials
3. Test features

### Test WebSocket (Real-time streaming)
⚠️ **Important:** WebSocket may have issues on free tier due to:
- Connection timeouts on Render free tier
- Cold start delays

---

## Alternative FREE Options

### Option 1: Railway (Backend)
- https://railway.app
- $5 free credit/month
- Better WebSocket support
- Similar to Render setup

### Option 2: Fly.io (Backend)
- https://fly.io
- More generous free tier
- Better for WebSocket apps
- Requires Docker knowledge

### Option 3: All-in-One on Railway
Deploy both frontend and backend on Railway:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

## Important Notes

### Free Tier Limitations

**Render Free:**
- ✅ 750 hours/month free
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Cold start: 30-60 seconds
- ⚠️ 512MB RAM
- ⚠️ WebSocket connections may timeout

**Vercel Free:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Fast CDN
- ✅ Auto-scaling
- ✅ Perfect for frontend

### Performance Tips

1. **Backend Cold Starts:**
   - Use a service like UptimeRobot to ping your backend every 14 minutes
   - Keeps it warm during business hours

2. **Database:**
   - SQLite works for testing
   - For production, upgrade to PostgreSQL (Render has free 90-day trial)

3. **Model Loading:**
   - YOLO model takes time to load
   - Consider lazy loading or keep-alive strategies

### Security Checklist

- ✅ Change default admin password immediately
- ✅ Generate strong SECRET_KEY
- ✅ Set DEBUG=False in production
- ✅ Use HTTPS (automatic on Vercel/Render)
- ✅ Configure CORS properly
- ✅ Don't commit `.env` files to git

---

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify all environment variables are set
- Ensure YOLO model path is correct

### Frontend can't connect to backend
- Check NEXT_PUBLIC_API_URL is correct
- Verify CORS settings in backend
- Check browser console for errors

### WebSocket not working
- Ensure using `wss://` (not `ws://`)
- Check Render logs for connection errors
- Free tier may have connection limits

### Cold start too slow
- Upgrade to paid tier ($7/month on Render)
- Or use Railway/Fly.io for better performance

---

## Cost Comparison

| Service | Free Tier | Paid Tier | Best For |
|---------|-----------|-----------|----------|
| **Vercel** | ✅ Unlimited | $20/mo | Frontend |
| **Render** | 750h/mo | $7/mo | Simple backends |
| **Railway** | $5 credit | $5/mo usage | Full-stack apps |
| **Fly.io** | 3 VMs free | Usage-based | WebSocket apps |

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy backend on Render
3. ✅ Deploy frontend on Vercel
4. ✅ Test the application
5. ✅ Share the URL!

---

## Support

If you encounter issues:
- Check logs in respective platforms
- Verify all environment variables
- Test locally first with production settings
- Check free tier limitations

**Good luck with your deployment!** 🚀
