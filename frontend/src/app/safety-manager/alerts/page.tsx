'use client';

import { useState, useEffect } from 'react';
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
import { AlertCircle, CheckCircle, Bell, BellOff, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { alertsAPI } from '@/lib/api';

interface Alert {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  camera: {
    id: string;
    name: string;
    location: string;
  } | null;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  worker_id?: string;
}

export default function ActiveAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Refresh every 10 seconds
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, [showAcknowledged, filter]);

  const loadAlerts = async () => {
    try {
      const params: any = {};

      if (!showAcknowledged) {
        params.acknowledged = false;
      }

      if (filter !== 'all') {
        params.severity = filter;
      }

      const data = await alertsAPI.getAll(params);
      setAlerts(data.alerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsAPI.acknowledge(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleDelete = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }
    try {
      await alertsAPI.delete(alertId);
      loadAlerts();
    } catch (error) {
      console.error('Failed to delete alert:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL alerts? This action cannot be undone.')) {
      return;
    }
    try {
      await alertsAPI.deleteAll();
      loadAlerts();
    } catch (error) {
      console.error('Failed to delete all alerts:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Active Alerts</h1>
            <p className="text-sm text-muted-foreground">Real-time safety violation alerts and notifications</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {unacknowledgedCount} unacknowledged
            </span>
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-red-500" />
            </div>
            {alerts.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Severity:</span>
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filter === 'high' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('high')}
                  >
                    High
                  </Button>
                  <Button
                    variant={filter === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('medium')}
                  >
                    Medium
                  </Button>
                  <Button
                    variant={filter === 'low' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter('low')}
                  >
                    Low
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showAcknowledged ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowAcknowledged(!showAcknowledged)}
                >
                  {showAcknowledged ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Showing All
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Hiding Acknowledged
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Alerts List */}
          <Card className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading alerts...</p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Alerts</h3>
                <p className="text-muted-foreground">
                  {showAcknowledged
                    ? 'No alerts found with the selected filters.'
                    : 'All alerts have been acknowledged. Great job!'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(alert.created_at)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(
                            alert.severity
                          )}`}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {alert.worker_id ? (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded text-xs font-medium">
                            Worker #{alert.worker_id}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.camera?.name || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {alert.camera?.location || 'N/A'}
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">Acknowledged</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Pending</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">High Severity</p>
                  <p className="text-2xl font-bold text-red-500">
                    {alerts.filter((a) => a.severity === 'high' && !a.acknowledged).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Medium Severity</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {alerts.filter((a) => a.severity === 'medium' && !a.acknowledged).length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Unacknowledged</p>
                  <p className="text-2xl font-bold">{unacknowledgedCount}</p>
                </div>
                <Bell className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>
      </main>
    </DashboardLayout>
  );
}
