'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HardHat, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { workersAPI } from '@/lib/api';

export default function AddWorkerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    contact_number: '',
    position: '',
    emergency_contact: '',
  });

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

      const worker = await workersAPI.create(submitData);

      // Success - redirect to worker details or list
      alert(`Worker ${worker.full_name} added successfully!\nAccount Number: ${worker.account_number}`);
      router.push('/safety-manager/workers');
    } catch (error: any) {
      console.error('Failed to create worker:', error);
      setError(error.response?.data?.detail || 'Failed to create worker. Please try again.');
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
              Add New Construction Worker
            </h1>
            <p className="text-sm text-muted-foreground">
              Register a new worker and generate QR code automatically
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
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-600">
                      <p className="font-medium mb-1">Automatic Account Number Generation</p>
                      <p>
                        The account number will be automatically generated in the format WKR-###
                        when you save the worker. A QR code will also be generated automatically.
                      </p>
                    </div>
                  </div>
                </div>

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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Worker...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Worker & Generate QR
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

            {/* Help Card */}
            <Card className="p-6 mt-6 bg-muted">
              <h3 className="font-semibold mb-3">What happens next?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-primary">1.</span>
                  <span>Worker will be assigned a unique account number (WKR-###)</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">2.</span>
                  <span>A QR code will be automatically generated for the worker</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">3.</span>
                  <span>You can download and print the QR code for the worker's hardhat</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary">4.</span>
                  <span>The worker can now check in/out using the QR code scanning feature</span>
                </li>
              </ul>
            </Card>
          </div>
      </main>
    </DashboardLayout>
  );
}
