# PPE Compliance System

A comprehensive web-based Personal Protective Equipment (PPE) compliance monitoring system with real-time detection using YOLOv8.

## Features

- **Real-time PPE Detection**: Detects hardhats and safety vests using YOLOv8
- **Multi-Camera Support**: Monitor multiple camera feeds simultaneously
- **Role-Based Access Control**: Admin and Safety Manager roles
- **Live Video Streaming**: WebSocket-based real-time video streaming
- **Analytics Dashboard**: Compliance rates, violation tracking, and statistics
- **Alert System**: Real-time alerts for PPE violations
- **Report Generation**: Export reports in PDF and CSV formats
- **100% Free**: No subscription costs using free-tier technologies

## Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **SQLite** - Lightweight database (no external dependencies)
- **YOLOv8** - State-of-the-art object detection
- **WebSocket** - Real-time bidirectional communication
- **JWT** - Secure authentication

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible UI components
- **Zustand** - Lightweight state management
- **Socket.IO Client** - Real-time WebSocket client

### Deployment
- **Backend**: Your workstation (free, GPU accelerated)
- **Frontend**: Vercel (free tier)
- **Tunnel**: Cloudflare Tunnel (free)

## Prerequisites

- **Python 3.9+** (with pip)
- **Node.js 18+** (with npm)
- **GPU** (NVIDIA with CUDA support recommended for faster inference)
- **Git**

## Installation

### 1. Clone or Navigate to Project

```bash
cd "c:\Users\ubald\Downloads\SMART SAFETY PROJECT\ppe-compliance-system"
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Edit .env and update MODEL_PATH if needed
# Default points to: ../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
```

### 3. Frontend Setup

```bash
# Open new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env.local file
copy .env.local.example .env.local

# Edit .env.local if needed (default should work for local development)
```

## Running the Application

### Start Backend

```bash
# From backend directory (with venv activated)
python run.py
```

The backend will start on `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

**Default Admin Credentials:**
- Email: `admin@example.com`
- Password: `admin123`
- **IMPORTANT**: Change this password after first login!

### Start Frontend

```bash
# From frontend directory (new terminal)
npm run dev
```

The frontend will start on `http://localhost:3000`

## Usage

### First Time Setup

1. **Login as Admin**
   - Go to `http://localhost:3000/login`
   - Use default credentials (see above)
   - Change password immediately

2. **Add Cameras**
   - Navigate to Admin Dashboard
   - Click "Cameras" → "Add New Camera"
   - For webcam, use stream_url: `0`
   - For video file, use full path to video

3. **Create Users**
   - Navigate to "Users" section
   - Add Safety Managers with appropriate credentials

4. **Start Monitoring**
   - Navigate to Safety Manager Dashboard
   - Select a camera to start live monitoring
   - View real-time detections and compliance status

### User Roles

**Admin:**
- Full system access
- User management (CRUD)
- Camera management (CRUD)
- View all analytics and reports
- System configuration

**Safety Manager:**
- View live camera feeds
- Monitor real-time detections
- View analytics and statistics
- Acknowledge alerts
- Generate and export reports
- Cannot manage users or system settings

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users/` - Get all users
- `POST /api/users/` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Cameras
- `GET /api/cameras/` - Get all cameras
- `POST /api/cameras/` - Create camera (Admin)
- `PUT /api/cameras/{id}` - Update camera (Admin)
- `DELETE /api/cameras/{id}` - Delete camera (Admin)

### Detections
- `GET /api/detections/` - Get detection history
- `GET /api/detections/stats/summary` - Get statistics

### WebSocket
- `WS /ws/stream/{camera_id}` - Real-time video stream

## Database Schema

The system uses SQLite with the following tables:
- `users` - User accounts and authentication
- `cameras` - Camera configurations
- `detection_events` - Detection history
- `alerts` - Safety violation alerts
- `reports` - Generated reports

## YOLO Model

The system uses your pre-trained YOLOv8 model with 5 classes:
1. **Hardhat** - Person wearing hardhat
2. **No-Hardhat** - Person without hardhat
3. **Safety Vest** - Person wearing safety vest
4. **No-Safety Vest** - Person without safety vest
5. **Person** - Person detection

**Compliance Logic:**
- ✅ **Compliant**: Hardhat detected AND Safety Vest detected
- ❌ **Non-Compliant**: Missing either hardhat or safety vest

## Deployment to Cloud (Free)

### Backend (Cloudflare Tunnel)

1. **Install Cloudflare Tunnel**
   ```bash
   # Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   ```

2. **Setup Tunnel**
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create ppe-backend
   cloudflared tunnel route dns ppe-backend ppe-backend.yourdomain.com
   ```

3. **Create config.yml**
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: /path/to/credentials.json

   ingress:
     - hostname: ppe-backend.yourdomain.com
       service: http://localhost:8000
     - service: http_status:404
   ```

4. **Run tunnel**
   ```bash
   cloudflared tunnel run ppe-backend
   ```

### Frontend (Vercel)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd frontend
   vercel
   ```

3. **Update Environment Variables**
   - In Vercel dashboard, set:
     - `NEXT_PUBLIC_API_URL=https://ppe-backend.yourdomain.com`
     - `NEXT_PUBLIC_WS_URL=wss://ppe-backend.yourdomain.com`

## Troubleshooting

### Backend Issues

**Model not loading:**
- Check `MODEL_PATH` in `.env`
- Ensure path points to `best.pt` file
- Use absolute path if relative path fails

**CUDA errors:**
- Ensure CUDA is installed for GPU support
- Install PyTorch with CUDA: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`

**Database errors:**
- Delete `ppe_compliance.db` and restart backend
- Database will be recreated automatically

### Frontend Issues

**Connection refused:**
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

**WebSocket not connecting:**
- Check `NEXT_PUBLIC_WS_URL` in `.env.local`
- Ensure WebSocket endpoint is not blocked by firewall

## Performance Optimization

### GPU Acceleration
- Install CUDA-enabled PyTorch for faster inference
- Model will automatically use GPU if available

### Frame Rate
- Adjust `VIDEO_STREAM_FPS` in backend `.env`
- Lower FPS reduces bandwidth and CPU usage

### Confidence Threshold
- Adjust `CONFIDENCE_THRESHOLD` in backend `.env`
- Higher values = fewer false positives

## Security Notes

1. **Change default admin password immediately**
2. **Use strong JWT secret key** in production (`.env`)
3. **Enable HTTPS** for production deployment
4. **Restrict CORS origins** in production
5. **Regular backups** of SQLite database

## License

This project is for educational and safety monitoring purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API docs at `http://localhost:8000/docs`
3. Check backend logs for errors

## Credits

- YOLOv8 by Ultralytics
- UI Components by shadcn/ui
- Icons by Lucide
