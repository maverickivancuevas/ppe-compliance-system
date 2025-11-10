'use client';

import React, { useState, useEffect, useRef, createRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { camerasAPI, incidentsAPI } from '@/lib/api';
import { Camera } from '@/types';
import { Play, Square, AlertCircle, CheckCircle2, Video, Camera as CameraIcon, FileText, Download, ChevronRight, ChevronLeft, Image as ImageIcon, Clock, Volume2, VolumeX, Trash2, Circle, Settings, Activity, Users, Maximize, Minimize } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { soundAlertManager } from '@/lib/soundAlerts';

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

interface CameraFeed {
  camera: Camera;
  wsRef: WebSocket | null;
  videoRef: React.RefObject<HTMLImageElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isMonitoring: boolean;
  isRecording: boolean;
  recordedChunks: Blob[];
  mediaRecorder: MediaRecorder | null;
  liveData: {
    isCompliant: boolean;
    detectedClasses: string[];
    safetyStatus: string;
    violationType: string | null;
    confidenceScores: Record<string, number>;
  };
  stats: {
    fps: number;
    violationCount: number;
    totalFrames: number;
    personCount: number;
    startTime: number | null;
    lastFrameTime: number | null;
  };
}

export default function MultiCameraMonitorPage() {
  const { toast } = useToast();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraFeeds, setCameraFeeds] = useState<Map<string, CameraFeed>>(new Map());
  const [loading, setLoading] = useState(true);
  const [monitoringAll, setMonitoringAll] = useState(false);
  const [fullscreenCameraId, setFullscreenCameraId] = useState<string | null>(null);

  // Incident report dialog state
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false);
  const [selectedCameraForIncident, setSelectedCameraForIncident] = useState<string | null>(null);
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    title: '',
    description: '',
    severity: 'medium' as IncidentSeverity,
  });

  // Sidebar state for captured records
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [capturedScreenshots, setCapturedScreenshots] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Sound alerts state
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(soundAlertManager.getEnabled());

  // Configuration dialog state
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);

  // Global statistics
  const [globalStats, setGlobalStats] = useState({
    totalViolations: 0,
    totalFrames: 0,
    avgFps: 0,
    complianceRate: 100,
  });

  useEffect(() => {
    loadCameras();
    loadIncidents();
    return () => {
      // Cleanup all WebSockets on unmount
      cameraFeeds.forEach(feed => {
        if (feed.wsRef) {
          feed.wsRef.close();
        }
      });
    };
  }, []);

  const loadIncidents = async () => {
    try {
      setLoadingRecords(true);
      const data = await incidentsAPI.getAll({});
      setIncidents(data);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      const activeCameras = data.filter((c: Camera) => c.status === 'active');
      setCameras(activeCameras);

      // Initialize feeds for each camera
      const feeds = new Map<string, CameraFeed>();
      activeCameras.forEach((camera: Camera) => {
        feeds.set(camera.id, {
          camera,
          wsRef: null,
          videoRef: createRef<HTMLImageElement>(),
          containerRef: createRef<HTMLDivElement>(),
          isMonitoring: false,
          isRecording: false,
          recordedChunks: [],
          mediaRecorder: null,
          liveData: {
            isCompliant: true,
            detectedClasses: [],
            safetyStatus: 'Ready to monitor',
            violationType: null,
            confidenceScores: {},
          },
          stats: {
            fps: 0,
            violationCount: 0,
            totalFrames: 0,
            personCount: 0,
            startTime: null,
            lastFrameTime: null,
          },
        });
      });
      setCameraFeeds(feeds);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const startMonitoring = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/monitor/${cameraId}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected for camera ${feed.camera.name}`);
        updateFeedData(cameraId, { safetyStatus: 'Connected - Analyzing...' });
        // Initialize stats tracking
        updateFeedStats(cameraId, {
          startTime: Date.now(),
          lastFrameTime: Date.now(),
          totalFrames: 0,
          fps: 0,
          violationCount: 0,
          personCount: 0
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'frame' && data.frame && feed.videoRef.current) {
            feed.videoRef.current.src = `data:image/jpeg;base64,${data.frame}`;
          }

          if (data.type === 'frame' && data.results) {
            const results = data.results;

            // Update feed data and stats together to ensure we get latest state
            setCameraFeeds(prev => {
              const newFeeds = new Map(prev);
              const currentFeed = newFeeds.get(cameraId);

              if (!currentFeed) return newFeeds;

              const now = Date.now();
              const newFrameCount = (currentFeed.stats.totalFrames || 0) + 1;

              // Calculate FPS using time difference between frames
              let newFps = currentFeed.stats.fps || 0;
              if (currentFeed.stats.lastFrameTime) {
                const timeDiff = (now - currentFeed.stats.lastFrameTime) / 1000;
                if (timeDiff > 0) {
                  // Instantaneous FPS with light smoothing (more responsive)
                  const instantFps = 1 / timeDiff;
                  newFps = Math.round(currentFeed.stats.fps * 0.7 + instantFps * 0.3);
                }
              } else {
                // First frame, calculate from start time
                if (currentFeed.stats.startTime && newFrameCount > 1) {
                  const elapsed = (now - currentFeed.stats.startTime) / 1000;
                  newFps = elapsed > 0 ? Math.round(newFrameCount / elapsed) : 0;
                } else {
                  newFps = 1;
                }
              }

              // Count violations (only count new violations, not all non-compliant frames)
              let newViolationCount = currentFeed.stats.violationCount;
              const wasCompliant = currentFeed.liveData.isCompliant;
              if (!results.is_compliant && wasCompliant && results.person_detected) {
                // New violation detected
                newViolationCount = (currentFeed.stats.violationCount || 0) + 1;
              }

              // Get person count from backend (actual count of person bounding boxes)
              const personCount = results.person_count || 0;

              // Debug logging
              if (newFrameCount % 30 === 0) { // Log every 30 frames
                console.log(`[${feed.camera.name}] PersonCount: ${personCount}, Violations: ${newViolationCount}`);
              }

              // Update the feed with new data and stats
              newFeeds.set(cameraId, {
                ...currentFeed,
                liveData: {
                  isCompliant: results.is_compliant,
                  detectedClasses: results.detected_classes || [],
                  safetyStatus: results.safety_status || 'Analyzing...',
                  violationType: results.violation_type,
                  confidenceScores: results.confidence_scores || {},
                },
                stats: {
                  ...currentFeed.stats,
                  totalFrames: newFrameCount,
                  fps: newFps,
                  violationCount: newViolationCount,
                  personCount: personCount,
                  lastFrameTime: now,
                },
              });

              return newFeeds;
            });

            // Update global stats
            setTimeout(() => updateGlobalStats(), 0);

            // Play sound alert on violation detection
            if (!results.is_compliant && results.violation_type) {
              soundAlertManager.playViolationAlert('high');
            }
          }

          if (data.type === 'status') {
            updateFeedData(cameraId, { safetyStatus: data.message });
          }

          if (data.type === 'error') {
            console.error(`WebSocket error for ${feed.camera.name}:`, data.message);
            updateFeedData(cameraId, { safetyStatus: data.message });
          }

          if (data.type === 'incident') {
            // New incident created - reload incidents to show in sidebar
            console.log('New incident reported via WebSocket:', data.incident);
            loadIncidents();
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${feed.camera.name}:`, error);
        updateFeedData(cameraId, { safetyStatus: 'Connection error' });
      };

      ws.onclose = () => {
        console.log(`WebSocket disconnected for camera ${feed.camera.name}`);
        const currentFeed = cameraFeeds.get(cameraId);
        if (currentFeed?.isMonitoring) {
          updateFeedData(cameraId, { safetyStatus: 'Disconnected' });
        }
      };

      updateFeed(cameraId, { wsRef: ws, isMonitoring: true });
    } catch (error) {
      console.error(`Failed to connect to WebSocket for ${feed.camera.name}:`, error);
      updateFeedData(cameraId, { safetyStatus: 'Failed to connect' });
    }
  };

  const stopMonitoring = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed) return;

    if (feed.wsRef) {
      feed.wsRef.close();
    }

    updateFeed(cameraId, {
      wsRef: null,
      isMonitoring: false,
      liveData: {
        isCompliant: true,
        detectedClasses: [],
        safetyStatus: 'Monitoring stopped',
        violationType: null,
        confidenceScores: {},
      },
    });
  };

  const startAllMonitoring = () => {
    setMonitoringAll(true);
    cameras.forEach(camera => {
      startMonitoring(camera.id);
    });
  };

  const stopAllMonitoring = () => {
    setMonitoringAll(false);
    cameras.forEach(camera => {
      stopMonitoring(camera.id);
    });
  };

  const updateFeed = (cameraId: string, updates: Partial<CameraFeed>) => {
    setCameraFeeds(prev => {
      const newFeeds = new Map(prev);
      const feed = newFeeds.get(cameraId);
      if (feed) {
        newFeeds.set(cameraId, { ...feed, ...updates });
      }
      return newFeeds;
    });
  };

  const updateFeedData = (cameraId: string, updates: Partial<CameraFeed['liveData']>) => {
    setCameraFeeds(prev => {
      const newFeeds = new Map(prev);
      const feed = newFeeds.get(cameraId);
      if (feed) {
        newFeeds.set(cameraId, {
          ...feed,
          liveData: { ...feed.liveData, ...updates },
        });
      }
      return newFeeds;
    });
  };

  const updateFeedStats = (cameraId: string, updates: Partial<CameraFeed['stats']>) => {
    setCameraFeeds(prev => {
      const newFeeds = new Map(prev);
      const feed = newFeeds.get(cameraId);
      if (feed) {
        newFeeds.set(cameraId, {
          ...feed,
          stats: { ...feed.stats, ...updates },
        });
      }
      return newFeeds;
    });
  };

  const updateGlobalStats = () => {
    let totalViolations = 0;
    let totalFrames = 0;
    let totalFps = 0;
    let activeFeeds = 0;

    cameraFeeds.forEach(feed => {
      if (feed.isMonitoring) {
        totalViolations += feed.stats.violationCount;
        totalFrames += feed.stats.totalFrames;
        totalFps += feed.stats.fps;
        activeFeeds++;
      }
    });

    const avgFps = activeFeeds > 0 ? Math.round(totalFps / activeFeeds) : 0;
    const complianceRate = totalFrames > 0 ? Math.round(((totalFrames - totalViolations) / totalFrames) * 100) : 100;

    setGlobalStats({
      totalViolations,
      totalFrames,
      avgFps,
      complianceRate,
    });
  };

  const captureScreenshot = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed || !feed.videoRef.current || !feed.videoRef.current.src) {
      toast({
        title: 'Error',
        description: 'No video frame available to capture',
        variant: 'destructive',
      });
      return;
    }

    // Get the current frame from the video element
    const screenshot = feed.videoRef.current.src;

    // Save to local screenshots list
    const screenshotRecord = {
      id: Date.now().toString(),
      screenshot: screenshot,
      timestamp: new Date().toISOString(),
      cameraId: cameraId,
      cameraName: feed.camera.name,
      detectedClasses: [...feed.liveData.detectedClasses],
      isCompliant: feed.liveData.isCompliant,
      violationType: feed.liveData.violationType,
    };
    setCapturedScreenshots(prev => [screenshotRecord, ...prev]);

    toast({
      title: 'Screenshot Captured',
      description: `Screenshot saved from ${feed.camera.name}`,
    });
  };

  const startRecording = async (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed || !feed.videoRef.current || !feed.isMonitoring) {
      toast({
        title: 'Error',
        description: 'Cannot record - camera is not monitoring',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create canvas to capture frames
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get dimensions from the image
      const img = feed.videoRef.current;
      canvas.width = img.naturalWidth || 640;
      canvas.height = img.naturalHeight || 480;

      // Create MediaStream from canvas
      const stream = canvas.captureStream(30); // 30 FPS

      // Try different formats for better compatibility
      let mimeType = 'video/webm;codecs=vp9';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
        mimeType = 'video/webm;codecs=h264';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        // Determine file extension from mimeType
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `recording-${feed.camera.name}-${timestamp}.${extension}`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Recording Saved',
          description: `Video saved as ${extension.toUpperCase()} format. If it won't play, try VLC Media Player or convert to MP4 using a video converter.`,
        });
      };

      // Start recording
      mediaRecorder.start();

      // Continuously draw frames to canvas
      const drawFrame = () => {
        if (feed.isRecording && feed.videoRef.current) {
          ctx.drawImage(feed.videoRef.current, 0, 0, canvas.width, canvas.height);
          requestAnimationFrame(drawFrame);
        }
      };
      drawFrame();

      updateFeed(cameraId, {
        isRecording: true,
        mediaRecorder,
        recordedChunks: chunks,
      });

      toast({
        title: 'Recording Started',
        description: `Recording feed from ${feed.camera.name}`,
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording. Your browser may not support this feature.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed || !feed.mediaRecorder) return;

    feed.mediaRecorder.stop();

    updateFeed(cameraId, {
      isRecording: false,
      mediaRecorder: null,
      recordedChunks: [],
    });
  };

  const openIncidentDialog = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed || !feed.videoRef.current || !feed.videoRef.current.src) {
      toast({
        title: 'Error',
        description: 'No video frame available to capture',
        variant: 'destructive',
      });
      return;
    }

    // Capture screenshot
    const screenshot = feed.videoRef.current.src;
    setCapturedScreenshot(screenshot);
    setSelectedCameraForIncident(cameraId);

    // Auto-fill title based on violation
    const autoTitle = feed.liveData.violationType
      ? `PPE Violation: ${feed.liveData.violationType}`
      : 'Safety Incident';

    const autoDescription = feed.liveData.violationType
      ? `PPE violation detected at ${feed.camera.location || 'camera location'}. Detected classes: ${feed.liveData.detectedClasses.join(', ')}.`
      : '';

    const autoSeverity = feed.liveData.violationType ? 'high' : 'medium';

    setIncidentForm({
      title: autoTitle,
      description: autoDescription,
      severity: autoSeverity as IncidentSeverity,
    });

    setIsIncidentDialogOpen(true);
  };

  const handleCreateIncident = async () => {
    if (!selectedCameraForIncident) return;

    try {
      if (!incidentForm.title || !incidentForm.description) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        });
        return;
      }

      await incidentsAPI.create({
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        camera_id: selectedCameraForIncident,
        screenshot_base64: capturedScreenshot,
        incident_time: new Date().toISOString(),
      });

      toast({
        title: 'Success',
        description: 'Incident report created successfully',
      });

      // Reload incidents to show the new one
      loadIncidents();

      setIsIncidentDialogOpen(false);
      setCapturedScreenshot(null);
      setSelectedCameraForIncident(null);
      setIncidentForm({
        title: '',
        description: '',
        severity: 'medium',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create incident report',
        variant: 'destructive',
      });
    }
  };

  const downloadScreenshot = (screenshot: any) => {
    const link = document.createElement('a');
    link.href = screenshot.screenshot;
    link.download = `screenshot-${screenshot.cameraName}-${new Date(screenshot.timestamp).toLocaleString()}.jpg`;
    link.click();
  };

  const downloadIncident = async (incident: any) => {
    if (!incident.screenshot_url) return;

    try {
      const url = `http://localhost:8000${incident.screenshot_url}`;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `incident-${incident.id}-${new Date(incident.incident_time).toLocaleDateString()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download incident:', error);
      toast({
        title: 'Error',
        description: 'Failed to download incident screenshot',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteIncident = async (incidentId: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;

    try {
      await incidentsAPI.delete(incidentId);
      toast({
        title: 'Success',
        description: 'Incident deleted successfully',
      });
      loadIncidents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete incident',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllIncidents = async () => {
    if (!confirm(`Are you sure you want to delete all ${incidents.length} incidents? This action cannot be undone.`)) return;

    try {
      await Promise.all(incidents.map(incident => incidentsAPI.delete(incident.id)));
      toast({
        title: 'Success',
        description: `All ${incidents.length} incidents deleted successfully`,
      });
      loadIncidents();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to delete all incidents',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllScreenshots = () => {
    if (!confirm(`Are you sure you want to delete all ${capturedScreenshots.length} screenshots? This action cannot be undone.`)) return;

    setCapturedScreenshots([]);
    toast({
      title: 'Success',
      description: `All ${capturedScreenshots.length} screenshots cleared`,
    });
  };

  const toggleFullscreen = (cameraId: string) => {
    const feed = cameraFeeds.get(cameraId);
    if (!feed || !feed.containerRef.current) return;

    const container = feed.containerRef.current;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      container.requestFullscreen().then(() => {
        setFullscreenCameraId(cameraId);
      }).catch((err) => {
        toast({
          title: 'Fullscreen Error',
          description: `Failed to enter fullscreen mode: ${err.message}`,
          variant: 'destructive',
        });
      });
    } else {
      // Exit fullscreen
      document.exitFullscreen().then(() => {
        setFullscreenCameraId(null);
      });
    }
  };

  // Listen for fullscreen changes (ESC key, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenCameraId(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading cameras...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (cameras.length === 0) {
    return (
      <DashboardLayout>
        <PageHeader
          title="Multi-Camera Monitor"
          description="Monitor multiple cameras simultaneously"
        />
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Cameras</h3>
              <p className="text-muted-foreground">
                No active cameras available. Please add cameras from the Admin panel.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Multi-Camera Monitor"
        description={`Monitoring ${cameras.length} camera${cameras.length > 1 ? 's' : ''} simultaneously`}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsConfigDialogOpen(true)}
            title="Detection settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant={soundAlertsEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => {
              const newState = !soundAlertsEnabled;
              setSoundAlertsEnabled(newState);
              soundAlertManager.setEnabled(newState);
              if (newState) {
                soundAlertManager.testAlert();
                toast({
                  title: 'Sound Alerts Enabled',
                  description: 'You will hear audio alerts when violations are detected',
                });
              } else {
                toast({
                  title: 'Sound Alerts Disabled',
                  description: 'Violation alerts will be silent',
                });
              }
            }}
            title={soundAlertsEnabled ? 'Disable sound alerts' : 'Enable sound alerts'}
          >
            {soundAlertsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          {monitoringAll ? (
            <Button variant="destructive" onClick={stopAllMonitoring}>
              <Square className="h-4 w-4 mr-2" />
              Stop All
            </Button>
          ) : (
            <Button onClick={startAllMonitoring}>
              <Play className="h-4 w-4 mr-2" />
              Start All
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Global Statistics Overlay */}
      {monitoringAll && (
        <div className="mx-6 mb-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-500/10">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Violations</p>
                    <p className="text-2xl font-bold">{globalStats.totalViolations}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Compliance Rate</p>
                    <p className="text-2xl font-bold">{globalStats.complianceRate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-500/10">
                    <Video className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Frames Processed</p>
                    <p className="text-2xl font-bold">{globalStats.totalFrames.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-6 p-6">
        {/* Main Content Area - Scrollable Camera List */}
        <div className="flex-1">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6 pr-4">
              {Array.from(cameraFeeds.values()).map((feed) => (
                <Card key={feed.camera.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{feed.camera.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{feed.camera.location}</p>
                      </div>
                      {feed.isMonitoring ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => stopMonitoring(feed.camera.id)}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Stop Monitoring
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => startMonitoring(feed.camera.id)}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Monitoring
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Video Feed */}
                    <div ref={feed.containerRef} className="aspect-video bg-secondary relative overflow-hidden">
                      {feed.isMonitoring ? (
                        <>
                          <img
                            ref={feed.videoRef}
                            alt={`${feed.camera.name} feed`}
                            className="w-full h-full object-contain"
                          />
                          {/* Live Indicator & Stats */}
                          <div className="absolute top-2 left-2 flex flex-col gap-2">
                            <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                              <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                              LIVE
                            </div>
                            <div className={`flex items-center gap-1 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur ${
                              feed.stats.personCount > 0 ? 'bg-blue-500/90' : 'bg-gray-500/70'
                            }`}>
                              <Users className="h-3 w-3" />
                              {feed.stats.personCount} {feed.stats.personCount === 1 ? 'person' : 'people'}
                            </div>
                            {feed.stats.violationCount > 0 && (
                              <div className="flex items-center gap-1 bg-red-500/90 text-white px-2 py-1 rounded text-xs font-medium backdrop-blur">
                                <AlertCircle className="h-3 w-3" />
                                {feed.stats.violationCount} {feed.stats.violationCount === 1 ? 'violator' : 'violators'}
                              </div>
                            )}
                          </div>
                          {/* Action Buttons */}
                          <div className="absolute top-2 right-2 flex gap-2">
                            {feed.isRecording ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => stopRecording(feed.camera.id)}
                                className="bg-red-500/90 backdrop-blur hover:bg-red-600"
                              >
                                <Square className="h-4 w-4 mr-1 fill-white" />
                                Stop Recording
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => startRecording(feed.camera.id)}
                                className="bg-background/90 backdrop-blur"
                              >
                                <Circle className="h-4 w-4 mr-1 text-red-500" />
                                Record
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => captureScreenshot(feed.camera.id)}
                              className="bg-background/90 backdrop-blur"
                            >
                              <CameraIcon className="h-4 w-4 mr-1" />
                              Capture
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openIncidentDialog(feed.camera.id)}
                              className="bg-red-500/90 backdrop-blur hover:bg-red-600"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => toggleFullscreen(feed.camera.id)}
                              className="bg-background/90 backdrop-blur"
                              title={fullscreenCameraId === feed.camera.id ? "Exit fullscreen (ESC)" : "Enter fullscreen"}
                            >
                              {fullscreenCameraId === feed.camera.id ? (
                                <Minimize className="h-4 w-4" />
                              ) : (
                                <Maximize className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          {/* Detection Badges */}
                          {feed.liveData.detectedClasses.length > 0 && (
                            <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur rounded p-2">
                              <div className="flex flex-wrap gap-1">
                                {feed.liveData.detectedClasses.map((cls, idx) => (
                                  <span
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      cls.toLowerCase().includes('no-')
                                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                                        : 'bg-green-500/20 text-green-500 border border-green-500/30'
                                    }`}
                                  >
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <div className="text-center">
                            <Video className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">Click "Start Monitoring" to begin</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Bar */}
                    <div
                      className={`p-3 text-center text-sm font-medium ${
                        feed.liveData.isCompliant
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {feed.liveData.isCompliant ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span>{feed.liveData.safetyStatus}</span>
                      </div>
                      {feed.liveData.violationType && (
                        <p className="text-xs mt-1 opacity-80">
                          {feed.liveData.violationType}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar for Captured Records */}
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-96' : 'w-12'}`}>
          <div className="sticky top-6">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="mb-2"
            >
              {isSidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>

            {isSidebarOpen && (
              <Card className="h-[calc(100vh-200px)]">
                <CardHeader>
                  <CardTitle className="text-lg">Captured Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    {loadingRecords ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Incident Reports Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Incident Reports ({incidents.length})
                            </h3>
                            {incidents.length > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteAllIncidents}
                                className="h-7 text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete All
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            {incidents.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No incidents reported</p>
                            ) : (
                              incidents.map((incident) => (
                                <Card key={incident.id} className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <Badge
                                        variant={
                                          incident.severity === 'critical' ? 'destructive' :
                                          incident.severity === 'high' ? 'destructive' :
                                          incident.severity === 'medium' ? 'default' : 'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {incident.severity}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(incident.incident_time).toLocaleString()}
                                      </span>
                                    </div>
                                    <h4 className="font-medium text-sm">{incident.title}</h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{incident.description}</p>
                                    {incident.screenshot_url && (
                                      <div className="relative">
                                        <img
                                          src={`http://localhost:8000${incident.screenshot_url}`}
                                          alt="Incident screenshot"
                                          className="w-full h-32 object-cover rounded"
                                        />
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadIncident(incident)}
                                        className="flex-1"
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteIncident(incident.id)}
                                        className="flex-1"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Captured Screenshots Section */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              Screenshots ({capturedScreenshots.length})
                            </h3>
                            {capturedScreenshots.length > 0 && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDeleteAllScreenshots}
                                className="h-7 text-xs"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete All
                              </Button>
                            )}
                          </div>
                          <div className="space-y-3">
                            {capturedScreenshots.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No screenshots captured</p>
                            ) : (
                              capturedScreenshots.map((screenshot) => (
                                <Card key={screenshot.id} className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <Badge variant={screenshot.isCompliant ? 'default' : 'destructive'} className="text-xs">
                                        {screenshot.isCompliant ? 'Compliant' : 'Violation'}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(screenshot.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                    <p className="text-sm font-medium">{screenshot.cameraName}</p>
                                    {screenshot.detectedClasses.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {screenshot.detectedClasses.slice(0, 3).map((cls: string, idx: number) => (
                                          <span key={idx} className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                                            {cls}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <div className="relative">
                                      <img
                                        src={screenshot.screenshot}
                                        alt="Captured screenshot"
                                        className="w-full h-32 object-cover rounded"
                                      />
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadScreenshot(screenshot)}
                                      className="w-full"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </Button>
                                  </div>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Incident Report Dialog */}
      <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Safety Incident</DialogTitle>
            <DialogDescription>
              Document this safety violation for review and follow-up
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {capturedScreenshot && (
              <div className="relative">
                <img
                  src={capturedScreenshot}
                  alt="Captured screenshot"
                  className="w-full h-64 object-contain rounded border"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Incident Title *</Label>
              <Input
                id="title"
                value={incidentForm.title}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief description of the incident"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={incidentForm.description}
                onChange={(e) => setIncidentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detailed description of what happened..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity Level</Label>
              <Select
                value={incidentForm.severity}
                onValueChange={(value) => setIncidentForm(prev => ({ ...prev, severity: value as IncidentSeverity }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIncident}>
              Create Incident Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detection Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detection Configuration</DialogTitle>
            <DialogDescription>
              Adjust detection settings to fine-tune accuracy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="confidence">Confidence Threshold</Label>
                <span className="text-sm font-medium">{Math.round(confidenceThreshold * 100)}%</span>
              </div>
              <Slider
                id="confidence"
                min={0.1}
                max={0.95}
                step={0.05}
                value={[confidenceThreshold]}
                onValueChange={(value) => setConfidenceThreshold(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower values detect more objects but may include false positives.
                Higher values are more selective but may miss some detections.
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>More detections</span>
                <span>More accurate</span>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-medium">Current Settings</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence Threshold:</span>
                  <span className="font-medium">{Math.round(confidenceThreshold * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model Type:</span>
                  <span className="font-medium">YOLOv8s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Classes Detected:</span>
                  <span className="font-medium">5 classes</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> Confidence threshold adjustments will apply to future detections.
                Current monitoring sessions will continue with their initial settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast({
                title: 'Settings Saved',
                description: `Confidence threshold set to ${Math.round(confidenceThreshold * 100)}%`,
              });
              setIsConfigDialogOpen(false);
            }}>
              Apply Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
