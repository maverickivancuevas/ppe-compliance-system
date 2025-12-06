'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Check, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const [step, setStep] = useState<'email' | 'otp' | 'details'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  const validatePassword = (pwd: string) => {
    setPasswordValidation({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    });
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send OTP');
      }

      setOtpSent(true);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid or expired verification code');
      }

      // OTP verified successfully, proceed to details step
      setStep('details');
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check all password requirements
    const allValid = Object.values(passwordValidation).every(v => v);
    if (!allValid) {
      setError('Password does not meet all requirements');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register-with-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      // Registration successful, redirect to login
      alert('Registration successful! Please login with your credentials.');
      router.push('/login');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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

      {/* Back to Login */}
      <Link href="/login" className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>
      </Link>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Create Admin Account</CardTitle>
          <CardDescription className="text-center">
            {step === 'email' && 'Enter your email to get started'}
            {step === 'otp' && 'Enter the verification code sent to your email'}
            {step === 'details' && 'Complete your account details'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Verification Code'}
              </Button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Check your email for the verification code. Code expires in 10 minutes.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('email')}
              >
                Use different email
              </Button>
            </form>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword(e.target.value);
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Password Requirements */}
              <div className="space-y-1 text-xs">
                <p className="font-medium">Password must contain:</p>
                <div className="space-y-1">
                  <div className={`flex items-center gap-2 ${passwordValidation.length ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.length ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.uppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.uppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.lowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.lowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.number ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.number ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One number
                  </div>
                  <div className={`flex items-center gap-2 ${passwordValidation.special ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordValidation.special ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    One special character
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setStep('otp')}
              >
                Back
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-8 py-6">
          <div className="flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Link href="/about" className="hover:text-primary hover:underline transition-colors font-medium">
                About PPE Compliance System
              </Link>
            </div>
            <span className="text-center">© 2024 Your Company. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
