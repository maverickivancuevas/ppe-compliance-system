'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { detectionsAPI, camerasAPI } from '@/lib/api';
import { DetectionEvent, Camera } from '@/types';
import { Search, Filter, Download, CheckCircle, XCircle, History } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DetectionHistoryPage() {
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    camera_id: '',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    violations_only: false,
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCameras();
    loadDetections();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      setCameras(data);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadDetections = async () => {
    setLoading(true);
    try {
      const params: any = {
        start_date: filters.start_date,
        end_date: filters.end_date,
        violations_only: filters.violations_only,
      };

      if (filters.camera_id) {
        params.camera_id = filters.camera_id;
      }

      const data = await detectionsAPI.getAll(params);
      setDetections(data);
    } catch (error) {
      console.error('Failed to load detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = ['Date', 'Camera', 'Status', 'Violation Type'];
    const rows = detections.map((d) => [
      formatDate(d.timestamp),
      d.camera_id,
      d.is_compliant ? 'Compliant' : 'Violation',
      d.violation_type || 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detections_${new Date().toISOString()}.csv`;
    a.click();
  };

  const filteredDetections = detections.filter((detection) => {
    if (!search) return true;
    return (
      detection.violation_type?.toLowerCase().includes(search.toLowerCase()) ||
      detection.camera_id.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Detection History"
        description="View and filter past PPE detection events"
        action={
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    setFilters({ ...filters, start_date: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    setFilters({ ...filters, end_date: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Camera</label>
                <select
                  value={filters.camera_id}
                  onChange={(e) =>
                    setFilters({ ...filters, camera_id: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All Cameras</option>
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={filters.violations_only ? 'violations' : 'all'}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      violations_only: e.target.value === 'violations',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Detections</option>
                  <option value="violations">Violations Only</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={loadDetections}>
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({
                    camera_id: '',
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
                    violations_only: false,
                  });
                }}
              >
                Reset
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by camera or violation type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading detections...</p>
            </div>
          ) : filteredDetections.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No detections found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or date range
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-muted-foreground">
                Showing {filteredDetections.length} detection(s)
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PPE Items</TableHead>
                    <TableHead>Violation</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDetections.map((detection) => (
                    <TableRow key={detection.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(detection.timestamp)}
                      </TableCell>
                      <TableCell>{detection.camera_id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        {detection.is_compliant ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Compliant</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-500">
                            <XCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Violation</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {detection.hardhat_detected && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs">
                              Hardhat
                            </span>
                          )}
                          {detection.safety_vest_detected && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs">
                              Vest
                            </span>
                          )}
                          {detection.no_hardhat_detected && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs">
                              No Hardhat
                            </span>
                          )}
                          {detection.no_safety_vest_detected && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-xs">
                              No Vest
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {detection.violation_type || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {detection.confidence_scores &&
                        Object.keys(detection.confidence_scores).length > 0
                          ? `${Math.max(...Object.values(detection.confidence_scores)) * 100}%`
                          : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
