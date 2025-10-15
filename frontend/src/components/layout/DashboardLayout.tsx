'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'safety_manager';
}

export function DashboardLayout({ children, requiredRole }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then(() => {
      if (!user) {
        router.push('/login');
        return;
      }

      if (requiredRole && user.role !== requiredRole) {
        // Redirect to appropriate dashboard
        if (user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/safety-manager');
        }
      }
    });
  }, [user, requiredRole, router, checkAuth]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
