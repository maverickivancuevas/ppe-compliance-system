'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
  TrendingUp,
  Calendar,
  Clock,
  User,
  BarChart3,
  Download,
  Filter,
} from 'lucide-react';
import { workersAPI, attendanceAPI } from '@/lib/api';

interface Worker {
  id: string;
  account_number: string;
  full_name: string;
  position: string | null;
  is_active: boolean;
}

interface WorkerMetrics {
  worker_id: string;
  worker_name: string;
  account_number: string;
  total_days_worked: number;
  total_hours_worked: number;
  average_hours_per_day: number;
  days_this_month: number;
}

export default function PerformanceMetricsPage() {
  const searchParams = useSearchParams();
  const preselectedWorkerId = searchParams.get('worker');

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(preselectedWorkerId || '');
  const [metrics, setMetrics] = useState<WorkerMetrics | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(!preselectedWorkerId);

  useEffect(() => {
    loadWorkers();
    loadTodayAttendance();
  }, []);

  useEffect(() => {
    if (selectedWorkerId) {
      loadWorkerMetrics(selectedWorkerId);
      setShowAll(false);
    }
  }, [selectedWorkerId]);

  const loadWorkers = async () => {
    try {
      const data = await workersAPI.getAll({ is_active: true });
      setWorkers(data.workers);
    } catch (error) {
      console.error('Failed to load workers:', error);
    }
  };

  const loadWorkerMetrics = async (workerId: string) => {
    setLoading(true);
    try {
      const data = await attendanceAPI.getWorkerStats(workerId);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load worker metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const data = await attendanceAPI.getToday();
      setTodayAttendance(data);
    } catch (error) {
      console.error('Failed to load today attendance:', error);
    }
  };

  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId);
    if (workerId) {
      loadWorkerMetrics(workerId);
    } else {
      setMetrics(null);
      setShowAll(true);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-7 w-7" />
              Worker Performance Metrics
            </h1>
            <p className="text-sm text-muted-foreground">
              Track attendance, hours worked, and performance statistics
            </p>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filter Card */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Worker:</span>
              <select
                value={selectedWorkerId}
                onChange={(e) => handleWorkerChange(e.target.value)}
                className="flex-1 max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Workers Overview</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.account_number} - {worker.full_name} {worker.position ? `(${worker.position})` : ''}
                  </option>
                ))}
              </select>
              {selectedWorkerId && (
                <Button variant="outline" size="sm" onClick={() => handleWorkerChange('')}>
                  Clear Filter
                </Button>
              )}
            </div>
          </Card>

          {/* Today's Attendance Overview */}
          {todayAttendance && showAll && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Attendance Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Checked In</p>
                      <p className="text-3xl font-bold text-green-500">
                        {todayAttendance.total_checked_in}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Checked Out</p>
                      <p className="text-3xl font-bold text-blue-500">
                        {todayAttendance.total_checked_out}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Currently On Site</p>
                      <p className="text-3xl font-bold text-primary">
                        {todayAttendance.total_checked_in}
                      </p>
                    </div>
                    <User className="h-8 w-8 text-primary" />
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Individual Worker Metrics */}
          {metrics && !showAll && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Statistics - {metrics.worker_name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Days Worked</p>
                      <p className="text-3xl font-bold">{metrics.total_days_worked}</p>
                      <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-3xl font-bold">{metrics.total_hours_worked}</p>
                      <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Hours/Day</p>
                      <p className="text-3xl font-bold">{metrics.average_hours_per_day}</p>
                      <p className="text-xs text-muted-foreground mt-1">Average</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Days This Month</p>
                      <p className="text-3xl font-bold text-blue-500">{metrics.days_this_month}</p>
                      <p className="text-xs text-muted-foreground mt-1">Current month</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </Card>
              </div>

              {/* Performance Insights */}
              <Card className="p-6 mt-4">
                <h3 className="font-semibold mb-4">Performance Insights</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Attendance Rate (This Month)</span>
                    <span className="font-bold text-green-600">
                      {metrics.days_this_month > 0 ? 'Active' : 'No attendance this month'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Average Work Hours per Day</span>
                    <span className="font-bold">
                      {metrics.average_hours_per_day} hours
                      {metrics.average_hours_per_day >= 8 && (
                        <span className="text-green-600 ml-2">✓ Full time</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span>Total Experience</span>
                    <span className="font-bold">
                      {metrics.total_days_worked} days ({metrics.total_hours_worked} hours)
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Today's Workers List */}
          {todayAttendance && showAll && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Workers Currently Checked In</h2>
              <Card className="p-6">
                {todayAttendance.checked_in_workers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No workers currently checked in</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account Number</TableHead>
                          <TableHead>Worker Name</TableHead>
                          <TableHead>Check In Time</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {todayAttendance.checked_in_workers.map((record: any) => {
                          const checkInTime = new Date(record.check_in_time);
                          const now = new Date();
                          const duration = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60));

                          return (
                            <TableRow key={record.id}>
                              <TableCell className="font-mono">{record.account_number}</TableCell>
                              <TableCell className="font-medium">{record.worker_name}</TableCell>
                              <TableCell>{new Date(record.check_in_time).toLocaleTimeString()}</TableCell>
                              <TableCell>{duration}h on site</TableCell>
                              <TableCell>
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600 font-medium">
                                  Checked In
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {todayAttendance && showAll && todayAttendance.checked_out_workers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Workers Checked Out Today</h2>
              <Card className="p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Number</TableHead>
                        <TableHead>Worker Name</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Hours Worked</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayAttendance.checked_out_workers.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-mono">{record.account_number}</TableCell>
                          <TableCell className="font-medium">{record.worker_name}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(record.check_in_time).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {record.hours_worked ? `${record.hours_worked} hrs` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading metrics...</p>
            </div>
          )}
      </main>
    </DashboardLayout>
  );
}
