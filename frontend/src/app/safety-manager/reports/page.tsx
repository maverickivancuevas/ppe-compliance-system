'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

export default function ReportsPage() {
  const [reportConfig, setReportConfig] = useState({
    type: 'weekly',
    format: 'pdf',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [generating, setGenerating] = useState(false);

  // Mock previous reports
  const previousReports = [
    {
      id: '1',
      title: 'Weekly Compliance Report',
      date: '2024-01-08',
      format: 'PDF',
      size: '2.4 MB',
    },
    {
      id: '2',
      title: 'Monthly Summary Report',
      date: '2024-01-01',
      format: 'CSV',
      size: '156 KB',
    },
    {
      id: '3',
      title: 'Daily Violations Report',
      date: '2023-12-28',
      format: 'PDF',
      size: '1.8 MB',
    },
  ];

  const handleGenerateReport = async () => {
    setGenerating(true);

    // Simulate report generation
    setTimeout(() => {
      setGenerating(false);
      alert(`Report generated successfully!\n\nType: ${reportConfig.type}\nFormat: ${reportConfig.format}\n\nIn production, this would generate a real ${reportConfig.format.toUpperCase()} file.`);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports"
        description="Generate and download compliance reports"
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generate Report Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate New Report</CardTitle>
                <CardDescription>
                  Create custom compliance and violation reports
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <select
                    value={reportConfig.type}
                    onChange={(e) =>
                      setReportConfig({ ...reportConfig, type: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="daily">Daily Summary</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <input
                      type="date"
                      value={reportConfig.start_date}
                      onChange={(e) =>
                        setReportConfig({ ...reportConfig, start_date: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <input
                      type="date"
                      value={reportConfig.end_date}
                      onChange={(e) =>
                        setReportConfig({ ...reportConfig, end_date: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="pdf"
                        checked={reportConfig.format === 'pdf'}
                        onChange={(e) =>
                          setReportConfig({ ...reportConfig, format: e.target.value })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">PDF Document</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="format"
                        value="csv"
                        checked={reportConfig.format === 'csv'}
                        onChange={(e) =>
                          setReportConfig({ ...reportConfig, format: e.target.value })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm">CSV Spreadsheet</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Report Will Include:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Total detections and compliance rate
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Violations breakdown by type and camera
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Daily/hourly trends and statistics
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Compliance charts and visualizations
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                      Recommendations and insights
                    </li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerateReport}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Report...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Report Options */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Reports</CardTitle>
                <CardDescription>Generate common reports instantly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Today's Summary
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  This Week
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Last 30 Days
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
                <CardDescription>Pre-configured report formats</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  Executive Summary
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  Detailed Violations
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  Compliance Certificate
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
                  Audit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Previous Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Previous Reports</CardTitle>
            <CardDescription>Download previously generated reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.date} • {report.format} • {report.size}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
