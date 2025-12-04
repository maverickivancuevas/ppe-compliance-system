'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  UserPlus,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { workersAPI, camerasAPI } from '@/lib/api';

interface Worker {
  id: string;
  account_number: string;
  full_name: string;
  contact_number: string | null;
  position: string | null;
  emergency_contact: string | null;
  camera_id: string | null;
  camera_name: string | null;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
}

interface Camera {
  id: string;
  name: string;
  location: string;
}

export default function WorkersListPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCamera, setFilterCamera] = useState<string>('');
  const [stats, setStats] = useState({
    total_workers: 0,
    active_workers: 0,
    inactive_workers: 0,
    checked_in_today: 0,
  });

  useEffect(() => {
    loadWorkers();
    loadCameras();
    loadStats();
  }, [filterCamera, searchTerm]);

  const loadWorkers = async () => {
    try {
      const params: any = {};

      if (filterCamera) {
        params.camera_id = filterCamera;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const data = await workersAPI.getAll(params);
      setWorkers(data.workers);
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      // camerasAPI.getAll() returns the array directly, not an object with a cameras property
      setCameras(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadStats = async () => {
    try {
      const data = await workersAPI.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDelete = async (workerId: string, workerName: string) => {
    if (!confirm(`Are you sure you want to delete ${workerName}? This will also delete all attendance records.`)) {
      return;
    }

    try {
      await workersAPI.delete(workerId);
      loadWorkers();
      loadStats();
    } catch (error) {
      console.error('Failed to delete worker:', error);
      alert('Failed to delete worker');
    }
  };

  const handleDownloadQR = async (workerId: string, accountNumber: string) => {
    try {
      const response = await workersAPI.downloadQR(workerId);

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `QR_${accountNumber}.png`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
      alert('Failed to download QR code');
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <HardHat className="h-7 w-7" />
                Construction Workers
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage worker registrations, assignments, and QR codes
              </p>
            </div>
            <Button onClick={() => router.push('/safety-manager/workers/add')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Worker
            </Button>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Workers</p>
                  <p className="text-2xl font-bold">{stats.total_workers}</p>
                </div>
                <HardHat className="h-8 w-8 text-primary" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Checked In Today</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.checked_in_today}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or account number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {cameras && cameras.length > 0 && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Site:</span>
                  <select
                    value={filterCamera}
                    onChange={(e) => setFilterCamera(e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="">All Sites</option>
                    <option value="unassigned">Unassigned</option>
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* Workers Table */}
          <Card className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading workers...</p>
              </div>
            ) : workers.length === 0 ? (
              <div className="text-center py-12">
                <HardHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Workers Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterCamera
                    ? 'No workers match your search criteria.'
                    : 'Get started by adding your first construction worker.'}
                </p>
                {!searchTerm && !filterCamera && (
                  <Button onClick={() => router.push('/safety-manager/workers/add')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Worker
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account Number</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Assigned Site</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => (
                      <TableRow key={worker.id}>
                        <TableCell className="font-mono font-medium">
                          {worker.account_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {worker.full_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {worker.position || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {worker.contact_number || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {worker.camera_name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          {worker.is_active ? (
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs font-medium">Inactive</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(worker.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/safety-manager/workers/${worker.id}`)}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadQR(worker.id, worker.account_number)}
                              title="Download QR Code"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/safety-manager/workers/${worker.id}/edit`)}
                              title="Edit Worker"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(worker.id, worker.full_name)}
                              title="Delete Worker"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          {/* Summary */}
          {workers.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Showing {workers.length} worker{workers.length !== 1 ? 's' : ''}
              {(searchTerm || filterCamera) && ' (filtered)'}
            </div>
          )}
      </main>
    </DashboardLayout>
  );
}
