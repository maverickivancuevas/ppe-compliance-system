# Demo Videos Directory

This directory contains MP4 video files used for demonstration and testing purposes.

## Current Demo Files

- **construction-demo.mp4** (8.1MB) - Construction site PPE compliance demo video

## How to Use MP4 Files as Camera Sources

### Option 1: Use Absolute Path (Local Development)
When creating a camera in the admin panel, use the full path:
```
D:/Ppe Compliance Project/SMART SAFETY PROJECT/ppe-compliance-system/backend/demo_videos/construction-demo.mp4
```

### Option 2: Use Relative Path (Works on Render)
```
demo_videos/construction-demo.mp4
```

### Option 3: Use Environment Variable Path
The backend will automatically look for videos in the `demo_videos/` directory relative to the backend root.

## Features

- **Auto-Loop**: MP4 videos will automatically loop when they reach the end
- **Full Detection**: All YOLO detection and tracking works on MP4 videos
- **Real-time Processing**: Videos are processed frame-by-frame just like live cameras

## For Render Deployment

1. **Small files (<100MB)**: Commit to git (already set up in .gitignore to exclude large files)
2. **Large files**: Use Render's persistent disk or external storage (S3, Cloudinary)
3. **Current file (8.1MB)**: Can be committed to git safely

## Adding New Demo Videos

1. Place MP4 files in this directory
2. Name them descriptively (e.g., `safety-vest-demo.mp4`)
3. Files under 100MB can be committed to git
4. Files over 100MB should use Git LFS or external storage

## Example Camera Configuration

**Via Admin UI:**
- Name: "Construction Demo"
- Location: "Demo Site"
- Stream URL: `demo_videos/construction-demo.mp4`
- Status: Active

**Via API:**
```python
{
    "name": "Construction Demo",
    "location": "Demo Site",
    "stream_url": "demo_videos/construction-demo.mp4",
    "status": "active"
}
```

## Troubleshooting

- **Video not found**: Ensure path is correct relative to backend root
- **Video not looping**: Check websocket.py has loop support enabled
- **Detection not working**: Verify video codec is compatible with OpenCV (H.264 recommended)

## Supported Video Formats

- ✅ .mp4 (H.264 codec recommended)
- ✅ .avi
- ✅ .mov
- ✅ .mkv
- ✅ Any format supported by OpenCV VideoCapture
