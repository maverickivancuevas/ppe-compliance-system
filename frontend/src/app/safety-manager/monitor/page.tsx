'use client';

import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { camerasAPI, detectionsAPI } from '@/lib/api';
import { Camera } from '@/types';
import { Video, Play, Square, AlertCircle, CheckCircle2, Camera as CameraIcon, Save } from 'lucide-react';

export default function LiveMonitorPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLImageElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Real-time data from WebSocket
  const [liveData, setLiveData] = useState({
    isCompliant: true,
    detectedClasses: [] as string[],
    safetyStatus: 'Waiting for feed...',
    violationType: null as string | null,
    confidenceScores: {} as Record<string, number>,
  });

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      const activeCameras = data.filter((c: Camera) => c.status === 'active');
      setCameras(activeCameras);
      if (activeCameras.length > 0) {
        setSelectedCamera(activeCameras[0]);
      }
    } catch (error) {
      console.error('Failed to load cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const startMonitoring = () => {
    if (!selectedCamera) return;

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
    const wsUrl = `${protocol}//${window.location.hostname}:8000/ws/monitor/${selectedCamera.id}`;

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
            console.error('WebSocket error:', data.message);
            setLiveData(prev => ({
              ...prev,
              safetyStatus: data.message
            }));
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
      setLiveData(prev => ({
        ...prev,
        safetyStatus: 'Failed to connect to camera stream'
      }));
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

  const handleSaveDetection = async () => {
    if (!selectedCamera || !isMonitoring || liveData.detectedClasses.length === 0) {
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const detectionData = {
        camera_id: selectedCamera.id,
        person_detected: liveData.detectedClasses.some(cls => cls.toLowerCase() === 'person'),
        hardhat_detected: liveData.detectedClasses.some(cls => cls.toLowerCase() === 'hardhat'),
        no_hardhat_detected: liveData.detectedClasses.some(cls => cls.toLowerCase() === 'no-hardhat'),
        safety_vest_detected: liveData.detectedClasses.some(cls => cls.toLowerCase() === 'safety vest'),
        no_safety_vest_detected: liveData.detectedClasses.some(cls => cls.toLowerCase() === 'no-safety vest'),
        is_compliant: liveData.isCompliant,
        violation_type: liveData.violationType,
        confidence_scores: liveData.confidenceScores,
      };

      const response = await detectionsAPI.saveManual(detectionData);
      setSaveMessage(response.message || 'Detection saved successfully!');

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to save detection:', error);
      setSaveMessage(error.response?.data?.detail || 'Failed to save detection');
      setTimeout(() => setSaveMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

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
          title="Live Monitoring"
          description="Real-time PPE detection monitoring"
        />
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <CameraIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Cameras</h3>
              <p className="text-muted-foreground">
                No active cameras available for monitoring. Please contact your administrator.
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
        title="Live Monitoring"
        description="Real-time PPE detection and compliance monitoring"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed - Large Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Camera Feed</CardTitle>
                    <CardDescription>
                      {selectedCamera?.name} - {selectedCamera?.location}
                    </CardDescription>
                  </div>
                  {isMonitoring ? (
                    <Button variant="destructive" onClick={stopMonitoring}>
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button onClick={startMonitoring}>
                      <Play className="h-4 w-4 mr-2" />
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
                      <p>Click "Start Monitoring" to begin</p>
                      <p className="text-sm mt-2">
                        Live video feed with detection overlays will appear here
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera Selector */}
                <div className="mt-4">
                  <label className="text-sm font-medium mb-2 block">Select Camera:</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={selectedCamera?.id || ''}
                    onChange={(e) => {
                      const camera = cameras.find((c) => c.id === e.target.value);
                      if (camera) {
                        if (isMonitoring) {
                          stopMonitoring();
                        }
                        setSelectedCamera(camera);
                      }
                    }}
                    disabled={isMonitoring}
                  >
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.name} - {camera.location}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Save Detection Button */}
                {isMonitoring && liveData.detectedClasses.length > 0 && (
                  <div className="mt-4">
                    <Button
                      onClick={handleSaveDetection}
                      disabled={isSaving}
                      className={`w-full ${
                        !liveData.isCompliant
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save Detection to Database'}
                    </Button>
                    {saveMessage && (
                      <p
                        className={`text-sm mt-2 text-center ${
                          saveMessage.includes('success')
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        {saveMessage}
                      </p>
                    )}
                  </div>
                )}
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
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                  )}
                  <p
                    className={`text-lg font-bold ${
                      liveData.isCompliant ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {liveData.safetyStatus}
                  </p>
                  {liveData.violationType && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Violation: {liveData.violationType}
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
                      <div className="space-y-1">
                        {liveData.detectedClasses.map((cls, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>{cls}</span>
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
                      <p>FPS: {isMonitoring ? '~30' : 'N/A'}</p>
                      <p>Resolution: 1280x720</p>
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
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Create Incident Report
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <CameraIcon className="h-4 w-4 mr-2" />
                  Capture Snapshot
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
