'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { camerasAPI, detectionsAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, AlertCircle, TrendingUp, Play } from 'lucide-react';
import { Camera as CameraType } from '@/types';

export default function SafetyManagerDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [stats, setStats] = useState({
    recentDetections: 0,
    violations: 0,
    complianceRate: 0,
    activeCameras: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [camerasData, detectionStats] = await Promise.all([
        camerasAPI.getAll(),
        detectionsAPI.getStats(),
      ]);

      setCameras(camerasData);
      setStats({
        recentDetections: detectionStats.total_detections,
        violations: detectionStats.violation_count,
        complianceRate: detectionStats.compliance_rate,
        activeCameras: camerasData.filter((c: CameraType) => c.status === 'active').length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartMonitoring = (cameraId: string) => {
    router.push(`/safety-manager/monitor/${cameraId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Overview of PPE compliance monitoring</p>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Detections (7d)</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentDetections}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Violations</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.violations}</div>
              <p className="text-xs text-muted-foreground mt-1">Safety violations detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.complianceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Last 7 days average</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Cameras */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Available Cameras</CardTitle>
            <CardDescription>Select a camera to start monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            {cameras.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">No cameras available</p>
                <p className="text-sm text-muted-foreground">
                  Contact your administrator to add cameras to the system.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cameras.map((camera) => (
                  <Card key={camera.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{camera.name}</CardTitle>
                          <CardDescription className="mt-1">{camera.location}</CardDescription>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            camera.status === 'active'
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-gray-500/10 text-gray-500'
                          }`}
                        >
                          {camera.status}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        className="w-full"
                        onClick={() => handleStartMonitoring(camera.id)}
                        disabled={camera.status !== 'active'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Monitoring
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Monitoring Guide</CardTitle>
            <CardDescription>How to use the PPE compliance monitoring system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Select a Camera</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Start Monitoring" on any active camera to begin real-time detection.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Watch for Violations</h4>
                <p className="text-sm text-muted-foreground">
                  The system will automatically detect when workers are missing hardhats or safety vests.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Respond to Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Acknowledge alerts and take appropriate action when violations are detected.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">Review Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Use the analytics dashboard to track compliance trends and generate reports.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </main>
      </div>
    </div>
  );
}
