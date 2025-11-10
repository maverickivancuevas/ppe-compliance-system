'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LayoutDashboard,
  Camera,
  Users,
  AlertCircle,
  BarChart3,
  FileText,
  Settings,
  Bell,
  History,
  Video,
  Shield,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  HardHat,
  UserPlus,
  List,
  UserCircle,
  QrCode,
  ScanLine,
  TrendingUp,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Cameras',
    href: '/admin/cameras',
    icon: <Camera className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    roles: ['admin'],
  },
  {
    title: 'Settings',
    href: '/admin/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['admin'],
  },
];

const managerNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/safety-manager',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Monitoring',
    icon: <Video className="h-5 w-5" />,
    children: [
      {
        title: 'Live Monitoring',
        href: '/safety-manager/monitor',
        icon: <Video className="h-4 w-4" />,
      },
      {
        title: 'Detection History',
        href: '/safety-manager/detections',
        icon: <History className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Active Alerts',
    href: '/safety-manager/alerts',
    icon: <AlertCircle className="h-5 w-5" />,
  },
  {
    title: 'Captured Records',
    href: '/safety-manager/captured-records',
    icon: <Image className="h-5 w-5" />,
  },
  {
    title: 'Construction Workers',
    icon: <HardHat className="h-5 w-5" />,
    children: [
      {
        title: 'Add Worker',
        href: '/safety-manager/workers/add',
        icon: <UserPlus className="h-4 w-4" />,
      },
      {
        title: 'Worker List',
        href: '/safety-manager/workers',
        icon: <List className="h-4 w-4" />,
      },
      {
        title: 'QR Code Management',
        href: '/safety-manager/workers/qr-codes',
        icon: <QrCode className="h-4 w-4" />,
      },
      {
        title: 'Scan QR',
        href: '/safety-manager/workers/scan',
        icon: <ScanLine className="h-4 w-4" />,
      },
      {
        title: 'Performance Metrics',
        href: '/safety-manager/workers/metrics',
        icon: <TrendingUp className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Analytics',
    href: '/safety-manager/analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: 'Reports',
    href: '/safety-manager/reports',
    icon: <FileText className="h-5 w-5" />,
  },
];

const sharedNavItems: NavItem[] = [
  {
    title: 'Notifications',
    href: '/notifications',
    icon: <Bell className="h-5 w-5" />,
  },
  {
    title: 'Help',
    href: '/help',
    icon: <HelpCircle className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const navItems = user.role === 'admin' ? adminNavItems : managerNavItems;

  // Automatically open parent menus based on current pathname
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {};

    navItems.forEach((item) => {
      if (item.children) {
        // Check if any child's href matches the current pathname
        const hasActiveChild = item.children.some(
          (child) => child.href && pathname.startsWith(child.href)
        );
        if (hasActiveChild) {
          newOpenMenus[item.title] = true;
        }
      }
    });

    setOpenMenus(newOpenMenus);
  }, [pathname, navItems]);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-8 w-8 text-primary" />
        <div className="flex flex-col">
          <span className="font-bold text-sm">PPE Compliance</span>
          <span className="text-xs text-muted-foreground">Safety System</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openMenus[item.title];

            if (hasChildren) {
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  {isOpen && item.children && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href!}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isChildActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                          >
                            {child.icon}
                            <span>{child.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return item.href ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ) : null;
          })}
        </div>

        {/* Shared Items */}
        <div className="mt-6 space-y-1 border-t pt-4">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            General
          </p>
          {sharedNavItems.map((item) => {
            const isActive = pathname === item.href;
            return item.href ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            ) : null;
          })}
        </div>
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          size="sm"
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
