'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MonitorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to multi-camera monitoring page
    router.replace('/safety-manager/monitor/multi');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Redirecting to Live Monitoring...</p>
      </div>
    </div>
  );
}
