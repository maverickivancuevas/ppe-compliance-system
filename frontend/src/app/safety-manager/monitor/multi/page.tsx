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
import { camerasAPI, detectionsAPI, performanceAPI } from '@/lib/api';
import { Camera } from '@/types';
import { Play, Square, AlertCircle, CheckCircle2, Video, Camera as CameraIcon, FileText, Download, ChevronRight, ChevronLeft, Image as ImageIcon, Clock, Volume2, VolumeX, Trash2, Settings, Activity, Users, Maximize, Minimize, Grid2x2, List } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { soundAlertManager } from '@/lib/soundAlerts';

interface CameraFeed {
  camera: Camera;
  wsRef: WebSocket | null;
  videoRef: React.RefObject<HTMLImageElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  isMonitoring: boolean;
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
  const [isGridFullscreen, setIsGridFullscreen] = useState(false);
  const [fullscreenPage, setFullscreenPage] = useState(0);
  const gridContainerRef = useRef<HTMLDivElement>(null);


  // Sidebar state for captured records
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [capturedScreenshots, setCapturedScreenshots] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Sound alerts state
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(soundAlertManager.getEnabled());

  // Configuration dialog state
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [inputSize, setInputSize] = useState(640);
  const [jpegQuality, setJpegQuality] = useState(85);

  // View mode state (list or grid)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Global statistics
  const [globalStats, setGlobalStats] = useState({
    totalViolations: 0,
    totalFrames: 0,
    avgFps: 0,
    complianceRate: 100,
  });

  useEffect(() => {
    loadCameras();
    loadPerformanceSettings();

    return () => {
      // Cleanup all WebSockets on unmount
      cameraFeeds.forEach(feed => {
        if (feed.wsRef) {
          feed.wsRef.close();
        }
      });
    };
  }, []);

  const loadPerformanceSettings = async () => {
    try {
      const settings = await performanceAPI.get();
      setConfidenceThreshold(settings.confidence_threshold);
      setIouThreshold(settings.iou_threshold);
      setInputSize(settings.input_size);
      setJpegQuality(settings.jpeg_quality);
    } catch (error) {
      console.error('Failed to load performance settings:', error);
    }
  };

  const loadScreenshots = async () => {
    try {
      // Load detection events that have screenshots (snapshot_url is not null)
      const data = await detectionsAPI.getAll({ has_snapshot: true, limit: 50 });

      // Transform detection events to match screenshot format
      const screenshots = data.map((detection: any) => {
        // Build detected classes array from detection flags
        const detectedClasses = [];
        if (detection.person_detected) detectedClasses.push('Person');
        if (detection.hardhat_detected) detectedClasses.push('Hardhat');
        if (detection.no_hardhat_detected) detectedClasses.push('No-Hardhat');
        if (detection.safety_vest_detected) detectedClasses.push('Safety Vest');
        if (detection.no_safety_vest_detected) detectedClasses.push('No-Safety Vest');

        // Find camera name from loaded cameras
        const camera = cameras.find(c => c.id === detection.camera_id);

        return {
          id: detection.id,
          timestamp: detection.timestamp,
          isCompliant: detection.is_compliant,
          screenshot: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${detection.snapshot_url}`,
          cameraName: camera?.name || camera?.location || 'Unknown Camera',
          detectedClasses,
          violationType: detection.violation_type,
        };
      });

      setCapturedScreenshots(screenshots);
    } catch (error) {
      console.error('Failed to load screenshots:', error);
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

              // Count violations in real-time based on current frame
              // Use total_violation_count from backend (counts all missing PPE items across all workers)
              // Example: 2 workers missing hardhat + 1 worker missing vest = 3 violations
              const newViolationCount = results.total_violation_count || 0;

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
          }

          if (data.type === 'status') {
            updateFeedData(cameraId, { safetyStatus: data.message });
          }

          if (data.type === 'error') {
            console.error(`WebSocket error for ${feed.camera.name}:`, data.message);
            updateFeedData(cameraId, { safetyStatus: data.message });
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


  const downloadScreenshot = (screenshot: any) => {
    const link = document.createElement('a');
    link.href = screenshot.screenshot;
    link.download = `screenshot-${screenshot.cameraName}-${new Date(screenshot.timestamp).toLocaleString()}.jpg`;
    link.click();
  };

  const handleDeleteScreenshot = async (screenshotId: string) => {
    if (!confirm('Are you sure you want to delete this screenshot? (The detection data will be kept)')) return;

    try {
      await detectionsAPI.clearSnapshot(screenshotId);
      toast({
        title: 'Success',
        description: 'Screenshot cleared successfully',
      });
      loadScreenshots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to clear screenshot',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllScreenshots = async () => {
    if (!confirm(`Are you sure you want to clear all ${capturedScreenshots.length} screenshots? (Detection data will be kept)`)) return;

    try {
      // Clear all screenshot URLs from database (keeps detection data)
      const result = await detectionsAPI.clearAllSnapshots();

      toast({
        title: 'Success',
        description: `Cleared ${result.count} screenshots successfully`,
      });

      // Reload screenshots to reflect changes
      loadScreenshots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to clear screenshots',
        variant: 'destructive',
      });
    }
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

  const toggleGridFullscreen = () => {
    if (!gridContainerRef.current) return;

    if (!document.fullscreenElement) {
      // Enter fullscreen
      gridContainerRef.current.requestFullscreen().then(() => {
        setIsGridFullscreen(true);
        setFullscreenPage(0); // Reset to first page
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
        setIsGridFullscreen(false);
        setFullscreenPage(0);
      });
    }
  };

  // Listen for fullscreen changes (ESC key, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenCameraId(null);
        setIsGridFullscreen(false);
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
          <Button
            variant={viewMode === 'grid' ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            title={viewMode === 'list' ? 'Switch to grid view' : 'Switch to list view'}
          >
            {viewMode === 'list' ? <Grid2x2 className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Button
            variant={isGridFullscreen ? "default" : "outline"}
            size="icon"
            onClick={toggleGridFullscreen}
            title={isGridFullscreen ? 'Exit fullscreen (ESC)' : 'Fullscreen grid view'}
          >
            {isGridFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
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
        {/* Main Content Area - Scrollable Camera List/Grid */}
        <div
          className={isGridFullscreen ? "w-screen h-screen p-4 bg-background" : "flex-1"}
          ref={gridContainerRef}
        >
          {isGridFullscreen ? (
            <div className="flex flex-col h-full w-full gap-3">
              {/* Camera Grid */}
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-auto" style={{ gridTemplateRows: '1fr 1fr' }}>
                {Array.from(cameraFeeds.values()).slice(fullscreenPage * 4, fullscreenPage * 4 + 4).map((feed) => (
                <Card key={feed.camera.id} className="overflow-hidden flex flex-col min-h-0">
                  <CardHeader className='pb-2 p-3'>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className='text-sm truncate'>{feed.camera.name}</CardTitle>
                        <p className='text-xs text-muted-foreground truncate'>{feed.camera.location}</p>
                      </div>
                      {feed.isMonitoring ? (
                        <Button
                          variant="destructive"
                          size='icon'
                          onClick={() => stopMonitoring(feed.camera.id)}
                          title="Stop Monitoring"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size='icon'
                          onClick={() => startMonitoring(feed.camera.id)}
                          title="Start Monitoring"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                    {/* Video Feed */}
                    <div ref={feed.containerRef} className="flex-1 bg-secondary relative overflow-hidden min-h-0">
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
                                {feed.stats.violationCount} {feed.stats.violationCount === 1 ? 'violation' : 'violations'}
                              </div>
                            )}
                          </div>
                          {/* Action Buttons */}
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              size='icon'
                              variant="secondary"
                              onClick={() => captureScreenshot(feed.camera.id)}
                              className="bg-background/90 backdrop-blur"
                              title="Capture Screenshot"
                            >
                              <CameraIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              size='icon'
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
                      className={`p-2 text-center text-xs font-medium ${
                        feed.liveData.isCompliant
                          ? 'bg-green-500/10 text-green-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {feed.liveData.isCompliant ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
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

              {/* Navigation Controls at Bottom */}
              {cameras.length > 4 && (
                <div className="flex items-center justify-center gap-3 bg-background/95 backdrop-blur px-4 py-3 rounded-lg border shadow-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullscreenPage(Math.max(0, fullscreenPage - 1))}
                    disabled={fullscreenPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium px-3">
                    Page {fullscreenPage + 1} of {Math.ceil(cameras.length / 4)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFullscreenPage(Math.min(Math.ceil(cameras.length / 4) - 1, fullscreenPage + 1))}
                    disabled={fullscreenPage >= Math.ceil(cameras.length / 4) - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4 pr-4' : 'space-y-6 pr-4'}>
                {Array.from(cameraFeeds.values()).map((feed) => (
                  <Card key={feed.camera.id} className="overflow-hidden">
                  <CardHeader className={viewMode === 'grid' ? 'pb-2 p-3' : 'pb-3'}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className={viewMode === 'grid' ? 'text-sm truncate' : 'text-lg'}>{feed.camera.name}</CardTitle>
                        <p className={viewMode === 'grid' ? 'text-xs text-muted-foreground truncate' : 'text-sm text-muted-foreground'}>{feed.camera.location}</p>
                      </div>
                      {feed.isMonitoring ? (
                        <Button
                          variant="destructive"
                          size={viewMode === 'grid' ? 'icon' : 'sm'}
                          onClick={() => stopMonitoring(feed.camera.id)}
                          title="Stop Monitoring"
                        >
                          <Square className="h-4 w-4" />
                          {viewMode === 'list' && <span className="ml-2">Stop</span>}
                        </Button>
                      ) : (
                        <Button
                          size={viewMode === 'grid' ? 'icon' : 'sm'}
                          onClick={() => startMonitoring(feed.camera.id)}
                          title="Start Monitoring"
                        >
                          <Play className="h-4 w-4" />
                          {viewMode === 'list' && <span className="ml-2">Start</span>}
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
                                {feed.stats.violationCount} {feed.stats.violationCount === 1 ? 'violation' : 'violations'}
                              </div>
                            )}
                          </div>
                          {/* Action Buttons */}
                          <div className={`absolute top-2 right-2 flex gap-${viewMode === 'grid' ? '1' : '2'}`}>
                            <Button
                              size={viewMode === 'grid' ? 'icon' : 'sm'}
                              variant="secondary"
                              onClick={() => captureScreenshot(feed.camera.id)}
                              className="bg-background/90 backdrop-blur"
                              title="Capture Screenshot"
                            >
                              <CameraIcon className="h-4 w-4" />
                              {viewMode === 'list' && <span className="ml-1">Capture</span>}
                            </Button>
                            <Button
                              size={viewMode === 'grid' ? 'icon' : 'sm'}
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
          )}
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
                                Clear All
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
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => downloadScreenshot(screenshot)}
                                        className="flex-1"
                                      >
                                        <Download className="h-3 w-3 mr-1" />
                                        Download
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeleteScreenshot(screenshot.id)}
                                        className="flex-1"
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Clear
                                      </Button>
                                    </div>
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

      {/* Detection Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detection Configuration</DialogTitle>
            <DialogDescription>
              Adjust detection settings to fine-tune accuracy
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="iou">IOU Threshold (NMS)</Label>
                <span className="text-sm font-medium">{Math.round(iouThreshold * 100)}%</span>
              </div>
              <Slider
                id="iou"
                min={0.1}
                max={0.9}
                step={0.05}
                value={[iouThreshold]}
                onValueChange={(value) => setIouThreshold(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Controls how aggressively overlapping boxes are removed. Lower values remove more overlaps (fewer duplicates). Higher values keep more boxes.
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fewer duplicates</span>
                <span>More boxes</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="resolution">Input Resolution</Label>
                <span className="text-sm font-medium">{inputSize}px</span>
              </div>
              <Select
                value={inputSize.toString()}
                onValueChange={(value) => setInputSize(parseInt(value))}
              >
                <SelectTrigger id="resolution">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="320">320px - Fastest, Lowest Accuracy</SelectItem>
                  <SelectItem value="416">416px - Fast</SelectItem>
                  <SelectItem value="512">512px - Balanced</SelectItem>
                  <SelectItem value="640">640px - Default</SelectItem>
                  <SelectItem value="1280">1280px - Best Accuracy, Slowest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Higher resolutions provide better accuracy for small objects but require more processing power and reduce FPS.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="quality">Stream Quality</Label>
                <span className="text-sm font-medium">{jpegQuality}% JPEG</span>
              </div>
              <Slider
                id="quality"
                min={50}
                max={100}
                step={5}
                value={[jpegQuality]}
                onValueChange={(value) => setJpegQuality(value[0])}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Lower quality reduces bandwidth and may increase FPS. Higher quality provides better image clarity but may reduce FPS due to larger file sizes.
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Faster (50-70%)</span>
                <span>Clearer (85-100%)</span>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>About FPS:</strong> Frame rate (FPS) is not directly configurable. It depends on your hardware performance, Input Resolution (lower = faster), and Stream Quality (lower = faster). Monitor the live FPS counter on each camera feed.
              </p>
            </div>

            <div className="p-3 bg-muted rounded-lg space-y-2">
              <h4 className="text-sm font-medium">Current Settings</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confidence Threshold:</span>
                  <span className="font-medium">{Math.round(confidenceThreshold * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IOU Threshold:</span>
                  <span className="font-medium">{Math.round(iouThreshold * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Input Resolution:</span>
                  <span className="font-medium">{inputSize}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stream Quality:</span>
                  <span className="font-medium">{jpegQuality}% JPEG</span>
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
                <strong>Note:</strong> Settings will apply immediately to all active monitoring sessions.
              </p>
            </div>
          </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={async () => {
              try {
                await performanceAPI.update({
                  confidence_threshold: confidenceThreshold,
                  iou_threshold: iouThreshold,
                  input_size: inputSize,
                  jpeg_quality: jpegQuality,
                });
                toast({
                  title: 'Settings Applied',
                  description: `Confidence: ${Math.round(confidenceThreshold * 100)}%, IOU: ${Math.round(iouThreshold * 100)}%, Resolution: ${inputSize}px, Quality: ${jpegQuality}%`,
                });
                setIsConfigDialogOpen(false);
              } catch (error: any) {
                toast({
                  title: 'Error',
                  description: error.response?.data?.detail || 'Failed to update settings',
                  variant: 'destructive',
                });
              }
            }}>
              Apply Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
