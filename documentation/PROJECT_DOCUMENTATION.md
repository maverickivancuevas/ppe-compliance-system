# Smart Safety Project - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Core Components](#core-components)
6. [Features](#features)
7. [Installation Guide](#installation-guide)
8. [Configuration](#configuration)
9. [Usage Guide](#usage-guide)
10. [API Documentation](#api-documentation)
11. [Database Schema](#database-schema)
12. [Machine Learning Model](#machine-learning-model)
13. [Security](#security)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)
16. [Future Enhancements](#future-enhancements)

---

## Project Overview

### Purpose
The Smart Safety Project is a comprehensive Personal Protective Equipment (PPE) compliance monitoring system that uses artificial intelligence to detect whether workers are wearing proper safety equipment (hardhats and safety vests) in real-time.

### Goals
- Enhance workplace safety through automated PPE compliance monitoring
- Provide real-time alerts for safety violations
- Generate comprehensive compliance reports and analytics
- Support multiple camera feeds for large-scale monitoring
- Offer a user-friendly interface for safety managers and administrators

### Key Capabilities
- **Real-time Detection**: YOLOv8-based object detection for hardhat and safety vest identification
- **Multi-Camera Support**: Monitor multiple locations simultaneously
- **Role-Based Access**: Separate interfaces for administrators and safety managers
- **Analytics Dashboard**: Track compliance rates, violations, and trends
- **Alert System**: Instant notifications for PPE violations
- **Report Generation**: Export detailed reports in PDF and CSV formats
- **100% Free Deployment**: Utilizes free-tier cloud services

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Admin Panel │  │ Safety Mgr   │  │  Analytics   │  │
│  │              │  │  Dashboard   │  │  Dashboard   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ REST API     │  │  WebSocket   │  │     Auth     │  │
│  │  Endpoints   │  │   Manager    │  │   (JWT)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    YOLO      │  │   Detection  │  │   Report     │  │
│  │   Service    │  │   Processor  │  │  Generator   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Database (SQLite) & ML Model               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Users      │  │   Cameras    │  │  Detections  │  │
│  │   Alerts     │  │   Reports    │  │  YOLOv8 Model│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│              Camera Sources (Video/Webcam)              │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Authentication Flow**:
   - User logs in via frontend
   - Backend validates credentials
   - JWT token issued
   - Token used for subsequent requests

2. **Video Stream Flow**:
   - Safety Manager selects camera
   - WebSocket connection established
   - Backend captures video frames
   - YOLO model processes each frame
   - Detections sent back to frontend in real-time
   - Detection events saved to database

3. **Alert Flow**:
   - Detection processor identifies PPE violation
   - Alert created in database
   - Real-time notification sent via WebSocket
   - Alert displayed in frontend dashboard

---

## Technology Stack

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.9+ | Core programming language |
| FastAPI | 0.109.0 | High-performance web framework |
| Uvicorn | 0.27.0 | ASGI server |
| SQLAlchemy | 2.0.25 | ORM for database operations |
| SQLite | 3.x | Lightweight embedded database |
| Alembic | 1.13.1 | Database migration tool |
| YOLOv8 (Ultralytics) | 8.1.0 | Object detection model |
| OpenCV | 4.9.0.80 | Computer vision library |
| PyTorch | 2.1.2 | Deep learning framework |
| python-jose | 3.3.0 | JWT token handling |
| passlib | 1.7.4 | Password hashing |
| ReportLab | 4.0.9 | PDF generation |
| Pandas | 2.1.4 | Data manipulation for reports |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.1.0 | React framework with App Router |
| React | 18.2.0 | UI library |
| TypeScript | 5.3.3 | Type-safe JavaScript |
| Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| shadcn/ui | Latest | Pre-built UI components |
| Zustand | 4.5.0 | State management |
| Axios | 1.6.5 | HTTP client |
| Socket.IO Client | 4.6.1 | WebSocket client |
| Recharts | 2.10.4 | Chart components |
| date-fns | 3.3.1 | Date manipulation |

### Development Tools

- **Git**: Version control
- **Node.js**: JavaScript runtime
- **npm**: Package manager
- **pip**: Python package manager
- **Python venv**: Virtual environment

### Deployment Technologies

- **Backend Hosting**: Local workstation with GPU
- **Frontend Hosting**: Vercel (free tier)
- **Tunnel Service**: Cloudflare Tunnel (free)
- **Database**: SQLite (file-based)

---

## Project Structure

### Root Directory Structure

```
SMART SAFETY PROJECT/
├── ppe-compliance-system/        # Main web application
│   ├── backend/                  # FastAPI backend
│   ├── frontend/                 # Next.js frontend
│   └── documentation files       # Various MD files
├── SMART SAFETY PROJECT/         # Original demo application
│   ├── DATASETS/                 # Training datasets
│   ├── TRAINED MODEL RESULT/     # YOLOv8 trained model
│   ├── EVALUATION RESULT/        # Model evaluation results
│   ├── DEMO SOURCE CODE.py       # Standalone demo app
│   ├── EVALUATION SOURCE CODE.py # Model evaluation script
│   ├── safety_logo.png          # Application logo
│   ├── SMART SAFETY PAPER.pdf   # Research paper
│   └── SMART SAFETY PPT.pdf     # Presentation
└── PROJECT_DOCUMENTATION.md      # This file
```

### Backend Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── cameras.py       # Camera management endpoints
│   │   │   ├── detections.py    # Detection history endpoints
│   │   │   ├── monitor.py       # Monitoring endpoints
│   │   │   └── users.py         # User management endpoints
│   │   ├── websocket.py         # WebSocket connection manager
│   │   └── __init__.py
│   ├── core/
│   │   ├── config.py            # Application configuration
│   │   ├── database.py          # Database connection & setup
│   │   ├── exceptions.py        # Custom exceptions
│   │   ├── logger.py            # Logging configuration
│   │   ├── security.py          # JWT & password handling
│   │   ├── validation.py        # Input validation
│   │   └── __init__.py
│   ├── models/
│   │   ├── user.py              # User database model
│   │   ├── camera.py            # Camera database model
│   │   ├── detection.py         # Detection database model
│   │   ├── alert.py             # Alert database model
│   │   ├── report.py            # Report database model
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── user.py              # User Pydantic schemas
│   │   ├── camera.py            # Camera Pydantic schemas
│   │   ├── detection.py         # Detection Pydantic schemas
│   │   └── __init__.py
│   ├── services/
│   │   ├── detector.py          # Detection processing service
│   │   ├── yolo_service.py      # YOLO model service
│   │   └── __init__.py
│   ├── main.py                  # FastAPI application entry
│   └── __init__.py
├── venv/                        # Virtual environment
├── requirements.txt             # Python dependencies
├── run.py                       # Application runner script
├── .env.example                 # Environment variables template
└── .env                         # Environment variables (local)
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── cameras/
│   │   │   │   └── page.tsx     # Camera management page
│   │   │   ├── users/
│   │   │   │   └── page.tsx     # User management page
│   │   │   ├── settings/
│   │   │   │   └── page.tsx     # Settings page
│   │   │   └── page.tsx         # Admin dashboard
│   │   ├── safety-manager/
│   │   │   ├── monitor/
│   │   │   │   ├── [cameraId]/
│   │   │   │   │   └── page.tsx # Live monitoring page
│   │   │   │   └── page.tsx     # Camera selection
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx     # Analytics dashboard
│   │   │   ├── alerts/
│   │   │   │   └── page.tsx     # Alerts management
│   │   │   ├── detections/
│   │   │   │   └── page.tsx     # Detection history
│   │   │   ├── reports/
│   │   │   │   └── page.tsx     # Report generation
│   │   │   └── page.tsx         # Safety manager dashboard
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   ├── profile/
│   │   │   └── page.tsx         # User profile page
│   │   ├── notifications/
│   │   │   └── page.tsx         # Notifications page
│   │   ├── help/
│   │   │   └── page.tsx         # Help & documentation
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Home page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx  # Main layout wrapper
│   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   └── PageHeader.tsx       # Page header component
│   │   └── ui/                      # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── table.tsx
│   ├── lib/
│   │   ├── api.ts               # API client configuration
│   │   └── utils.ts             # Utility functions
│   ├── store/
│   │   └── authStore.ts         # Authentication state
│   └── types/
│       └── index.ts             # TypeScript type definitions
├── public/                      # Static assets
├── node_modules/                # Node dependencies
├── package.json                 # Node dependencies manifest
├── tsconfig.json               # TypeScript configuration
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
├── .env.local.example          # Environment variables template
└── .env.local                  # Environment variables (local)
```

---

## Core Components

### 1. Authentication System

**Location**: `backend/app/api/routes/auth.py`, `backend/app/core/security.py`

**Features**:
- JWT-based authentication
- Password hashing with bcrypt
- Token expiration (24 hours default)
- Role-based access control (Admin, Safety Manager)

**Key Functions**:
- `create_access_token()`: Generate JWT tokens
- `verify_password()`: Verify user passwords
- `get_password_hash()`: Hash passwords
- `get_current_user()`: Extract user from JWT

### 2. YOLO Detection Service

**Location**: `backend/app/services/yolo_service.py`, `backend/app/services/detector.py`

**Features**:
- YOLOv8 model loading and inference
- Real-time video frame processing
- PPE compliance detection logic
- GPU acceleration support

**Detection Classes**:
1. Hardhat (compliant)
2. No-Hardhat (violation)
3. Safety Vest (compliant)
4. No-Safety Vest (violation)
5. Person (tracking)

**Compliance Logic**:
- **Compliant**: Hardhat detected AND Safety Vest detected
- **Non-Compliant**: Missing either hardhat or safety vest

### 3. WebSocket Stream Manager

**Location**: `backend/app/api/websocket.py`

**Features**:
- Manages multiple concurrent WebSocket connections
- Handles video frame streaming
- Broadcasts detection results in real-time
- Connection lifecycle management

**Key Methods**:
- `connect()`: Establish WebSocket connection
- `disconnect()`: Close connection
- `send_frame()`: Send video frame to client
- `broadcast()`: Send data to all connected clients

### 4. Database Models

**Location**: `backend/app/models/`

**Models**:

#### User Model (`user.py`)
```python
- id: Integer (Primary Key)
- email: String (Unique)
- full_name: String
- hashed_password: String
- role: Enum (ADMIN, SAFETY_MANAGER)
- is_active: Boolean
- created_at: DateTime
```

#### Camera Model (`camera.py`)
```python
- id: Integer (Primary Key)
- name: String
- location: String
- stream_url: String
- is_active: Boolean
- created_at: DateTime
```

#### Detection Model (`detection.py`)
```python
- id: Integer (Primary Key)
- camera_id: Integer (Foreign Key)
- timestamp: DateTime
- person_count: Integer
- compliant_count: Integer
- non_compliant_count: Integer
- has_hardhat: Boolean
- has_vest: Boolean
- confidence_score: Float
- frame_data: LargeBinary (optional)
```

#### Alert Model (`alert.py`)
```python
- id: Integer (Primary Key)
- camera_id: Integer (Foreign Key)
- detection_id: Integer (Foreign Key)
- alert_type: String
- severity: Enum (LOW, MEDIUM, HIGH)
- message: String
- is_acknowledged: Boolean
- acknowledged_by: Integer (Foreign Key to User)
- created_at: DateTime
```

#### Report Model (`report.py`)
```python
- id: Integer (Primary Key)
- title: String
- report_type: String
- generated_by: Integer (Foreign Key to User)
- start_date: DateTime
- end_date: DateTime
- file_path: String
- created_at: DateTime
```

### 5. Frontend State Management

**Location**: `frontend/src/store/authStore.ts`

**Features**:
- User authentication state
- JWT token storage
- Auto-logout on token expiration
- Protected route handling

**State**:
- `user`: Current user object
- `token`: JWT access token
- `isAuthenticated`: Boolean flag
- `login()`: Login action
- `logout()`: Logout action

### 6. API Client

**Location**: `frontend/src/lib/api.ts`

**Features**:
- Axios-based HTTP client
- Automatic token injection
- Error handling
- Request/response interceptors

---

## Features

### Admin Features

1. **User Management**
   - Create new users (Admin or Safety Manager roles)
   - Edit user details
   - Deactivate/activate user accounts
   - Reset passwords
   - View user activity logs

2. **Camera Management**
   - Add new cameras
   - Configure camera settings
   - Edit camera details
   - Enable/disable cameras
   - Test camera connections

3. **System Settings**
   - Configure confidence thresholds
   - Set alert parameters
   - Manage system preferences
   - View system health

4. **Full Analytics Access**
   - View all cameras and detections
   - Access complete compliance reports
   - Export system-wide analytics

### Safety Manager Features

1. **Live Monitoring**
   - Select and view camera feeds
   - Real-time PPE detection visualization
   - Live compliance status
   - Person count tracking

2. **Alert Management**
   - View active alerts
   - Acknowledge alerts
   - Filter alerts by severity
   - View alert history

3. **Detection History**
   - Browse past detections
   - Filter by date range
   - Filter by camera
   - Filter by compliance status

4. **Analytics Dashboard**
   - Compliance rate charts
   - Violation trends
   - Camera-wise statistics
   - Time-based analysis

5. **Report Generation**
   - Generate compliance reports
   - Export to PDF format
   - Export to CSV format
   - Scheduled reports (future)

### Common Features

1. **Profile Management**
   - Update personal information
   - Change password
   - View login history

2. **Notifications**
   - Real-time alert notifications
   - System notifications
   - Notification preferences

3. **Help & Documentation**
   - User guides
   - FAQs
   - Troubleshooting tips

---

## Installation Guide

### Prerequisites

**Software Requirements**:
- Python 3.9 or higher
- Node.js 18 or higher
- npm (comes with Node.js)
- Git
- GPU with CUDA support (optional, but recommended)

**Hardware Requirements**:
- CPU: Multi-core processor (Intel i5/AMD Ryzen 5 or better)
- RAM: 8GB minimum, 16GB recommended
- GPU: NVIDIA GPU with 4GB+ VRAM (optional)
- Storage: 10GB free space

### Step 1: Clone or Download Project

```bash
# If using Git
git clone <repository-url>
cd "SMART SAFETY PROJECT"

# Or download and extract the ZIP file
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd "ppe-compliance-system/backend"

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env  # Windows
# or
cp .env.example .env    # Linux/Mac

# Edit .env file and configure settings
notepad .env  # Windows
# or
nano .env     # Linux/Mac
```

**Important .env Configuration**:
```env
# Application
APP_NAME=PPE Compliance System
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Database
DATABASE_URL=sqlite:///./ppe_compliance.db

# Security
SECRET_KEY=your-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Default Admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_NAME=System Administrator

# YOLO Model
MODEL_PATH=../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
CONFIDENCE_THRESHOLD=0.5

# Video Processing
VIDEO_STREAM_FPS=10
FRAME_SKIP=1

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Step 3: Frontend Setup

```bash
# Open new terminal
cd "ppe-compliance-system/frontend"

# Install Node.js dependencies
npm install

# Create environment file
copy .env.local.example .env.local  # Windows
# or
cp .env.local.example .env.local    # Linux/Mac

# Edit .env.local file
notepad .env.local  # Windows
# or
nano .env.local     # Linux/Mac
```

**Important .env.local Configuration**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### Step 4: Verify Model Path

Ensure the YOLO model file exists at:
```
SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
```

If the path is different, update `MODEL_PATH` in backend `.env` file.

### Step 5: Initialize Database

```bash
# Make sure you're in the backend directory with venv activated
python run.py
```

The database will be created automatically on first run.

---

## Configuration

### Backend Configuration Options

**Application Settings**:
- `APP_NAME`: Application name (default: PPE Compliance System)
- `ENVIRONMENT`: Environment mode (development/production)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)
- `DEBUG`: Debug mode (True/False)

**Security Settings**:
- `SECRET_KEY`: JWT signing key (must be changed in production)
- `ALGORITHM`: JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token lifetime (default: 1440 = 24 hours)

**Model Settings**:
- `MODEL_PATH`: Path to YOLOv8 model file
- `CONFIDENCE_THRESHOLD`: Minimum confidence for detections (0.0-1.0)
- `VIDEO_STREAM_FPS`: Frames per second for streaming
- `FRAME_SKIP`: Number of frames to skip between detections

**CORS Settings**:
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

### Frontend Configuration Options

**API Settings**:
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_WS_URL`: Backend WebSocket URL

### Model Configuration

The YOLOv8 model is configured with:
- **Input Size**: 640x640
- **Classes**: 5 (Hardhat, No-Hardhat, No-Safety Vest, Safety Vest, Person)
- **Confidence Threshold**: 0.5 (configurable)
- **IoU Threshold**: 0.45
- **Device**: Auto-detect (CUDA if available, else CPU)

---

## Usage Guide

### First-Time Setup

1. **Start Backend Server**
   ```bash
   # From backend directory (with venv activated)
   python run.py
   ```

   Server will start at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/health`

2. **Start Frontend Development Server**
   ```bash
   # From frontend directory (new terminal)
   npm run dev
   ```

   Frontend will start at `http://localhost:3000`

3. **Login as Admin**
   - Navigate to `http://localhost:3000/login`
   - Email: `admin@example.com`
   - Password: `admin123`
   - **IMPORTANT**: Change this password immediately after first login!

4. **Change Admin Password**
   - Go to Profile page
   - Click "Change Password"
   - Enter new secure password

### Adding Cameras

1. Login as Admin
2. Navigate to **Admin Dashboard** → **Cameras**
3. Click **"Add New Camera"** button
4. Fill in camera details:
   - **Name**: Descriptive name (e.g., "Main Entrance")
   - **Location**: Physical location (e.g., "Building A - Floor 1")
   - **Stream URL**:
     - For webcam: enter `0` (or `1`, `2` for multiple webcams)
     - For video file: enter full path (e.g., `C:\Videos\safety_demo.mp4`)
     - For IP camera: enter RTSP URL (e.g., `rtsp://camera-ip:554/stream`)
5. Click **"Save"**

### Creating Users

1. Login as Admin
2. Navigate to **Admin Dashboard** → **Users**
3. Click **"Add New User"** button
4. Fill in user details:
   - Full Name
   - Email Address
   - Password
   - Role (Admin or Safety Manager)
5. Click **"Create User"**

### Starting Live Monitoring

1. Login as Safety Manager (or Admin)
2. Navigate to **Safety Manager Dashboard** → **Monitor**
3. Select a camera from the list
4. Click **"Start Monitoring"**
5. View real-time video feed with PPE detections
6. Monitor compliance status and person count

**Monitoring Interface Elements**:
- **Live Video Feed**: Shows camera stream with detection boxes
- **Compliance Status**: Real-time safe/unsafe status
- **Detection Count**: Number of people detected
- **Compliant Count**: Number of people wearing proper PPE
- **Violation Count**: Number of people missing PPE
- **Confidence Score**: Model confidence percentage

### Viewing Analytics

1. Navigate to **Safety Manager Dashboard** → **Analytics**
2. View dashboards showing:
   - Overall compliance rate
   - Compliance trends over time
   - Camera-wise statistics
   - Violation breakdown
   - Peak violation times

### Managing Alerts

1. Navigate to **Safety Manager Dashboard** → **Alerts**
2. View active alerts sorted by severity
3. Click on alert to view details
4. Click **"Acknowledge"** to mark as resolved
5. Use filters to view:
   - Active alerts
   - Acknowledged alerts
   - Alerts by severity (High/Medium/Low)
   - Alerts by camera

### Generating Reports

1. Navigate to **Safety Manager Dashboard** → **Reports**
2. Select report parameters:
   - Report Type (Compliance Summary, Detailed Detections, etc.)
   - Date Range (Start Date to End Date)
   - Camera (All or specific camera)
3. Click **"Generate Report"**
4. Choose export format:
   - PDF: Formatted report with charts
   - CSV: Raw data for further analysis
5. Download generated report

---

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user (Admin only).

**Request Body**:
```json
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "password": "SecurePass123",
  "role": "SAFETY_MANAGER"
}
```

**Response**:
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "SAFETY_MANAGER",
  "is_active": true
}
```

#### POST `/api/auth/login`
Login and get access token.

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "full_name": "System Administrator",
    "role": "ADMIN"
  }
}
```

#### GET `/api/auth/me`
Get current user information.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
{
  "id": 1,
  "email": "admin@example.com",
  "full_name": "System Administrator",
  "role": "ADMIN",
  "is_active": true
}
```

### User Management Endpoints (Admin Only)

#### GET `/api/users/`
Get all users.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
[
  {
    "id": 1,
    "email": "admin@example.com",
    "full_name": "System Administrator",
    "role": "ADMIN",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### POST `/api/users/`
Create a new user.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "email": "manager@example.com",
  "full_name": "Safety Manager",
  "password": "SecurePass123",
  "role": "SAFETY_MANAGER"
}
```

#### PUT `/api/users/{user_id}`
Update user details.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "full_name": "Updated Name",
  "is_active": true
}
```

#### DELETE `/api/users/{user_id}`
Delete a user.

**Headers**: `Authorization: Bearer <token>`

### Camera Management Endpoints

#### GET `/api/cameras/`
Get all cameras.

**Headers**: `Authorization: Bearer <token>`

**Response**:
```json
[
  {
    "id": 1,
    "name": "Main Entrance",
    "location": "Building A - Floor 1",
    "stream_url": "0",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00"
  }
]
```

#### POST `/api/cameras/` (Admin Only)
Create a new camera.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Warehouse Camera",
  "location": "Warehouse - Zone B",
  "stream_url": "rtsp://192.168.1.100:554/stream",
  "is_active": true
}
```

#### PUT `/api/cameras/{camera_id}` (Admin Only)
Update camera details.

**Headers**: `Authorization: Bearer <token>`

**Request Body**:
```json
{
  "name": "Updated Camera Name",
  "is_active": false
}
```

#### DELETE `/api/cameras/{camera_id}` (Admin Only)
Delete a camera.

**Headers**: `Authorization: Bearer <token>`

### Detection Endpoints

#### GET `/api/detections/`
Get detection history with pagination and filters.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `camera_id` (optional): Filter by camera
- `start_date` (optional): Filter by start date (ISO format)
- `end_date` (optional): Filter by end date (ISO format)
- `compliant` (optional): Filter by compliance status (true/false)
- `skip` (optional): Pagination offset (default: 0)
- `limit` (optional): Number of results (default: 100)

**Response**:
```json
{
  "total": 250,
  "detections": [
    {
      "id": 1,
      "camera_id": 1,
      "timestamp": "2024-01-01T10:30:00",
      "person_count": 3,
      "compliant_count": 2,
      "non_compliant_count": 1,
      "has_hardhat": true,
      "has_vest": false,
      "confidence_score": 0.87
    }
  ]
}
```

#### GET `/api/detections/stats/summary`
Get detection statistics summary.

**Headers**: `Authorization: Bearer <token>`

**Query Parameters**:
- `camera_id` (optional): Filter by camera
- `start_date` (optional): Start date
- `end_date` (optional): End date

**Response**:
```json
{
  "total_detections": 1000,
  "compliant_count": 850,
  "non_compliant_count": 150,
  "compliance_rate": 85.0,
  "cameras_monitored": 5,
  "active_alerts": 3,
  "time_period": {
    "start": "2024-01-01T00:00:00",
    "end": "2024-01-31T23:59:59"
  }
}
```

### WebSocket Endpoints

#### WS `/ws/stream/{camera_id}`
Real-time video streaming with PPE detection.

**Connection**: WebSocket upgrade request

**Message Format (Server → Client)**:
```json
{
  "type": "frame",
  "camera_id": "1",
  "timestamp": "2024-01-01T10:30:00",
  "frame": "base64_encoded_image_data",
  "detections": [
    {
      "class": "Hardhat",
      "confidence": 0.92,
      "bbox": [100, 150, 250, 400]
    }
  ],
  "person_count": 2,
  "compliant_count": 1,
  "non_compliant_count": 1,
  "is_compliant": false
}
```

---

## Database Schema

### Complete Schema Diagram

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id (PK)            │
│ email              │
│ full_name          │
│ hashed_password    │
│ role               │
│ is_active          │
│ created_at         │
└─────────────────────┘
         │
         │ 1:N
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐
│      cameras        │      │      reports        │
├─────────────────────┤      ├─────────────────────┤
│ id (PK)            │      │ id (PK)            │
│ name               │      │ title              │
│ location           │      │ report_type        │
│ stream_url         │      │ generated_by (FK)  │
│ is_active          │      │ start_date         │
│ created_at         │      │ end_date           │
└─────────────────────┘      │ file_path          │
         │                   │ created_at         │
         │ 1:N               └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   detection_events  │
├─────────────────────┤
│ id (PK)            │
│ camera_id (FK)     │
│ timestamp          │
│ person_count       │
│ compliant_count    │
│ non_compliant_count│
│ has_hardhat        │
│ has_vest           │
│ confidence_score   │
│ frame_data         │
└─────────────────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────────┐
│       alerts        │
├─────────────────────┤
│ id (PK)            │
│ camera_id (FK)     │
│ detection_id (FK)  │
│ alert_type         │
│ severity           │
│ message            │
│ is_acknowledged    │
│ acknowledged_by(FK)│
│ created_at         │
└─────────────────────┘
```

### Table Relationships

1. **users → cameras**: One user (admin) can create multiple cameras
2. **users → reports**: One user can generate multiple reports
3. **users → alerts**: One user can acknowledge multiple alerts
4. **cameras → detection_events**: One camera generates multiple detection events
5. **detection_events → alerts**: One detection can trigger multiple alerts

---

## Machine Learning Model

### YOLOv8 Model Details

**Model Type**: YOLOv8n (nano) - optimized for speed

**Training Configuration**:
- **Framework**: Ultralytics YOLOv8
- **Base Model**: YOLOv8n pre-trained on COCO
- **Input Size**: 640x640 pixels
- **Epochs**: Configured during training (typically 50-100)
- **Batch Size**: Depends on available GPU memory
- **Optimizer**: AdamW
- **Learning Rate**: Auto-adjusted

**Classes** (5 total):

| Class ID | Class Name | Description |
|----------|------------|-------------|
| 0 | Hardhat | Person wearing a hardhat |
| 1 | No-Hardhat | Person without a hardhat |
| 2 | No-Safety Vest | Person without a safety vest |
| 3 | Safety Vest | Person wearing a safety vest |
| 4 | Person | General person detection |

**Model Performance**:
- **mAP50**: Refer to training results
- **Inference Time**: ~10-30ms per frame (with GPU)
- **FPS**: 30-100 (depends on hardware)

### Detection Logic

**Compliance Rules**:
```python
is_compliant = (
    "Hardhat" in detected_classes AND
    "Safety Vest" in detected_classes
)
```

**Violation Detection**:
```python
has_violation = (
    "No-Hardhat" in detected_classes OR
    "No-Safety Vest" in detected_classes
)
```

**Confidence Threshold**:
- Default: 0.5 (50%)
- Adjustable in backend `.env` file
- Higher values = fewer false positives, more false negatives
- Lower values = more detections, but more false positives

### Model Files Location

```
SMART SAFETY PROJECT/
└── TRAINED MODEL RESULT/
    └── weights/
        └── best.pt  # Trained YOLOv8 model weights
```

### Retraining the Model

If you need to retrain the model with additional data:

1. **Prepare Dataset**:
   - Collect and label images
   - Use YOLO annotation format
   - Split into train/val/test sets

2. **Training Script**:
   ```python
   from ultralytics import YOLO

   # Load base model
   model = YOLO('yolov8n.pt')

   # Train
   results = model.train(
       data='data.yaml',
       epochs=100,
       imgsz=640,
       batch=16,
       name='ppe_detection'
   )
   ```

3. **Update Model Path**:
   - Place new `best.pt` file in appropriate location
   - Update `MODEL_PATH` in backend `.env`

---

## Security

### Authentication & Authorization

**JWT Token Security**:
- Tokens signed with SECRET_KEY
- HS256 algorithm
- 24-hour expiration (default)
- Token stored in browser localStorage
- Sent via Authorization header

**Password Security**:
- Passwords hashed using bcrypt
- Salt rounds: 12 (default)
- Never stored in plain text
- Never transmitted in logs

**Role-Based Access Control**:
- **Admin**: Full system access
- **Safety Manager**: Monitoring and reporting only
- Enforced at API endpoint level
- Validated on every request

### Security Best Practices

1. **Change Default Credentials**:
   ```
   Default Admin: admin@example.com / admin123
   → Change immediately after first login!
   ```

2. **Use Strong SECRET_KEY**:
   ```bash
   # Generate strong secret key
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

3. **Enable HTTPS in Production**:
   - Use SSL/TLS certificates
   - Redirect HTTP to HTTPS
   - Update CORS settings

4. **Restrict CORS Origins**:
   ```env
   # Production .env
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

5. **Regular Updates**:
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

6. **Database Security**:
   - Set proper file permissions
   - Regular backups
   - Encrypt sensitive data

7. **Rate Limiting** (Future Enhancement):
   - Implement API rate limiting
   - Prevent brute force attacks

### Common Security Vulnerabilities Mitigated

- ✅ SQL Injection: Using SQLAlchemy ORM
- ✅ XSS: React automatic escaping
- ✅ CSRF: Token-based authentication
- ✅ Password Storage: Bcrypt hashing
- ✅ Session Management: JWT with expiration

---

## Deployment

### Local Development Deployment

Already covered in Installation Guide.

### Production Deployment Options

#### Option 1: Self-Hosted (Free)

**Backend on Local Server with Cloudflare Tunnel**:

1. **Install Cloudflare Tunnel**:
   ```bash
   # Download from Cloudflare
   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
   ```

2. **Authenticate**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create Tunnel**:
   ```bash
   cloudflared tunnel create ppe-backend
   ```

4. **Configure Tunnel**:
   Create `config.yml`:
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: /path/to/credentials.json

   ingress:
     - hostname: ppe-backend.yourdomain.com
       service: http://localhost:8000
     - service: http_status:404
   ```

5. **Run Tunnel**:
   ```bash
   cloudflared tunnel run ppe-backend
   ```

6. **Run as Service** (Windows):
   ```bash
   cloudflared service install
   ```

**Frontend on Vercel (Free)**:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd frontend
   vercel
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   NEXT_PUBLIC_API_URL=https://ppe-backend.yourdomain.com
   NEXT_PUBLIC_WS_URL=wss://ppe-backend.yourdomain.com
   ```

#### Option 2: Cloud Deployment (Paid)

**Backend on AWS EC2 / Google Cloud / Azure**:
- Deploy FastAPI with Uvicorn
- Use systemd service for auto-restart
- Configure Nginx as reverse proxy
- Use PostgreSQL instead of SQLite

**Frontend on Vercel / Netlify / AWS Amplify**:
- Connect GitHub repository
- Automatic deployments on push
- Environment variables in dashboard

### Deployment Checklist

- [ ] Change default admin password
- [ ] Generate strong SECRET_KEY
- [ ] Update ALLOWED_ORIGINS in backend
- [ ] Enable HTTPS
- [ ] Set up regular database backups
- [ ] Configure monitoring and logging
- [ ] Test all features in production
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Configure firewall rules
- [ ] Set up domain and DNS
- [ ] Test WebSocket connections
- [ ] Verify model file accessibility
- [ ] Set up automated restarts

---

## Troubleshooting

### Backend Issues

#### Issue: Model Not Loading

**Symptoms**:
```
FileNotFoundError: [Errno 2] No such file or directory: 'path/to/best.pt'
```

**Solutions**:
1. Check MODEL_PATH in `.env` file
2. Verify `best.pt` file exists at specified path
3. Use absolute path instead of relative path:
   ```env
   MODEL_PATH=C:/Full/Path/To/best.pt
   ```
4. Check file permissions

#### Issue: CUDA Errors

**Symptoms**:
```
RuntimeError: CUDA out of memory
RuntimeError: CUDA error: no kernel image available
```

**Solutions**:
1. Reduce batch size or FPS
2. Install correct CUDA version:
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   ```
3. Check GPU compatibility
4. Force CPU mode in code if needed

#### Issue: Database Errors

**Symptoms**:
```
sqlite3.OperationalError: database is locked
sqlalchemy.exc.IntegrityError
```

**Solutions**:
1. Close all connections to database
2. Delete `ppe_compliance.db` and restart (will recreate)
3. Check file permissions
4. Ensure only one backend instance is running

#### Issue: Port Already in Use

**Symptoms**:
```
OSError: [WinError 10048] Only one usage of each socket address is allowed
```

**Solutions**:
1. Change PORT in `.env` file
2. Kill process using port 8000:
   ```bash
   # Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F

   # Linux
   lsof -i :8000
   kill -9 <PID>
   ```

### Frontend Issues

#### Issue: Connection Refused

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**Solutions**:
1. Ensure backend is running
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Verify firewall settings
4. Try http://localhost:8000 instead of 127.0.0.1

#### Issue: WebSocket Not Connecting

**Symptoms**:
- Video feed not loading
- "Connection failed" error

**Solutions**:
1. Check `NEXT_PUBLIC_WS_URL` in `.env.local`
2. Ensure WebSocket not blocked by firewall
3. Try `ws://localhost:8000` instead of `ws://127.0.0.1:8000`
4. Check browser console for errors
5. Verify backend WebSocket endpoint is accessible

#### Issue: Build Errors

**Symptoms**:
```
Error: Failed to compile
Module not found
```

**Solutions**:
1. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run dev
   ```
3. Update dependencies:
   ```bash
   npm update
   ```

### Common Issues

#### Issue: Low Detection Accuracy

**Solutions**:
1. Increase CONFIDENCE_THRESHOLD in backend `.env`
2. Improve lighting conditions
3. Ensure camera angle shows workers clearly
4. Consider retraining model with more data

#### Issue: High CPU/GPU Usage

**Solutions**:
1. Reduce VIDEO_STREAM_FPS in backend `.env`
2. Increase FRAME_SKIP value
3. Lower video resolution
4. Close unnecessary applications
5. Upgrade hardware if needed

#### Issue: Slow Performance

**Solutions**:
1. Enable GPU acceleration
2. Reduce number of concurrent streams
3. Lower video quality settings
4. Optimize database queries
5. Add indexes to database

---

## Future Enhancements

### Planned Features

#### Phase 1: Core Improvements
- [ ] Email/SMS alert notifications
- [ ] Scheduled report generation
- [ ] Advanced analytics with ML insights
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Mobile responsive design improvements

#### Phase 2: Advanced Features
- [ ] Facial recognition for worker identification
- [ ] Integration with access control systems
- [ ] Automated incident report generation
- [ ] Predictive analytics for safety trends
- [ ] Geofencing for location-based monitoring
- [ ] Integration with third-party safety systems

#### Phase 3: Enterprise Features
- [ ] Multi-tenant support
- [ ] Advanced role management (custom roles)
- [ ] API rate limiting
- [ ] Advanced audit logging
- [ ] Data retention policies
- [ ] GDPR compliance tools
- [ ] SSO (Single Sign-On) integration
- [ ] Active Directory integration

#### Phase 4: AI Enhancements
- [ ] Detection of additional PPE (gloves, goggles, boots)
- [ ] Behavior analysis (unsafe actions)
- [ ] Anomaly detection
- [ ] Automatic incident severity classification
- [ ] Predictive maintenance for cameras
- [ ] Voice alerts and commands

### Technical Improvements

#### Backend
- [ ] Migrate to PostgreSQL for better performance
- [ ] Implement caching (Redis)
- [ ] Add API versioning
- [ ] Implement rate limiting
- [ ] Add comprehensive unit tests
- [ ] Set up CI/CD pipeline
- [ ] Implement message queue (Celery/RabbitMQ)
- [ ] Add health monitoring (Prometheus/Grafana)

#### Frontend
- [ ] Progressive Web App (PWA) support
- [ ] Offline mode
- [ ] Service worker for caching
- [ ] Improved error boundaries
- [ ] Component testing (Jest/React Testing Library)
- [ ] E2E testing (Playwright/Cypress)
- [ ] Performance optimization (code splitting)
- [ ] Accessibility improvements (WCAG compliance)

#### DevOps
- [ ] Docker containerization
- [ ] Kubernetes orchestration
- [ ] Automated backups
- [ ] Load balancing
- [ ] CDN integration
- [ ] Monitoring and alerting
- [ ] Log aggregation (ELK stack)
- [ ] Infrastructure as Code (Terraform)

### Model Improvements
- [ ] Support for multiple YOLO versions
- [ ] Model A/B testing framework
- [ ] Automatic model retraining pipeline
- [ ] Transfer learning for custom PPE
- [ ] Edge deployment (TensorFlow Lite)
- [ ] Model compression and optimization

---

## Appendix

### A. Glossary

**Terms**:
- **PPE**: Personal Protective Equipment
- **YOLOv8**: You Only Look Once version 8 - object detection algorithm
- **JWT**: JSON Web Token - authentication standard
- **WebSocket**: Protocol for real-time bidirectional communication
- **CUDA**: Compute Unified Device Architecture - NVIDIA's parallel computing platform
- **mAP**: Mean Average Precision - metric for object detection accuracy
- **FPS**: Frames Per Second
- **CORS**: Cross-Origin Resource Sharing
- **ORM**: Object-Relational Mapping
- **ASGI**: Asynchronous Server Gateway Interface

### B. File Locations Quick Reference

**Configuration Files**:
- Backend env: `ppe-compliance-system/backend/.env`
- Frontend env: `ppe-compliance-system/frontend/.env.local`
- Model file: `SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt`
- Database: `ppe-compliance-system/backend/ppe_compliance.db`

**Log Files**:
- Backend logs: Console output
- Frontend logs: Browser console

**Backup Locations**:
- Database: Manual backup recommended
- Reports: `ppe-compliance-system/backend/reports/`

### C. Default Ports

| Service | Port | Protocol |
|---------|------|----------|
| Backend API | 8000 | HTTP |
| Backend WebSocket | 8000 | WS |
| Frontend Dev | 3000 | HTTP |
| Frontend Prod | 80/443 | HTTP/HTTPS |

### D. Environment Variables Reference

**Backend `.env`**:
```env
# Application
APP_NAME=PPE Compliance System
APP_VERSION=1.0.0
ENVIRONMENT=development
HOST=0.0.0.0
PORT=8000
DEBUG=True

# Database
DATABASE_URL=sqlite:///./ppe_compliance.db

# Security
SECRET_KEY=your-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Default Admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_NAME=System Administrator

# Model
MODEL_PATH=../../SMART SAFETY PROJECT/TRAINED MODEL RESULT/weights/best.pt
CONFIDENCE_THRESHOLD=0.5

# Video Processing
VIDEO_STREAM_FPS=10
FRAME_SKIP=1

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**Frontend `.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

### E. API Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Request successful, no content to return |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation error |
| 500 | Internal Server Error | Server error occurred |
| 503 | Service Unavailable | Service temporarily unavailable |

### F. Database Backup Commands

**Backup SQLite Database**:
```bash
# Manual backup
cp ppe_compliance.db ppe_compliance_backup_$(date +%Y%m%d_%H%M%S).db

# Or using SQLite command
sqlite3 ppe_compliance.db ".backup 'backup.db'"
```

**Restore from Backup**:
```bash
# Replace current database
cp backup.db ppe_compliance.db

# Or using SQLite command
sqlite3 ppe_compliance.db ".restore 'backup.db'"
```

### G. Useful Commands

**Check Python Version**:
```bash
python --version
```

**Check Node Version**:
```bash
node --version
npm --version
```

**Check CUDA Availability**:
```python
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"CUDA Version: {torch.version.cuda}")
```

**Check Backend Status**:
```bash
curl http://localhost:8000/health
```

**View Backend Logs**:
```bash
# If running with output redirect
tail -f backend.log
```

**Check Port Usage**:
```bash
# Windows
netstat -ano | findstr :8000

# Linux/Mac
lsof -i :8000
```

---

## Support & Contact

### Getting Help

1. **Check Documentation**: Review this comprehensive guide
2. **API Documentation**: Visit `http://localhost:8000/docs`
3. **GitHub Issues**: Report bugs or request features
4. **Email Support**: Contact your system administrator

### Contributing

If you'd like to contribute to the project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
5. Follow coding standards

### License

This project is for educational and workplace safety purposes.

---

## Changelog

### Version 1.0.0 (Initial Release)
- Complete backend API with FastAPI
- Next.js frontend with TypeScript
- YOLOv8 integration for PPE detection
- Real-time video streaming via WebSocket
- User authentication and authorization
- Camera management
- Detection history and analytics
- Alert system
- Report generation (PDF/CSV)
- Admin and Safety Manager dashboards

---

**Document Version**: 1.0.0
**Last Updated**: October 2024
**Author**: Smart Safety Project Team

---

*For the latest updates and information, please refer to the project repository and official documentation.*
