'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  HardHat,
  ArrowLeft,
  Edit,
  Download,
  QrCode,
  Phone,
  MapPin,
  Briefcase,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Video,
  MapPinned,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { workersAPI, attendanceAPI } from '@/lib/api';
import Image from 'next/image';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: string;
  description: string | null;
}

interface Worker {
  id: string;
  account_number: string;
  full_name: string;
  contact_number: string | null;
  position: string | null;
  emergency_contact: string | null;
  camera_id: string | null;
  camera_name: string | null;
  camera: Camera | null;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  attendance_stats: {
    total_days_worked: number;
    total_hours_worked: number;
  };
}

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  hours_worked: number | null;
  status: string;
}

export default function WorkerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workerId = params.id as string;

  const [worker, setWorker] = useState<Worker | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workerId) {
      loadWorkerDetails();
      loadRecentAttendance();
    }
  }, [workerId]);

  const loadWorkerDetails = async () => {
    try {
      const data = await workersAPI.getById(workerId);
      setWorker(data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to load worker details:', error);
      setError(error.response?.data?.detail || 'Failed to load worker details');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentAttendance = async () => {
    try {
      const data = await attendanceAPI.getAll({ worker_id: workerId, limit: 10 });
      setRecentAttendance(data.records);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const handleDownloadQR = async () => {
    if (!worker) return;

    try {
      const response = await workersAPI.downloadQR(workerId);

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_${worker.account_number}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Failed to download QR code');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading worker details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Worker Not Found</h2>
            <p className="text-muted-foreground mb-4">{error || 'The requested worker could not be found.'}</p>
            <Button onClick={() => router.push('/safety-manager/workers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workers List
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/safety-manager/workers')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workers
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <HardHat className="h-7 w-7" />
                  {worker.full_name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Account Number: {worker.account_number}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDownloadQR}>
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
                <Button onClick={() => router.push(`/safety-manager/workers/${workerId}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Worker
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="text-lg font-bold flex items-center gap-2 mt-1">
                    {worker.is_active ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-500">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-gray-500" />
                        <span className="text-gray-500">Inactive</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Days Worked</p>
                  <p className="text-2xl font-bold">{worker.attendance_stats.total_days_worked}</p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="text-2xl font-bold">{worker.attendance_stats.total_hours_worked}</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                  <p className="text-2xl font-bold">
                    {worker.attendance_stats.total_days_worked > 0
                      ? (worker.attendance_stats.total_hours_worked / worker.attendance_stats.total_days_worked).toFixed(1)
                      : '0'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Worker Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Worker Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                      <p className="font-medium">{worker.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                      <p className="font-mono font-medium">{worker.account_number}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        Position
                      </p>
                      <p className="font-medium">{worker.position || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Assigned Site
                      </p>
                      <p className="font-medium">{worker.camera_name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {worker.camera && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Site Details
                      </h3>
                      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-base">{worker.camera.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                worker.camera.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : worker.camera.status === 'maintenance'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {worker.camera.status}
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-sm">
                                <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">Location:</span>
                                <span className="font-medium">{worker.camera.location}</span>
                              </div>
                              {worker.camera.description && (
                                <div className="flex items-start gap-2 text-sm">
                                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                  <span className="text-muted-foreground">Description:</span>
                                  <span className="font-medium">{worker.camera.description}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        Contact Number
                      </p>
                      <p className="font-medium">{worker.contact_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Emergency Contact
                      </p>
                      <p className="font-medium">{worker.emergency_contact || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Created</p>
                      <p className="text-sm">{formatDate(worker.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                      <p className="text-sm">{formatDate(worker.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Attendance */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Attendance (Last 10)</h2>
                {recentAttendance.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No attendance records yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours Worked</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentAttendance.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-sm">
                              {formatDate(record.check_in_time)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {record.check_out_time ? formatDate(record.check_out_time) : '-'}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {record.hours_worked ? `${record.hours_worked} hrs` : '-'}
                            </TableCell>
                            <TableCell>
                              {record.status === 'checked_in' ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-600 font-medium">
                                  Checked In
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
                                  Checked Out
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>

            {/* QR Code Card */}
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code
                </h2>
                <div className="space-y-4">
                  {worker.qr_code_url ? (
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                      <img
                        src={`http://localhost:8000${worker.qr_code_url}`}
                        alt={`QR Code for ${worker.account_number}`}
                        className="w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 p-8 rounded-lg text-center">
                      <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">QR Code not available</p>
                    </div>
                  )}

                  <Button onClick={handleDownloadQR} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download QR Code
                  </Button>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Print this QR code and attach it to the worker's hardhat</p>
                    <p>• Scan at the entrance for quick check-in/check-out</p>
                    <p>• Contains account number: {worker.account_number}</p>
                  </div>
                </div>
              </Card>

              {/* Quick Actions */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/safety-manager/workers/${workerId}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Worker Details
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push('/safety-manager/workers/scan')}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    Scan QR for Attendance
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => router.push(`/safety-manager/workers/metrics?worker=${workerId}`)}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Full Analytics
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
