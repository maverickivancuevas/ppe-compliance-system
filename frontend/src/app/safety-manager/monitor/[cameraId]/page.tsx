'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { camerasAPI } from '@/lib/api';
import { Camera } from '@/types';
import { Video, Square, AlertCircle, CheckCircle2, Camera as CameraIcon, ArrowLeft, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function CameraMonitorPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const cameraId = params.cameraId as string;

  const [camera, setCamera] = useState<Camera | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Live detection data
  const [liveData, setLiveData] = useState({
    isCompliant: true,
    detectedClasses: [] as string[],
    safetyStatus: 'Waiting for feed...',
    violationType: null as string | null,
    confidenceScores: {} as Record<string, number>,
  });

  useEffect(() => {
    loadCamera();
    return () => {
      // Cleanup WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cameraId]);

  const loadCamera = async () => {
    try {
      const data = await camerasAPI.getById(cameraId);
      setCamera(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load camera:', error);
      setError('Failed to load camera. Please try again.');
      setLoading(false);
    }
  };

  const startMonitoring = () => {
    if (!camera) return;

    setIsMonitoring(true);
    setLiveData({
      isCompliant: true,
      detectedClasses: [],
      safetyStatus: 'Connecting to camera...',
      violationType: null,
      confidenceScores: {},
    });

    // Connect to WebSocket for real-time video feed
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/monitor/${cameraId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setLiveData(prev => ({ ...prev, safetyStatus: 'Connected - Analyzing feed...' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Update video frame
          if (data.type === 'frame' && data.frame && videoRef.current) {
            videoRef.current.src = `data:image/jpeg;base64,${data.frame}`;
          }

          // Update detection results
          if (data.type === 'frame' && data.results) {
            const results = data.results;

            setLiveData({
              isCompliant: results.is_compliant,
              detectedClasses: results.detected_classes || [],
              safetyStatus: results.safety_status || 'Analyzing...',
              violationType: results.violation_type,
              confidenceScores: results.confidence_scores || {},
            });
          }

          // Handle status messages
          if (data.type === 'status') {
            setLiveData(prev => ({
              ...prev,
              safetyStatus: data.message
            }));
          }

          // Handle error messages
          if (data.type === 'error') {
            setError(data.message);
            setIsMonitoring(false);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setLiveData(prev => ({
          ...prev,
          safetyStatus: 'Connection error - Please check camera'
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (isMonitoring) {
          setLiveData(prev => ({ ...prev, safetyStatus: 'Disconnected' }));
        }
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setError('Failed to connect to camera stream');
      setIsMonitoring(false);
    }
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setLiveData({
      isCompliant: true,
      detectedClasses: [],
      safetyStatus: 'Monitoring stopped',
      violationType: null,
      confidenceScores: {},
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading camera...</p>
        </div>
      </div>
    );
  }

  if (error || !camera) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <CameraIcon className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Camera Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The requested camera could not be loaded.'}
            </p>
            <Button onClick={() => router.push('/safety-manager')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/safety-manager')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">{camera.name}</h1>
                  <p className="text-sm text-muted-foreground">{camera.location}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{user?.full_name}</p>
              <p className="text-sm text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed - Large Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Camera Feed</CardTitle>
                    <CardDescription>Real-time PPE detection</CardDescription>
                  </div>
                  {isMonitoring ? (
                    <Button variant="destructive" onClick={stopMonitoring}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button onClick={startMonitoring} disabled={camera.status !== 'active'}>
                      <Video className="h-4 w-4 mr-2" />
                      Start Monitoring
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Video Display Area */}
                <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center relative overflow-hidden">
                  {isMonitoring ? (
                    <>
                      <img
                        ref={videoRef}
                        alt="Live camera feed"
                        className="w-full h-full object-contain"
                      />
                      {/* Live Indicator */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        <div className="h-2 w-2 bg-white rounded-full animate-pulse"></div>
                        LIVE
                      </div>
                      {/* Detection Overlay */}
                      {liveData.detectedClasses.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 bg-background/90 backdrop-blur rounded-lg p-3">
                          <p className="text-xs font-medium mb-2">Detected:</p>
                          <div className="flex flex-wrap gap-2">
                            {liveData.detectedClasses.map((cls, idx) => (
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
                    <div className="text-center text-muted-foreground">
                      <Video className="h-16 w-16 mx-auto mb-4" />
                      <p className="font-medium">Click "Start Monitoring" to begin</p>
                      <p className="text-sm mt-2">
                        Live video feed with PPE detection overlays will appear here
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera Info */}
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{camera.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Stream URL</p>
                      <p className="font-medium text-xs truncate">{camera.stream_url}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Panel - Right Column */}
          <div className="space-y-6">
            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`p-4 rounded-lg text-center ${
                    liveData.isCompliant
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}
                >
                  {liveData.isCompliant ? (
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  ) : (
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2 animate-pulse" />
                  )}
                  <p
                    className={`text-lg font-bold ${
                      liveData.isCompliant ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {liveData.safetyStatus}
                  </p>
                  {liveData.violationType && (
                    <p className="text-sm text-red-500 mt-2 font-medium">
                      {liveData.violationType}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detection Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-2">Detected Classes:</p>
                    {liveData.detectedClasses.length > 0 ? (
                      <div className="space-y-2">
                        {liveData.detectedClasses.map((cls, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm p-2 rounded bg-muted"
                          >
                            <span className="font-medium">{cls}</span>
                            <span className="text-muted-foreground">
                              {((liveData.confidenceScores[cls] || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No detections</p>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">Monitoring Info:</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Status: {isMonitoring ? 'Active' : 'Stopped'}</p>
                      <p>Camera: {camera.name}</p>
                      <p>Location: {camera.location}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  disabled={!isMonitoring}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Create Incident Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  disabled={!isMonitoring}
                >
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Capture Snapshot
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
