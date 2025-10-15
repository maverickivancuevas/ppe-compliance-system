'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Save } from 'lucide-react';

export default function SettingsPage() {
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Your Company',
    systemName: 'PPE Compliance System',
    timezone: 'UTC',
  });

  const [detectionSettings, setDetectionSettings] = useState({
    confidenceThreshold: '0.50',
    frameRate: '30',
    detectionInterval: '30',
    violationCooldown: '5',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    alertSeverityHigh: true,
    alertSeverityMedium: true,
    alertSeverityLow: false,
  });

  const handleSaveGeneral = () => {
    // In real implementation, save to backend
    alert('General settings saved successfully!');
  };

  const handleSaveDetection = () => {
    alert('Detection settings saved successfully!');
  };

  const handleSaveNotification = () => {
    alert('Notification settings saved successfully!');
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
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={generalSettings.timezone}
                onChange={(e) =>
                  setGeneralSettings({ ...generalSettings, timezone: e.target.value })
                }
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (US)</option>
                <option value="America/Chicago">Central Time (US)</option>
                <option value="America/Denver">Mountain Time (US)</option>
                <option value="America/Los_Angeles">Pacific Time (US)</option>
                <option value="Europe/London">London</option>
                <option value="Asia/Manila">Manila</option>
              </select>
            </div>

            <Button onClick={handleSaveGeneral}>
              <Save className="h-4 w-4 mr-2" />
              Save General Settings
            </Button>
          </CardContent>
        </Card>

        {/* Detection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Detection Settings</CardTitle>
            <CardDescription>
              Configure YOLOv8 detection parameters and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confidenceThreshold">
                Confidence Threshold (0.0 - 1.0)
              </Label>
              <Input
                id="confidenceThreshold"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={detectionSettings.confidenceThreshold}
                onChange={(e) =>
                  setDetectionSettings({
                    ...detectionSettings,
                    confidenceThreshold: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Higher values = fewer false positives, lower values = more detections
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frameRate">Target Frame Rate (FPS)</Label>
              <Input
                id="frameRate"
                type="number"
                value={detectionSettings.frameRate}
                onChange={(e) =>
                  setDetectionSettings({ ...detectionSettings, frameRate: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 30 FPS for smooth video, 15-20 FPS for lower resource usage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detectionInterval">
                Detection Save Interval (frames)
              </Label>
              <Input
                id="detectionInterval"
                type="number"
                value={detectionSettings.detectionInterval}
                onChange={(e) =>
                  setDetectionSettings({
                    ...detectionSettings,
                    detectionInterval: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Save detection to database every N frames (30 = once per second at 30 FPS)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="violationCooldown">
                Violation Cooldown (seconds)
              </Label>
              <Input
                id="violationCooldown"
                type="number"
                value={detectionSettings.violationCooldown}
                onChange={(e) =>
                  setDetectionSettings({
                    ...detectionSettings,
                    violationCooldown: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between alerts for the same violation
              </p>
            </div>

            <Button onClick={handleSaveDetection}>
              <Save className="h-4 w-4 mr-2" />
              Save Detection Settings
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure alert notifications and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Receive email alerts for violations
                </p>
              </div>
              <Button
                variant={notificationSettings.emailNotifications ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setNotificationSettings({
                    ...notificationSettings,
                    emailNotifications: !notificationSettings.emailNotifications,
                  })
                }
              >
                {notificationSettings.emailNotifications ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label>Alert Severity Levels</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">High Severity</span>
                  </div>
                  <Button
                    variant={
                      notificationSettings.alertSeverityHigh ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        alertSeverityHigh: !notificationSettings.alertSeverityHigh,
                      })
                    }
                  >
                    {notificationSettings.alertSeverityHigh ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <span className="text-sm">Medium Severity</span>
                  </div>
                  <Button
                    variant={
                      notificationSettings.alertSeverityMedium ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        alertSeverityMedium: !notificationSettings.alertSeverityMedium,
                      })
                    }
                  >
                    {notificationSettings.alertSeverityMedium ? 'On' : 'Off'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Low Severity</span>
                  </div>
                  <Button
                    variant={
                      notificationSettings.alertSeverityLow ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() =>
                      setNotificationSettings({
                        ...notificationSettings,
                        alertSeverityLow: !notificationSettings.alertSeverityLow,
                      })
                    }
                  >
                    {notificationSettings.alertSeverityLow ? 'On' : 'Off'}
                  </Button>
                </div>
              </div>
            </div>

            <Button onClick={handleSaveNotification} className="mt-4">
              <Save className="h-4 w-4 mr-2" />
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current system status and version</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Version</p>
                <p className="text-lg font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Environment</p>
                <p className="text-lg font-semibold">Development</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Backend Status</p>
                <p className="text-lg font-semibold text-green-500">Online</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Database</p>
                <p className="text-lg font-semibold">SQLite</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
