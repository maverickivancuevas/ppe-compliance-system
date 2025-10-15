'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name,
        email: user.email,
      });
    }
  }, [user]);

  const handleUpdateProfile = () => {
    // In production, call API to update profile
    alert('Profile updated successfully!');
  };

  const handleChangePassword = () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match!');
      return;
    }
    if (passwordData.new_password.length < 8) {
      alert('Password must be at least 8 characters long!');
      return;
    }
    // In production, call API to change password
    alert('Password changed successfully!');
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: '',
    });
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Profile Settings"
        description="Manage your account information and preferences"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, full_name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                  />
                </div>

                <Button onClick={handleUpdateProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        current_password: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        new_password: e.target.value,
                      })
                    }
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirm_password: e.target.value,
                      })
                    }
                    placeholder="Re-enter new password"
                  />
                </div>

                <Button onClick={handleChangePassword}>
                  <Lock className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Account Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-lg font-semibold capitalize mt-1">
                    {user?.role.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-lg font-semibold">Active</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Member Since
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notif" className="cursor-pointer">
                    Email Alerts
                  </Label>
                  <Button variant="outline" size="sm">
                    On
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="violation-notif" className="cursor-pointer">
                    Violation Alerts
                  </Label>
                  <Button variant="outline" size="sm">
                    On
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="report-notif" className="cursor-pointer">
                    Weekly Reports
                  </Label>
                  <Button variant="outline" size="sm">
                    Off
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
