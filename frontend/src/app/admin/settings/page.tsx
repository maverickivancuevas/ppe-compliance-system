'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save, Lock, Trash2, AlertTriangle, Archive, Clock, Database, Plus, Minus, Download, Upload, Image } from 'lucide-react';

export default function SettingsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Load initial settings from localStorage to prevent flash
  const getInitialSettings = () => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('generalSettings');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          console.error('Failed to parse cached settings:', e);
        }
      }
    }
    return {
      companyName: 'Your Company',
      systemName: 'PPE Compliance System',
      logoUrl: '',
    };
  };

  const [generalSettings, setGeneralSettings] = useState(getInitialSettings());
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [generalLoading, setGeneralLoading] = useState(false);

  // PIN Management state
  const [pinSettings, setPinSettings] = useState({
    currentPassword: '',
    newPin: '',
    confirmPin: '',
  });
  const [pinStatus, setPinStatus] = useState<boolean | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Database Deletion state
  const [deletionForm, setDeletionForm] = useState({
    email: '',
    password: '',
    pin: '',
    days: '30',
  });
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [showDeletionConfirm, setShowDeletionConfirm] = useState(false);

  // Archive Settings state
  const [archiveSettings, setArchiveSettings] = useState({
    archiveDays: 30,
    running: false,
  });
  const [archiveStats, setArchiveStats] = useState({
    activeCount: 0,
    archivedCount: 0,
    totalCount: 0,
    pendingArchiveCount: 0,
    oldestActive: null as string | null,
  });
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivingNow, setArchivingNow] = useState(false);

  // Load general settings on mount
  useEffect(() => {
    loadGeneralSettings();
    loadArchiveSettings();
    loadArchiveStats();
  }, []);

  const loadGeneralSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/settings/general`);

      if (response.ok) {
        const data = await response.json();
        const settings = {
          companyName: data.company_name,
          systemName: data.system_name,
          logoUrl: data.logo_url || '',
        };
        setGeneralSettings(settings);

        // Cache settings in localStorage to prevent flash
        localStorage.setItem('generalSettings', JSON.stringify(settings));

        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      }
    } catch (error) {
      console.error('Failed to load general settings:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setGeneralSettings({ ...generalSettings, logoUrl: '' });
  };

  const handleSaveGeneral = async () => {
    if (!generalSettings.companyName.trim() || !generalSettings.systemName.trim()) {
      alert('Company name and system name cannot be empty');
      return;
    }

    setGeneralLoading(true);
    try {
      const token = localStorage.getItem('token');

      // If there's a new logo file, upload it first
      let logoUrl = generalSettings.logoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);

        const uploadResponse = await fetch(`${API_URL}/api/settings/upload-logo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          logoUrl = uploadData.logo_url;
        } else {
          alert('Failed to upload logo');
          setGeneralLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_URL}/api/settings/general`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: generalSettings.companyName,
          system_name: generalSettings.systemName,
          logo_url: logoUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('General settings saved successfully!');
        const settings = {
          companyName: data.company_name,
          systemName: data.system_name,
          logoUrl: data.logo_url || '',
        };
        setGeneralSettings(settings);

        // Cache settings in localStorage to prevent flash
        localStorage.setItem('generalSettings', JSON.stringify(settings));

        setLogoFile(null);
      } else {
        alert(data.detail || 'Failed to save general settings');
      }
    } catch (error) {
      console.error('Failed to save general settings:', error);
      alert('Failed to save general settings. Please try again.');
    } finally {
      setGeneralLoading(false);
    }
  };

  // Check PIN status on mount
  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/pin-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPinStatus(data.pin_set);
      }
    } catch (error) {
      console.error('Failed to check PIN status:', error);
    }
  };

  const handleSetPin = async () => {
    if (!pinSettings.newPin || !pinSettings.currentPassword) {
      alert('Please fill in all required fields');
      return;
    }

    if (pinSettings.newPin !== pinSettings.confirmPin) {
      alert('PINs do not match');
      return;
    }

    if (!/^\d{4}$/.test(pinSettings.newPin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    setPinLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/set-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: pinSettings.currentPassword,
          new_pin: pinSettings.newPin,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('PIN set successfully!');
        setPinSettings({ currentPassword: '', newPin: '', confirmPin: '' });
        checkPinStatus();
      } else {
        alert(data.detail || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Failed to set PIN:', error);
      alert('Failed to set PIN. Please try again.');
    } finally {
      setPinLoading(false);
    }
  };

  const handleDeleteDetections = async () => {
    if (!deletionForm.email || !deletionForm.password || !deletionForm.pin || !deletionForm.days) {
      alert('Please fill in all required fields');
      return;
    }

    if (!/^\d{4}$/.test(deletionForm.pin)) {
      alert('PIN must be exactly 4 digits');
      return;
    }

    const daysNum = parseInt(deletionForm.days);
    if (isNaN(daysNum) || daysNum < 0) {
      alert('Days must be a positive number');
      return;
    }

    if (!confirm(`Are you sure you want to delete all detection events older than ${daysNum} days? This action cannot be undone!`)) {
      return;
    }

    setDeletionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/delete-detections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: deletionForm.email,
          password: deletionForm.password,
          pin: deletionForm.pin,
          days: daysNum,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully deleted ${data.deleted_count} detection events`);
        setDeletionForm({ email: '', password: '', pin: '', days: '30' });
        setShowDeletionConfirm(false);
      } else {
        alert(data.detail || 'Failed to delete detections');
      }
    } catch (error) {
      console.error('Failed to delete detections:', error);
      alert('Failed to delete detections. Please try again.');
    } finally {
      setDeletionLoading(false);
    }
  };

  const loadArchiveSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/archive-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArchiveSettings({
          archiveDays: data.archive_days,
          running: data.running,
        });
      }
    } catch (error) {
      console.error('Failed to load archive settings:', error);
    }
  };

  const loadArchiveStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/archive-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setArchiveStats({
          activeCount: data.active_count,
          archivedCount: data.archived_count,
          totalCount: data.total_count,
          pendingArchiveCount: data.pending_archive_count,
          oldestActive: data.oldest_active,
        });
      }
    } catch (error) {
      console.error('Failed to load archive stats:', error);
    }
  };

  const handleSaveArchiveSettings = async () => {
    if (archiveSettings.archiveDays < 7) {
      alert('Archive days must be at least 7 days to prevent accidental data loss');
      return;
    }

    setArchiveLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/archive-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          archive_days: archiveSettings.archiveDays,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Archive settings updated successfully!');
        loadArchiveStats(); // Refresh stats with new cutoff
      } else {
        alert(data.detail || 'Failed to update archive settings');
      }
    } catch (error) {
      console.error('Failed to update archive settings:', error);
      alert('Failed to update archive settings. Please try again.');
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleArchiveNow = async () => {
    if (!confirm(`This will archive all detections older than ${archiveSettings.archiveDays} days. Continue?`)) {
      return;
    }

    setArchivingNow(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/archive-now`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully archived ${data.archived_count} detection events`);
        loadArchiveStats(); // Refresh stats
      } else {
        alert(data.detail || 'Failed to archive detections');
      }
    } catch (error) {
      console.error('Failed to archive detections:', error);
      alert('Failed to archive detections. Please try again.');
    } finally {
      setArchivingNow(false);
    }
  };

  const handleExportArchivedDetections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/export-archived-detections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `archived_detections_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to export archived detections');
      }
    } catch (error) {
      console.error('Failed to export archived detections:', error);
      alert('Failed to export archived detections. Please try again.');
    }
  };

  return (
    <DashboardLayout requiredRole="admin">
      <PageHeader
        title="System Settings"
        description="Configure system-wide settings and preferences"
      />

      <div className="p-6 space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Basic system configuration and company information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={generalSettings.companyName}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, companyName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemName">System Name</Label>
              <Input
                id="systemName"
                value={generalSettings.systemName}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, systemName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Company Logo</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    {logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload your company logo (PNG, JPG, SVG - Max 2MB)
                  </p>
                </div>
                {logoPreview && (
                  <div className="w-32 h-32 border rounded-lg p-2 bg-white flex items-center justify-center">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-md bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Timezone:</span> Asia/Manila (Philippine Time)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The system timezone is fixed to Philippine Time and cannot be changed.
              </p>
            </div>

            <Button onClick={handleSaveGeneral} disabled={generalLoading}>
              <Save className="h-4 w-4 mr-2" />
              {generalLoading ? 'Saving...' : 'Save General Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Auto-Archive Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Auto-Archive Settings
            </CardTitle>
            <CardDescription>
              Automatically archive old detection events to improve performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Archive Statistics */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/50">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Detections</p>
                <p className="text-2xl font-semibold">{archiveStats.activeCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Archived Detections</p>
                <p className="text-2xl font-semibold">{archiveStats.archivedCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Detections</p>
                <p className="text-2xl font-semibold">{archiveStats.totalCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Archive</p>
                <p className="text-2xl font-semibold text-orange-500">{archiveStats.pendingArchiveCount.toLocaleString()}</p>
              </div>
            </div>

            {archiveStats.oldestActive && (
              <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-700">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Oldest active detection: {new Date(archiveStats.oldestActive).toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="archiveDays">Archive Detections Older Than (Days)</Label>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[7, 30, 90, 180, 365].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={archiveSettings.archiveDays === days ? "default" : "outline"}
                    size="sm"
                    onClick={() => setArchiveSettings({ ...archiveSettings, archiveDays: days })}
                  >
                    {days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 90 ? '3 Months' : days === 180 ? '6 Months' : '1 Year'}
                  </Button>
                ))}
              </div>

              {/* Input with Increment/Decrement Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setArchiveSettings({
                    ...archiveSettings,
                    archiveDays: Math.max(7, archiveSettings.archiveDays - 1)
                  })}
                  disabled={archiveSettings.archiveDays <= 7}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  id="archiveDays"
                  type="number"
                  min="7"
                  placeholder="e.g., 30"
                  className="flex-1"
                  value={archiveSettings.archiveDays}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 7) {
                      setArchiveSettings({ ...archiveSettings, archiveDays: value });
                    }
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setArchiveSettings({
                    ...archiveSettings,
                    archiveDays: archiveSettings.archiveDays + 1
                  })}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Detections older than this many days will be automatically archived (runs every 24 hours)
              </p>

              {archiveSettings.archiveDays < 30 && (
                <div className="p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Warning: Archive period is set very low. Consider using 30+ days for better data retention.
                  </p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Archived detections are hidden from active views but remain in the database.
                Use the "Delete Detection Events" section below to permanently remove data.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveArchiveSettings} disabled={archiveLoading}>
                <Save className="h-4 w-4 mr-2" />
                {archiveLoading ? 'Saving...' : 'Save Archive Settings'}
              </Button>

              <Button
                onClick={handleArchiveNow}
                disabled={archivingNow}
                variant="outline"
              >
                <Database className="h-4 w-4 mr-2" />
                {archivingNow ? 'Archiving...' : 'Archive Now'}
              </Button>

              {archiveStats.archivedCount > 0 && (
                <Button
                  onClick={handleExportArchivedDetections}
                  variant="secondary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Archived ({archiveStats.archivedCount})
                </Button>
              )}
            </div>

            {archiveStats.pendingArchiveCount > 0 && (
              <div className="p-3 rounded-md bg-orange-500/10 border border-orange-500/20">
                <p className="text-sm text-orange-700">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  {archiveStats.pendingArchiveCount} detection(s) will be archived in the next automatic run
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIN Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Database Management PIN
            </CardTitle>
            <CardDescription>
              Set a 4-digit PIN to authorize database deletion operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div>
                <p className="text-sm font-medium">PIN Status</p>
                <p className="text-xs text-muted-foreground">
                  {pinStatus === null ? 'Checking...' : pinStatus ? 'PIN is set' : 'No PIN set'}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                pinStatus ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {pinStatus === null ? '...' : pinStatus ? 'Active' : 'Not Set'}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password *</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter your admin password"
                value={pinSettings.currentPassword}
                onChange={(e) =>
                  setPinSettings({ ...pinSettings, currentPassword: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPin">New 4-Digit PIN *</Label>
              <Input
                id="newPin"
                type="password"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pinSettings.newPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPinSettings({ ...pinSettings, newPin: value });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Must be exactly 4 digits (0-9)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN *</Label>
              <Input
                id="confirmPin"
                type="password"
                maxLength={4}
                placeholder="Re-enter PIN"
                value={pinSettings.confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setPinSettings({ ...pinSettings, confirmPin: value });
                }}
              />
            </div>

            <Button
              onClick={handleSetPin}
              disabled={pinLoading}
            >
              <Lock className="h-4 w-4 mr-2" />
              {pinLoading ? 'Setting PIN...' : pinStatus ? 'Update PIN' : 'Set PIN'}
            </Button>
          </CardContent>
        </Card>

        {/* Database Deletion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Detection Events
            </CardTitle>
            <CardDescription>
              Permanently delete detection events older than specified days (Admin only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Warning: This action cannot be undone!</p>
                <p className="text-xs text-muted-foreground">
                  All detection events, associated alerts, and snapshots older than the specified days will be permanently deleted from the database.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deleteDays">Delete Detections Older Than (Days) *</Label>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-2">
                {[0, 7, 30, 90, 180, 365].map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={parseInt(deletionForm.days) === days ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setDeletionForm({ ...deletionForm, days: days.toString() })}
                  >
                    {days === 0 ? 'All' : days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 90 ? '3 Months' : days === 180 ? '6 Months' : '1 Year'}
                  </Button>
                ))}
              </div>

              {/* Input with Increment/Decrement Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const currentDays = parseInt(deletionForm.days) || 0;
                    setDeletionForm({ ...deletionForm, days: Math.max(0, currentDays - 1).toString() });
                  }}
                  disabled={parseInt(deletionForm.days) <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>

                <Input
                  id="deleteDays"
                  type="number"
                  min="0"
                  placeholder="e.g., 30"
                  className="flex-1"
                  value={deletionForm.days}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = parseInt(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
                      setDeletionForm({ ...deletionForm, days: value });
                    }
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const currentDays = parseInt(deletionForm.days) || 0;
                    setDeletionForm({ ...deletionForm, days: (currentDays + 1).toString() });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Enter 0 to delete all detections, or specify number of days to keep recent data
              </p>

              {parseInt(deletionForm.days) === 0 && (
                <div className="p-2 rounded-md bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Danger: This will permanently delete ALL detection events from the database!
                  </p>
                </div>
              )}

              {parseInt(deletionForm.days) > 0 && parseInt(deletionForm.days) < 30 && (
                <div className="p-2 rounded-md bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Warning: Deletion period is set very low. Consider using 30+ days for better data retention.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-medium">Admin Verification Required</p>

              <div className="space-y-2">
                <Label htmlFor="deleteEmail">Admin Email *</Label>
                <Input
                  id="deleteEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={deletionForm.email}
                  onChange={(e) =>
                    setDeletionForm({ ...deletionForm, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deletePassword">Admin Password *</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  placeholder="Enter your password"
                  value={deletionForm.password}
                  onChange={(e) =>
                    setDeletionForm({ ...deletionForm, password: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deletePin">4-Digit PIN *</Label>
                <Input
                  id="deletePin"
                  type="password"
                  maxLength={4}
                  placeholder="Enter PIN"
                  value={deletionForm.pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setDeletionForm({ ...deletionForm, pin: value });
                  }}
                />
                {!pinStatus && (
                  <p className="text-xs text-destructive">
                    Please set a PIN first in the section above
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handleDeleteDetections}
              disabled={deletionLoading || !pinStatus}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletionLoading ? 'Deleting...' : 'Delete Detection Events'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
