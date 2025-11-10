'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';
import { reportsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function ReportsPage() {
  const { toast } = useToast();
  const [reportConfig, setReportConfig] = useState({
    type: 'weekly',
    format: 'pdf',
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [generating, setGenerating] = useState(false);

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    setGenerating(true);

    try {
      const response = await reportsAPI.generate({
        report_type: reportConfig.type,
        format: reportConfig.format,
        start_date: reportConfig.start_date,
        end_date: reportConfig.end_date
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `report.${reportConfig.format}`;

      downloadFile(response.data, filename);

      toast({
        title: 'Success',
        description: `${reportConfig.format.toUpperCase()} report generated successfully`
      });
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to generate report',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickReport = async (reportType: string, format: string = 'pdf') => {
    try {
      toast({
        title: 'Generating Report',
        description: 'Please wait...'
      });

      const response = await reportsAPI.generateQuick(reportType, format);

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `quick_report_${reportType}.${format}`;

      downloadFile(response.data, filename);

      toast({
        title: 'Success',
        description: `Quick report generated successfully`
      });
    } catch (error: any) {
      console.error('Error generating quick report:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to generate quick report',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadTemplate = async (templateType: string) => {
    try {
      toast({
        title: 'Downloading Template',
        description: 'Please wait...'
      });

      const response = await reportsAPI.downloadTemplate(templateType);

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `${templateType}_template.pdf`;

      downloadFile(response.data, filename);

      toast({
        title: 'Success',
        description: 'Template downloaded successfully'
      });
    } catch (error: any) {
      console.error('Error downloading template:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to download template',
        variant: 'destructive'
      });
    }
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
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => handleQuickReport('today', reportConfig.format)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Today's Summary
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => handleQuickReport('week', reportConfig.format)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  This Week
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="sm"
                  onClick={() => handleQuickReport('month', reportConfig.format)}
                >
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
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  size="sm"
                  onClick={() => handleDownloadTemplate('executive_summary')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Executive Summary
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  size="sm"
                  onClick={() => handleDownloadTemplate('detailed_violations')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Detailed Violations
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  size="sm"
                  onClick={() => handleDownloadTemplate('compliance_certificate')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Compliance Certificate
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm"
                  size="sm"
                  onClick={() => handleDownloadTemplate('audit_report')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Audit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
