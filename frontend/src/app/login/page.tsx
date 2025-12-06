'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Camera, AlertTriangle, FileText, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<'form' | 'hero' | null>(null);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [settings, setSettings] = useState<{ company_name: string; system_name: string; logo_url?: string } | null>(null);

  useEffect(() => {
    // Fetch general settings for logo and company name
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/settings/general`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => {
        console.error('Failed to load settings:', err);
        // Set defaults only if fetch fails
        setSettings({
          company_name: 'Your Company',
          system_name: 'PPE Compliance System',
        });
      });

    // Load remembered email from localStorage
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check if desktop
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mediaQuery.matches);

    const handleResize = () => {
      setIsDesktop(mediaQuery.matches);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const user = useAuthStore.getState().user;

      // Redirect based on role
      if (user?.role === 'super_admin' || user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/safety-manager');
      }
    } catch (err) {
      // Error is handled by store - don't clear form fields
      console.error('Login failed:', err);
      // Keep email and password values in state
    }
  };

  // Calculate dynamic widths based on hovered section or form focus
  const getFormWidth = () => {
    if (!isDesktop) return 100;
    // Keep form expanded when focused (typing in input)
    if (isFormFocused) return 65;
    if (hoveredSection === 'form') return 65; // Form expanded
    if (hoveredSection === 'hero') return 35; // Form shrunk
    return 50; // Balanced default
  };

  const getHeroWidth = () => {
    if (!isDesktop) return 0;
    // Keep hero shrunk when form is focused
    if (isFormFocused) return 35;
    if (hoveredSection === 'form') return 35; // Hero shrunk
    if (hoveredSection === 'hero') return 65; // Hero expanded
    return 50; // Balanced default
  };

  const formWidth = getFormWidth();
  const heroWidth = getHeroWidth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main Content - Split Screen */}
      <div
        className="flex-1 flex flex-col lg:flex-row"
        onMouseLeave={() => setHoveredSection(null)}
      >
        {/* Left Side - Login Form (Dynamic width based on hover) */}
        <div
          className="flex items-center justify-center px-6 py-12 lg:px-12 relative overflow-hidden transition-all duration-300 ease-out bg-background"
          style={{ width: `${formWidth}%` }}
          onMouseEnter={() => setHoveredSection('form')}
        >
          {/* Subtle construction pattern background */}
          <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02]" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px),
                             repeating-linear-gradient(-45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)`
          }}></div>

          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md p-10 space-y-10 bg-background/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl shadow-black/5 relative z-10"
          >
            {/* Logo and Title */}
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                {settings?.logo_url ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${settings.logo_url}`}
                    alt={settings.company_name}
                    className="h-16 w-auto object-contain"
                  />
                ) : (
                  <div className="inline-flex p-3 rounded-full bg-primary/10">
                    <Shield className="h-10 w-10 text-primary" />
                  </div>
                )}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-center">{settings?.system_name || 'Loading...'}</h1>
              <p className="text-sm text-muted-foreground font-light text-center">Ensuring Safety Through Automation</p>
              <p className="text-xs text-muted-foreground/70 text-center pt-1">Sign in to your account to continue</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
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
                    onFocus={() => setIsFormFocused(true)}
                    onBlur={() => setIsFormFocused(false)}
                    required
                    disabled={isLoading}
                    className="h-12 pl-11 border-muted-foreground/20 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsFormFocused(true)}
                    onBlur={() => setIsFormFocused(false)}
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

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-muted-foreground/20 text-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-primary hover:underline font-semibold transition-colors">
                    Create Admin Account
                  </Link>
                </p>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Right Side - Hero Section (Dynamic width based on hover) */}
        <div
          className="hidden lg:flex relative overflow-hidden transition-all duration-300 ease-out p-12 items-center justify-center"
          style={{ width: `${heroWidth}%` }}
          onMouseEnter={() => setHoveredSection('hero')}
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-purple-500/10 to-blue-500/10 animate-gradient"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent"></div>

          {/* Floating shapes for depth */}
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

          {/* Subtle fade gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent pointer-events-none"></div>
          <div className="max-w-2xl w-full space-y-10 relative z-10 mt-16">
            {/* Hero Image - Full bleed */}
            <div className="relative w-full aspect-[4/3] overflow-hidden shadow-2xl rounded-xl">
              {/* Subtle overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent z-10"></div>
              <img
                src="/hero-image.jpeg"
                alt="PPE Compliance Safety"
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Tagline */}
            <div className="text-center space-y-4">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-3xl lg:text-4xl font-bold leading-tight animate-gradient-text"
              >
                AI-Powered Workplace Safety
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-muted-foreground text-lg"
              >
                Protect your workforce with real-time PPE detection and automated compliance monitoring
              </motion.p>
            </div>

            {/* Features */}
            <div className="grid gap-6">
              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10 hover:bg-background/80 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5 text-base">Real-time Detection</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Monitor PPE compliance across all cameras with instant alerts
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10 hover:bg-background/80 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10">
                  <AlertTriangle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5 text-base">Automated Alerts</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get notified immediately when safety violations are detected
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-white/10 hover:bg-background/80 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
              >
                <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5 text-base">Compliance Reporting</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Generate detailed reports and track safety trends over time
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
