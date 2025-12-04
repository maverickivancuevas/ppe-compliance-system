'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { camerasAPI, detectionsAPI, usersAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Users, AlertCircle, TrendingUp, Settings, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [stats, setStats] = useState({
    totalCameras: 0,
    activeCameras: 0,
    totalUsers: 0,
    recentDetections: 0,
    violations: 0,
    complianceRate: 0,
  });
  const [health, setHealth] = useState({
    backend: { status: 'checking', message: 'Checking...' },
    database: { status: 'checking', message: 'Checking...' },
    yolo_model: { status: 'checking', message: 'Checking...' },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadHealth();
    // Refresh stats every 30 seconds
    const interval = setInterval(() => {
      loadStats();
      loadHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const [cameras, users, detectionStats] = await Promise.all([
        camerasAPI.getAll(),
        usersAPI.getAll(),
        detectionsAPI.getStats(),
      ]);

      setStats({
        totalCameras: cameras.length,
        activeCameras: cameras.filter((c: any) => c.status === 'active').length,
        totalUsers: users.length,
        recentDetections: detectionStats.total_detections,
        violations: detectionStats.violation_count,
        complianceRate: detectionStats.compliance_rate,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/system/health`);
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to load health:', error);
      setHealth({
        backend: { status: 'error', message: 'Cannot connect to backend' },
        database: { status: 'unknown', message: 'Unknown' },
        yolo_model: { status: 'unknown', message: 'Unknown' },
      });
    }
  };

  return (
    <DashboardLayout requiredRole="admin">
      <PageHeader
        title="Admin Dashboard"
        description="System overview and management"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Cameras</CardTitle>
              <Camera className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCameras}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeCameras} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">System Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">Active accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Detections (7d)</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentDetections}</div>
              <p className="text-xs text-destructive mt-1">{stats.violations} violations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.complianceRate >= 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                {stats.complianceRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.complianceRate >= 90 ? 'Excellent' : 'Needs attention'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your PPE compliance system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/admin/cameras">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-start w-full"
                >
                  <Camera className="h-6 w-6 mb-2 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      Manage Cameras
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add, edit, or remove cameras
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/admin/users">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-start w-full"
                >
                  <Users className="h-6 w-6 mb-2 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      Manage Users
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Create and manage user accounts
                    </div>
                  </div>
                </Button>
              </Link>

              <Link href="/admin/settings">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-start w-full"
                >
                  <Settings className="h-6 w-6 mb-2 text-primary" />
                  <div className="text-left">
                    <div className="font-semibold flex items-center gap-2">
                      System Settings
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Configure system settings
                    </div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Backend API</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    health.backend.status === 'online' ? 'bg-green-500' :
                    health.backend.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    health.backend.status === 'online' ? 'text-green-500' :
                    health.backend.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {health.backend.status === 'online' ? 'Online' :
                     health.backend.status === 'error' ? 'Error' : 'Checking...'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    health.database.status === 'connected' ? 'bg-green-500' :
                    health.database.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    health.database.status === 'connected' ? 'text-green-500' :
                    health.database.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {health.database.status === 'connected' ? 'Connected' :
                     health.database.status === 'error' ? 'Error' : 'Checking...'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">YOLO Model</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    health.yolo_model.status === 'loaded' ? 'bg-green-500' :
                    health.yolo_model.status === 'not_loaded' || health.yolo_model.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className={`text-sm font-medium ${
                    health.yolo_model.status === 'loaded' ? 'text-green-500' :
                    health.yolo_model.status === 'not_loaded' || health.yolo_model.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                  }`}>
                    {health.yolo_model.status === 'loaded' ? 'Loaded' :
                     health.yolo_model.status === 'not_loaded' ? 'Not Loaded' :
                     health.yolo_model.status === 'error' ? 'Error' : 'Checking...'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Cameras</span>
                <span className="text-sm font-medium">{stats.activeCameras} / {stats.totalCameras}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>Quick setup guide</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <p className="text-sm">Add monitoring cameras in Camera Management</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <p className="text-sm">Create Safety Manager user accounts</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <p className="text-sm">Configure system settings as needed</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <p className="text-sm">Start monitoring from Safety Manager dashboard</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
