'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { camerasAPI } from '@/lib/api';
import { Camera } from '@/types';
import { Plus, Edit, Trash2, Camera as CameraIcon } from 'lucide-react';

export default function CamerasPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    stream_url: '',
    description: '',
  });

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      setCameras(data);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCamera(null);
    setFormData({ name: '', location: '', stream_url: '', description: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (camera: Camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      location: camera.location,
      stream_url: camera.stream_url || '',
      description: camera.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this camera?')) return;

    try {
      await camerasAPI.delete(id);
      await loadCameras();
    } catch (error) {
      console.error('Failed to delete camera:', error);
      alert('Failed to delete camera');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCamera) {
        await camerasAPI.update(editingCamera.id, formData);
      } else {
        await camerasAPI.create(formData);
      }
      setIsDialogOpen(false);
      await loadCameras();
    } catch (error) {
      console.error('Failed to save camera:', error);
      alert('Failed to save camera');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'inactive':
        return 'bg-gray-500/10 text-gray-500';
      case 'maintenance':
        return 'bg-yellow-500/10 text-yellow-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <DashboardLayout requiredRole="admin">
      <PageHeader
        title="Camera Management"
        description="Manage your monitoring cameras and their configurations"
        action={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Camera
          </Button>
        }
      />

      <div className="p-6">
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading cameras...</p>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-12">
              <CameraIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No cameras yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first monitoring camera
              </p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Stream URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cameras.map((camera) => (
                  <TableRow key={camera.id}>
                    <TableCell className="font-medium">{camera.name}</TableCell>
                    <TableCell>{camera.location}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {camera.stream_url || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          camera.status
                        )}`}
                      >
                        {camera.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(camera)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(camera.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCamera ? 'Edit Camera' : 'Add New Camera'}
            </DialogTitle>
            <DialogDescription>
              {editingCamera
                ? 'Update camera configuration'
                : 'Add a new monitoring camera to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Camera Name*</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Entrance"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location*</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A - Floor 1"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stream_url">Stream URL</Label>
                <Input
                  id="stream_url"
                  placeholder="e.g., 0 for webcam or /path/to/video.mp4"
                  value={formData.stream_url}
                  onChange={(e) =>
                    setFormData({ ...formData, stream_url: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Use "0" for default webcam, "1" for second camera, or provide video file path
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional notes about this camera"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingCamera ? 'Update' : 'Create'} Camera
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
