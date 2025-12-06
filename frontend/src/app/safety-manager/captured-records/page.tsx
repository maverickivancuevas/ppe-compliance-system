'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Image as ImageIcon, Camera, FileText, Download, Eye, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { detectionsAPI, camerasAPI } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper function to format date using local timezone (not UTC)
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

interface CapturedRecord {
  id: string;
  type: 'detection';
  timestamp: string;
  camera_id: string;
  camera_name: string;
  camera_location: string;
  image_url: string;
  violation_type?: string;
  is_compliant?: boolean;
}

interface CameraInfo {
  id: string;
  name: string;
  location: string;
}

export default function CapturedRecordsPage() {
  const [records, setRecords] = useState<CapturedRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CapturedRecord[]>([]);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    camera_id: '',
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    end: formatLocalDate(new Date()),
  });

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    if (cameras.length > 0) {
      loadRecords();
    }
  }, [dateRange, cameras]);

  useEffect(() => {
    applyFilters();
  }, [records, filters]);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      setCameras(data);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const detections = await detectionsAPI.getAll({
        start_date: dateRange.start,
        end_date: dateRange.end,
        limit: 500,
      });

      const detectionRecords: CapturedRecord[] = detections
        .filter((d: any) => d.snapshot_url)
        .map((d: any) => {
          const camera = cameras.find(c => c.id === d.camera_id);
          return {
            id: d.id,
            type: 'detection' as const,
            timestamp: d.timestamp,
            camera_id: d.camera_id || '',
            camera_name: camera?.name || 'Unknown',
            camera_location: camera?.location || 'N/A',
            image_url: d.snapshot_url.startsWith('http')
              ? d.snapshot_url
              : `${API_URL}${d.snapshot_url.startsWith('/') ? '' : '/'}${d.snapshot_url}`,
            violation_type: d.violation_type,
            is_compliant: d.is_compliant,
          };
        });

      const allRecords = detectionRecords.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRecords(allRecords);
    } catch (error) {
      console.error('Failed to load records:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = records;

    // Filter by camera
    if (filters.camera_id) {
      filtered = filtered.filter(r => r.camera_id === filters.camera_id);
    }

    setFilteredRecords(filtered);
  };

  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({
      start: formatLocalDate(start),
      end: formatLocalDate(end),
    });
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Captured Records</h1>
              <p className="text-sm text-muted-foreground">
                All detection snapshots with PPE violations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-8 w-8 text-primary" />
              <div className="text-right">
                <p className="text-2xl font-bold">{filteredRecords.length}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Quick Date Filters */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(7)}
              >
                Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickDateRange(30)}
              >
                Last 30 Days
              </Button>
            </div>

            {/* Date Range & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Camera</label>
                <select
                  value={filters.camera_id}
                  onChange={(e) => setFilters({ ...filters, camera_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-white"
                >
                  <option value="">All Cameras</option>
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name} - {camera.location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Records Grid */}
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                <p className="text-muted-foreground">
                  No captured images found for the selected filters.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRecords.map((record) => (
                <Card key={record.id} className="overflow-hidden hover:border-primary transition-colors">
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={record.image_url}
                      alt="Detection snapshot"
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedImage(record.image_url)}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="flex items-center justify-center h-full bg-muted"><p class="text-muted-foreground text-xs">Image not found</p></div>';
                        }
                      }}
                    />
                    <div className="absolute top-2 left-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          record.type === 'detection'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }`}
                      >
                        <>
                          <Camera className="h-3 w-3 inline mr-1" />
                          Detection
                        </>
                      </span>
                    </div>
                    {record.is_compliant !== undefined && (
                      <div className="absolute top-2 right-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            record.is_compliant
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}
                        >
                          {record.is_compliant ? 'Compliant' : 'Violation'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(record.timestamp)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{record.camera_name}</p>
                      <p className="text-xs text-muted-foreground">{record.camera_location}</p>
                    </div>
                    {record.violation_type && (
                      <p className="text-xs text-red-500">{record.violation_type}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setSelectedImage(record.image_url)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          downloadImage(
                            record.image_url,
                            `${record.type}_${record.id}_${new Date(record.timestamp).getTime()}.jpg`
                          )
                        }
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-12 right-0 text-white hover:bg-white/10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            <img
              src={selectedImage}
              alt="Full size preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
