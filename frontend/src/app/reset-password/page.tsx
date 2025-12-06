'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      setIsLoading(false);
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter');
      setIsLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('Password must contain at least one digit');
      setIsLoading(false);
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError('Password must contain at least one special character');
      setIsLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      if (response.ok) {
        setMessage('Password has been reset successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to reset password. Please try again.');
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
            <h1 className="text-3xl font-extrabold tracking-tight text-center">Reset Password</h1>
            <p className="text-sm text-muted-foreground font-light text-center">
              Enter the verification code sent to your email and create a new password
            </p>
          </div>

          {/* Reset Password Form */}
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
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || !!emailFromUrl}
                className="h-12 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="otp" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={isLoading}
                maxLength={6}
                className="h-12 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center text-2xl tracking-widest font-bold"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 pr-11 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 pl-11 pr-11 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-lg">
              <p className="font-semibold">Password Requirements:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>At least 8 characters long</li>
                <li>One uppercase letter (A-Z)</li>
                <li>One lowercase letter (a-z)</li>
                <li>One digit (0-9)</li>
                <li>One special character (!@#$%^&*...)</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
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
