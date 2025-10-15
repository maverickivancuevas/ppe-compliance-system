'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HelpCircle,
  Book,
  Video,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Camera,
  Users,
  BarChart,
} from 'lucide-react';

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqs = [
    {
      id: '1',
      question: 'How do I add a new camera?',
      answer:
        'Navigate to Admin > Cameras, click "Add Camera", fill in the camera details (name, location, stream URL), and click "Create Camera". Use "0" for your default webcam or provide a video file path.',
    },
    {
      id: '2',
      question: 'How do I start monitoring a camera?',
      answer:
        'Go to Safety Manager > Live Monitoring, select a camera from the dropdown, and click "Start Monitoring". The system will begin real-time PPE detection.',
    },
    {
      id: '3',
      question: 'What does "Compliance Rate" mean?',
      answer:
        'Compliance rate is the percentage of workers detected with proper PPE (both hardhat and safety vest) out of all workers detected. A higher rate indicates better safety compliance.',
    },
    {
      id: '4',
      question: 'How do I acknowledge an alert?',
      answer:
        'Go to Safety Manager > Active Alerts, find the alert you want to acknowledge, and click the "Acknowledge" button. This marks the alert as reviewed.',
    },
    {
      id: '5',
      question: 'How do I generate a report?',
      answer:
        'Navigate to Safety Manager > Reports, select the report type and date range, choose your preferred format (PDF or CSV), and click "Generate Report".',
    },
    {
      id: '6',
      question: 'Can I export detection data?',
      answer:
        'Yes! Go to Safety Manager > Detection History, apply any filters you need, and click "Export CSV" to download all detection data.',
    },
    {
      id: '7',
      question: 'How do I change my password?',
      answer:
        'Click on your profile in the sidebar, go to Profile Settings, scroll to "Change Password" section, enter your current and new password, then click "Change Password".',
    },
    {
      id: '8',
      question: 'What are the PPE detection classes?',
      answer:
        'The system detects 5 classes: Person, Hardhat, No-Hardhat, Safety Vest, and No-Safety Vest. A worker is compliant when both Hardhat and Safety Vest are detected.',
    },
  ];

  const quickStartSteps = [
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Set Up Users',
      description: 'Admin: Create safety manager accounts for your team',
    },
    {
      icon: <Camera className="h-6 w-6" />,
      title: 'Add Cameras',
      description: 'Admin: Configure monitoring cameras in your facilities',
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: 'Start Monitoring',
      description: 'Manager: Begin real-time PPE detection monitoring',
    },
    {
      icon: <BarChart className="h-6 w-6" />,
      title: 'View Analytics',
      description: 'Manager: Track compliance rates and generate reports',
    },
  ];

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Help & Documentation"
        description="Get help and learn how to use the PPE Compliance System"
      />

      <div className="p-6 space-y-6">
        {/* Quick Start Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Quick Start Guide
            </CardTitle>
            <CardDescription>Get started in 4 easy steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickStartSteps.map((step, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {step.icon}
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                  <h4 className="font-semibold mb-1">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Video Tutorials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Getting Started</p>
                <p className="text-xs text-muted-foreground">5 min overview</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Camera Setup</p>
                <p className="text-xs text-muted-foreground">3 min tutorial</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Live Monitoring</p>
                <p className="text-xs text-muted-foreground">4 min guide</p>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">User Guide (PDF)</p>
                <p className="text-xs text-muted-foreground">Complete manual</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">API Documentation</p>
                <p className="text-xs text-muted-foreground">For developers</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Release Notes</p>
                <p className="text-xs text-muted-foreground">What's new</p>
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Contact Support</p>
                <p className="text-xs text-muted-foreground">Get help from our team</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Report a Bug</p>
                <p className="text-xs text-muted-foreground">Help us improve</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors">
                <p className="font-medium text-sm">Feature Request</p>
                <p className="text-xs text-muted-foreground">Suggest improvements</p>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Common questions and answers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.id} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full p-4 text-left flex items-center justify-between hover:bg-accent transition-colors"
                >
                  <span className="font-medium">{faq.question}</span>
                  {expandedFaq === faq.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                {expandedFaq === faq.id && (
                  <div className="p-4 pt-0 text-sm text-muted-foreground border-t">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Backend Status</p>
                <p className="font-semibold text-green-500">Online</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">API Docs</p>
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  Open
                </a>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License</p>
                <p className="font-semibold">Enterprise</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
