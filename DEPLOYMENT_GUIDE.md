# PPE Compliance System - Deployment Guide

This guide will walk you through deploying your PPE Compliance System to **Vercel** (frontend) and **Render** (backend).

## Prerequisites

- GitHub account
- Vercel account (free): https://vercel.com
- Render account (free): https://render.com
- Gmail account (for sending OTP emails)

---

## Part 1: Deploy Backend to Render

### Step 1: Push Your Code to GitHub

1. Create a new repository on GitHub
2. Push your code:
```bash
cd "D:\Ppe Compliance Project\SMART SAFETY PROJECT\ppe-compliance-system"
git init
git add .
git commit -m "Initial commit - PPE Compliance System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ppe-compliance-system.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to https://render.com and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `ppe-compliance-backend`
   - **Region**: Singapore (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

### Step 3: Configure Environment Variables

In Render dashboard, go to **Environment** tab and add these variables:

#### Required Variables:
```
PYTHON_VERSION=3.9.0
DATABASE_URL=sqlite:///./ppe_compliance.db
ENVIRONMENT=production
SECRET_KEY=<click "Generate" button>
ALLOWED_ORIGINS=https://your-app.vercel.app
DEBUG=false
```

#### Optional (for email OTP - configure later):
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-gmail-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
EMAIL_ENABLED=true
```

### Step 4: Add Persistent Disk

1. In Render dashboard, go to **Disks** tab
2. Click "Add Disk"
3. Configure:
   - **Name**: `ppe-data`
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: 1 GB
4. Save and deploy

### Step 5: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for deployment to complete (5-10 minutes)
3. Your backend URL will be: `https://your-app-name.onrender.com`

**Important**: Copy this URL - you'll need it for the frontend!

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Project

1. Go to https://vercel.com and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 2: Configure Environment Variable

Add this environment variable:

```
NEXT_PUBLIC_API_URL=https://your-backend-name.onrender.com
```

Replace `your-backend-name.onrender.com` with your actual Render backend URL from Part 1.

### Step 3: Deploy

1. Click "Deploy"
2. Wait for deployment (2-5 minutes)
3. Your frontend URL will be: `https://your-app.vercel.app`

---

## Part 3: Update Backend CORS

1. Go back to Render dashboard
2. Go to **Environment** tab
3. Update `ALLOWED_ORIGINS` variable:
```
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-custom-domain.com
```
4. Save and redeploy

---

## Part 4: First Time Setup

### 1. Access Your Application

Open your Vercel URL: `https://your-app.vercel.app`

### 2. Register Super Admin Account

1. Click "Create Admin Account"
2. Enter your email
3. Click "Send OTP"
   - **If email configured**: Check your email for OTP
   - **If email NOT configured**: Check Render logs for dev OTP code
4. Enter OTP and complete registration
5. The first user becomes **Super Admin** automatically

### 3. Configure Email (Optional but Recommended)

To enable email OTP for future registrations:

1. **Create Gmail App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Create app password for "Mail"
   - Copy the 16-character password

2. **Update Render Environment Variables**:
```
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
EMAIL_ENABLED=true
```

3. Save and redeploy backend

---

## Part 5: Accessing on Mobile

Your deployed app works on **any device** with internet!

1. **Open the Vercel URL** on your mobile browser:
   ```
   https://your-app.vercel.app
   ```

2. **Bookmark it** for easy access

3. **Add to Home Screen** (optional):
   - **iOS**: Safari → Share → "Add to Home Screen"
   - **Android**: Chrome → Menu → "Add to Home Screen"

---

## Troubleshooting

### Backend Issues

1. **Check Render Logs**:
   - Go to Render dashboard → your service → "Logs" tab
   - Look for errors

2. **Common Issues**:
   - **Port binding**: Make sure start command uses `$PORT`
   - **Dependencies**: Check all packages in requirements.txt installed
   - **Database**: Ensure disk is mounted correctly

### Frontend Issues

1. **Check Vercel Logs**:
   - Go to Vercel dashboard → your project → "Deployments"
   - Click on latest deployment → "Build Logs"

2. **Common Issues**:
   - **API connection**: Verify `NEXT_PUBLIC_API_URL` is correct
   - **CORS errors**: Check backend `ALLOWED_ORIGINS` includes Vercel URL

### Mobile Access Issues

1. **Can't connect**: Make sure you're using HTTPS URLs (not HTTP)
2. **CORS errors**: Ensure backend CORS allows your frontend domain
3. **Slow loading**: Free tier services sleep after inactivity (first load may be slow)

---

## Important Notes

### Free Tier Limitations

**Render Free Tier**:
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds
- 750 hours/month free

**Vercel Free Tier**:
- 100 GB bandwidth/month
- Unlimited deployments
- Always active (no sleeping)

### Security Recommendations

1. **Never commit sensitive data** to GitHub:
   - `.env` files
   - Secret keys
   - Passwords
   - API keys

2. **Change default credentials** immediately after deployment

3. **Use strong passwords** for all accounts

4. **Enable HTTPS** (automatic on Vercel/Render)

5. **Regular backups**: Download your database periodically from Render

---

## Post-Deployment Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS properly configured
- [ ] Super admin account created
- [ ] Email OTP configured (optional)
- [ ] Tested on mobile device
- [ ] System settings configured
- [ ] Test camera added
- [ ] All features working

---

## Support

If you encounter issues:

1. Check Render and Vercel logs
2. Verify all environment variables are set correctly
3. Ensure CORS configuration includes your frontend URL
4. Test API endpoints directly using the Render URL + `/docs`

---

## URLs Reference

After deployment, save these URLs:

- **Frontend (Vercel)**: `https://_____.vercel.app`
- **Backend (Render)**: `https://_____.onrender.com`
- **API Docs**: `https://_____.onrender.com/docs`

---

**Congratulations!** Your PPE Compliance System is now deployed and accessible from anywhere, including mobile devices! 🎉
