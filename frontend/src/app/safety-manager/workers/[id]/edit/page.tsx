'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, ArrowLeft, Save, AlertCircle, Loader2 } from 'lucide-react';
import { workersAPI } from '@/lib/api';

export default function EditWorkerPage() {
  const router = useRouter();
  const params = useParams();
  const workerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    contact_number: '',
    position: '',
    emergency_contact: '',
  });

  // Fetch worker data on mount
  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const worker = await workersAPI.getById(workerId);
        setFormData({
          full_name: worker.full_name || '',
          contact_number: worker.contact_number || '',
          position: worker.position || '',
          emergency_contact: worker.emergency_contact || '',
        });
      } catch (error: any) {
        console.error('Failed to fetch worker:', error);
        setError('Failed to load worker details. Please try again.');
      } finally {
        setFetching(false);
      }
    };

    if (workerId) {
      fetchWorker();
    }
  }, [workerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.full_name.trim()) {
        setError('Full name is required');
        setLoading(false);
        return;
      }

      // Prepare data (remove empty strings to let backend handle null values)
      const submitData: any = {
        full_name: formData.full_name.trim(),
      };

      if (formData.contact_number.trim()) {
        submitData.contact_number = formData.contact_number.trim();
      }

      if (formData.position.trim()) {
        submitData.position = formData.position.trim();
      }

      if (formData.emergency_contact.trim()) {
        submitData.emergency_contact = formData.emergency_contact.trim();
      }

      await workersAPI.update(workerId, submitData);

      // Success - redirect to worker details
      router.push(`/safety-manager/workers/${workerId}`);
    } catch (error: any) {
      console.error('Failed to update worker:', error);
      setError(error.response?.data?.detail || 'Failed to update worker. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading worker details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HardHat className="h-7 w-7" />
              Edit Construction Worker
            </h1>
            <p className="text-sm text-muted-foreground">
              Update worker information
            </p>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            {error && (
              <Card className="p-4 mb-6 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-medium">{error}</p>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    placeholder="e.g., Juan Dela Cruz"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    required
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-2">
                  <Label htmlFor="contact_number">Contact Number</Label>
                  <Input
                    id="contact_number"
                    type="tel"
                    placeholder="e.g., 09171234567"
                    value={formData.contact_number}
                    onChange={(e) => handleChange('contact_number', e.target.value)}
                  />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position">Position / Role</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Construction Worker, Foreman, Engineer"
                    value={formData.position}
                    onChange={(e) => handleChange('position', e.target.value)}
                  />
                </div>

                {/* Emergency Contact */}
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact">Emergency Contact</Label>
                  <Input
                    id="emergency_contact"
                    placeholder="e.g., 09181234567 (Spouse)"
                    value={formData.emergency_contact}
                    onChange={(e) => handleChange('emergency_contact', e.target.value)}
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating Worker...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Worker
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/safety-manager/workers')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
      </main>
    </DashboardLayout>
  );
}
