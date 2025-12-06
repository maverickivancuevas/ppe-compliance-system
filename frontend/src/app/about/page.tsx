'use client';

import { Shield, ArrowLeft, Camera, AlertTriangle, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import Link from 'next/link';

export default function AboutPage() {
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
      <div className="flex-1 container mx-auto px-8 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">About PPE Compliance System</h1>
          <p className="text-xl text-muted-foreground">
            AI-Powered Workplace Safety Monitoring
          </p>
        </div>

        {/* Mission */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            The PPE Compliance System is designed to enhance workplace safety through advanced AI technology.
            Our mission is to protect workers by ensuring proper Personal Protective Equipment (PPE) usage
            across all work environments. Using real-time computer vision and deep learning, we help organizations
            maintain compliance, prevent accidents, and create safer workplaces.
          </p>
        </div>

        {/* Key Features */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Key Features</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 h-fit">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Real-time Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor PPE compliance across multiple camera feeds simultaneously with instant detection
                  of hardhats, safety vests, and other protective equipment.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 h-fit">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Automated Alerts</h3>
                <p className="text-sm text-muted-foreground">
                  Receive immediate email notifications with photo evidence when safety violations are
                  detected, enabling quick response and intervention.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 h-fit">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Compliance Reporting</h3>
                <p className="text-sm text-muted-foreground">
                  Generate comprehensive compliance reports with violation tracking, incident history,
                  and trend analysis to support safety audits.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="flex-shrink-0 p-3 rounded-lg bg-primary/10 h-fit">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-2">Multi-User Management</h3>
                <p className="text-sm text-muted-foreground">
                  Support for multiple user roles including super admins, admins, and safety managers
                  with customizable access controls.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technology */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Technology</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Built on cutting-edge technology, the PPE Compliance System leverages:
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>YOLOv8 Deep Learning Model</strong> - State-of-the-art object detection for accurate PPE identification</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Real-time Video Processing</strong> - Process multiple camera feeds simultaneously with minimal latency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Cloud-Based Architecture</strong> - Scalable deployment with secure data storage and access</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span><strong>Modern Web Interface</strong> - Intuitive dashboard built with Next.js and React for seamless user experience</span>
            </li>
          </ul>
        </div>

        {/* Contact/Support */}
        <div className="text-center p-8 rounded-lg border bg-card">
          <h2 className="text-2xl font-semibold mb-3">Need Help?</h2>
          <p className="text-muted-foreground mb-6">
            For technical support, questions, or feedback about the PPE Compliance System,
            please contact your system administrator.
          </p>
          <Link href="/login">
            <Button>
              Go to Login
            </Button>
          </Link>
        </div>
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
