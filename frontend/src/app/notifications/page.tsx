'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'alert' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'alert',
      title: 'New Violation Detected',
      message: 'Worker without hardhat detected at Main Entrance camera',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      read: false,
    },
    {
      id: '2',
      type: 'alert',
      title: 'Multiple Violations',
      message: '3 violations detected in the last hour at Loading Dock',
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      read: false,
    },
    {
      id: '3',
      type: 'success',
      title: 'Compliance Target Met',
      message: 'Daily compliance rate reached 95% - Great job!',
      timestamp: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
      read: true,
    },
    {
      id: '4',
      type: 'info',
      title: 'Weekly Report Ready',
      message: 'Your weekly compliance report is ready to download',
      timestamp: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
      read: true,
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
    }
  };

  const filteredNotifications = notifications.filter((notif) =>
    filter === 'all' ? true : !notif.read
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        description="View all system notifications and alerts"
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Filter Bar */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </Button>
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  Mark All as Read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'No notifications to display'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => (
              <Card
                key={notif.id}
                className={`p-4 transition-colors ${
                  !notif.read ? 'bg-accent/50 border-primary/20' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">{getIcon(notif.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4
                          className={`font-medium ${!notif.read ? 'text-foreground' : ''}`}
                        >
                          {notif.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notif.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {getTimestamp(notif.timestamp)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        {!notif.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            title="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notif.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
