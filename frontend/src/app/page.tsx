'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth().then(() => {
      if (user) {
        // Redirect based on role
        if (user.role === 'super_admin' || user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/safety-manager');
        }
      } else {
        router.push('/login');
      }
    });
  }, [user, checkAuth, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Loading...</h1>
        <p className="text-muted-foreground">Please wait</p>
      </div>
    </div>
  );
}
