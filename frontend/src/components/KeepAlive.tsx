'use client';

import { useEffect } from 'react';

/**
 * KeepAlive Component
 * Pings the backend every 5 minutes to prevent Render free tier from spinning down
 */
export function KeepAlive() {
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // Ping function
    const pingBackend = async () => {
      try {
        // Use a lightweight endpoint
        await fetch(`${API_URL}/api/cameras/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('[KeepAlive] Backend pinged successfully');
      } catch (error) {
        console.error('[KeepAlive] Failed to ping backend:', error);
      }
    };

    // Ping immediately on mount
    pingBackend();

    // Set up interval to ping every 5 minutes (300000ms)
    const interval = setInterval(pingBackend, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
}
