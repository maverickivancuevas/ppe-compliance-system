'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('Password reset instructions have been sent to your email. Redirecting...');
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to send reset email. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent"></div>

        {/* Subtle floating shapes */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md p-8 space-y-8 bg-background/60 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-black/5 relative z-10"
        >
          {/* Logo and Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-center mb-3">
              <div className="inline-flex p-3 rounded-full bg-primary/10">
                <Shield className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-center">Forgot Password?</h1>
            <p className="text-sm text-muted-foreground font-light text-center">
              Enter your email address and we'll send you instructions to reset your password
            </p>
          </div>

          {/* Forgot Password Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {message && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Instructions'}
            </Button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
