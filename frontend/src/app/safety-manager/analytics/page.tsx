'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { analyticsAPI, camerasAPI, detectionsAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Calendar, Download, BarChart3, Sun, Moon, MapPin, FileSpreadsheet } from 'lucide-react';

interface ComplianceTrendData {
  date: string;
  compliance_rate: number;
  total_detections: number;
  compliant: number;
  violations: number;
}

interface ViolationsByCamera {
  camera_id: string;
  camera_name: string;
  location: string;
  total_violations: number;
}

interface ViolationType {
  ppe_type: string;
  count: number;
  percentage: number;
}

interface AnalyticsSummary {
  total_detections: number;
  compliant_count: number;
  violation_count: number;
  compliance_rate: number;
  previous_compliance_rate: number;
  improvement_percentage: number;
}

interface HeatmapData {
  camera_id: string;
  camera_name: string;
  location: string;
  total_violations: number;
  violations_by_hour: { [key: string]: number };
}

interface ShiftAnalytics {
  day_shift: {
    name: string;
    time_range: string;
    total_detections: number;
    compliant_count: number;
    violation_count: number;
    compliance_rate: number;
    violation_types: { [key: string]: number };
  };
  night_shift: {
    name: string;
    time_range: string;
    total_detections: number;
    compliant_count: number;
    violation_count: number;
    compliance_rate: number;
    violation_types: { [key: string]: number };
  };
  comparison: {
    compliance_difference: number;
    better_shift: string;
  };
}

// Helper function to format date using local timezone (not UTC)
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary>({
    total_detections: 0,
    compliant_count: 0,
    violation_count: 0,
    compliance_rate: 0,
    previous_compliance_rate: 0,
    improvement_percentage: 0,
  });
  const [complianceTrend, setComplianceTrend] = useState<ComplianceTrendData[]>([]);
  const [violationsByCamera, setViolationsByCamera] = useState<ViolationsByCamera[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [shiftAnalytics, setShiftAnalytics] = useState<ShiftAnalytics | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    end: formatLocalDate(new Date()),
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCameras();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, selectedCamera]);

  const loadCameras = async () => {
    try {
      const data = await camerasAPI.getAll();
      setCameras(data);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const params: any = {
        start_date: dateRange.start,
        end_date: dateRange.end,
      };

      // Only add camera_id if a specific camera is selected
      if (selectedCamera !== 'all') {
        params.camera_id = selectedCamera;
      }

      const [summaryData, trendData, cameraData, typeData, heatmap, shifts] = await Promise.all([
        analyticsAPI.getSummary(params),
        analyticsAPI.getComplianceTrend(params),
        analyticsAPI.getViolationsByCamera(params),
        analyticsAPI.getViolationTypes(params),
        analyticsAPI.getHeatmap(params),
        analyticsAPI.getShiftAnalytics(params),
      ]);

      setSummary(summaryData);
      setComplianceTrend(trendData);
      setViolationsByCamera(cameraData);
      setViolationTypes(typeData);
      setHeatmapData(heatmap);
      setShiftAnalytics(shifts);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceTrendColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const maxViolations = Math.max(...violationsByCamera.map(v => v.total_violations), 1);

  const exportToPDF = async () => {
    // Dynamically import jsPDF and autoTable
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PPE Compliance Analytics Report', 14, 20);

    // Report metadata
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 28);
    doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 14, 33);
    doc.text(`Camera: ${selectedCamera === 'all' ? 'All Cameras' : cameras.find(c => c.id === selectedCamera)?.name || 'N/A'}`, 14, 38);

    let yPosition = 45;

    // Summary Statistics Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics', 14, yPosition);
    yPosition += 2;

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: [
        ['Total Detections', summary.total_detections.toString()],
        ['Compliant Detections', summary.compliant_count.toString()],
        ['Violations', summary.violation_count.toString()],
        ['Compliance Rate', `${summary.compliance_rate.toFixed(1)}%`],
        ['Previous Compliance Rate', `${summary.previous_compliance_rate.toFixed(1)}%`],
        ['Improvement', `${summary.improvement_percentage > 0 ? '+' : ''}${summary.improvement_percentage.toFixed(1)}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Compliance Trend Table
    if (complianceTrend.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Daily Compliance Trend', 14, yPosition);
      yPosition += 2;

      autoTable(doc, {
        startY: yPosition,
        head: [['Date', 'Total Detections', 'Compliant', 'Violations', 'Compliance Rate']],
        body: complianceTrend.map(item => [
          item.date,
          item.total_detections.toString(),
          item.compliant.toString(),
          item.violations.toString(),
          `${item.compliance_rate.toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Violations by Camera Table
    if (violationsByCamera.length > 0) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Violations by Camera', 14, yPosition);
      yPosition += 2;

      autoTable(doc, {
        startY: yPosition,
        head: [['Camera Name', 'Location', 'Total Violations']],
        body: violationsByCamera.map(item => [
          item.camera_name,
          item.location,
          item.total_violations.toString(),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Violation Types Table
    if (violationTypes.length > 0) {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Violation Types Breakdown', 14, yPosition);
      yPosition += 2;

      autoTable(doc, {
        startY: yPosition,
        head: [['PPE Type', 'Count', 'Percentage']],
        body: violationTypes.map(item => [
          item.ppe_type,
          item.count.toString(),
          `${item.percentage.toFixed(1)}%`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // Shift Analytics Table
    if (shiftAnalytics) {
      // Check if we need a new page
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Shift Analytics Comparison', 14, yPosition);
      yPosition += 2;

      autoTable(doc, {
        startY: yPosition,
        head: [['Shift', 'Time Range', 'Total Detections', 'Compliant', 'Violations', 'Compliance Rate']],
        body: [
          [
            shiftAnalytics.day_shift.name,
            shiftAnalytics.day_shift.time_range,
            shiftAnalytics.day_shift.total_detections.toString(),
            shiftAnalytics.day_shift.compliant_count.toString(),
            shiftAnalytics.day_shift.violation_count.toString(),
            `${shiftAnalytics.day_shift.compliance_rate.toFixed(1)}%`,
          ],
          [
            shiftAnalytics.night_shift.name,
            shiftAnalytics.night_shift.time_range,
            shiftAnalytics.night_shift.total_detections.toString(),
            shiftAnalytics.night_shift.compliant_count.toString(),
            shiftAnalytics.night_shift.violation_count.toString(),
            `${shiftAnalytics.night_shift.compliance_rate.toFixed(1)}%`,
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [234, 179, 8] },
      });
    }

    // Save the PDF
    const fileName = `PPE_Analytics_Report_${dateRange.start}_to_${dateRange.end}.pdf`;
    doc.save(fileName);
  };

  const exportToCSV = async () => {
    try {
      // Fetch all detections from the database with cache-busting timestamp
      const detections = await detectionsAPI.getAll({ _t: Date.now() });

      if (!detections || detections.length === 0) {
        alert('No detection data available to export');
        return;
      }

      // Group detections by camera
      const detectionsByCamera: { [key: string]: any[] } = {};

      detections.forEach((detection: any) => {
        const cameraId = detection.camera_id || 'Unknown';
        if (!detectionsByCamera[cameraId]) {
          detectionsByCamera[cameraId] = [];
        }
        detectionsByCamera[cameraId].push(detection);
      });

      // Create CSV content
      let csvContent = '';

      // Process each camera
      Object.keys(detectionsByCamera).sort().forEach((cameraId) => {
        const cameraDetections = detectionsByCamera[cameraId];
        const cameraName = cameras.find(c => c.id === cameraId)?.name || cameraId;
        const cameraLocation = cameras.find(c => c.id === cameraId)?.location || 'Unknown';

        // Camera header
        csvContent += `\nCamera: ${cameraName}\n`;
        csvContent += `Location: ${cameraLocation}\n`;
        csvContent += `Total Detections: ${cameraDetections.length}\n\n`;

        // CSV Headers
        csvContent += 'Detection ID,Timestamp,Person Detected,Hardhat Detected,No Hardhat,Safety Vest Detected,No Safety Vest,Is Compliant,Violation Type,Confidence Scores\n';

        // Add each detection
        cameraDetections.forEach((detection) => {
          const timestamp = new Date(detection.timestamp).toLocaleString();
          const confidenceScores = detection.confidence_scores
            ? (typeof detection.confidence_scores === 'string'
                ? detection.confidence_scores
                : JSON.stringify(detection.confidence_scores))
            : '';

          csvContent += `"${detection.id}",`;
          csvContent += `"${timestamp}",`;
          csvContent += `"${detection.person_detected ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.hardhat_detected ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.no_hardhat_detected ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.safety_vest_detected ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.no_safety_vest_detected ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.is_compliant ? 'Yes' : 'No'}",`;
          csvContent += `"${detection.violation_type || 'None'}",`;
          csvContent += `"${confidenceScores.replace(/"/g, '""')}"\n`;
        });

        csvContent += '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `PPE_Detections_Database_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-4">
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">PPE compliance trends, statistics, and insights</p>
          </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                setDateRange({
                  start: formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
                  end: formatLocalDate(new Date()),
                });
              }}>
                Last 7 Days
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setDateRange({
                  start: formatLocalDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
                  end: formatLocalDate(new Date()),
                });
              }}>
                Last 30 Days
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={exportToPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF Report
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={exportToCSV}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV Database
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Camera:</span>
                <select
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="all">All Cameras</option>
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Detections</p>
                  <p className="text-2xl font-bold">{summary.total_detections}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                People detected in selected period
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliant</p>
                  <p className="text-2xl font-bold text-green-500">{summary.compliant_count}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Workers with proper PPE
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Violations</p>
                  <p className="text-2xl font-bold text-red-500">{summary.violation_count}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                PPE compliance violations
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                  <p className="text-2xl font-bold">{summary.compliance_rate.toFixed(1)}%</p>
                </div>
                {summary.improvement_percentage >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                )}
              </div>
              <p className={`text-xs mt-2 ${summary.improvement_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {summary.improvement_percentage >= 0 ? '+' : ''}{summary.improvement_percentage.toFixed(1)}% since last period
              </p>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Trend Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-1">Compliance Trend</h3>
              <p className="text-sm text-muted-foreground mb-4">Daily compliance rate over time</p>

              {complianceTrend.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No data available for selected period</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 relative">
                  <svg width="100%" height="100%" viewBox="0 0 800 256" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="51" x2="800" y2="51" stroke="currentColor" strokeWidth="1" opacity="0.1" />
                    <line x1="0" y1="102" x2="800" y2="102" stroke="currentColor" strokeWidth="1" opacity="0.1" />
                    <line x1="0" y1="153" x2="800" y2="153" stroke="currentColor" strokeWidth="1" opacity="0.1" />
                    <line x1="0" y1="204" x2="800" y2="204" stroke="currentColor" strokeWidth="1" opacity="0.1" />

                    {/* Y-axis labels */}
                    <text x="5" y="15" fill="currentColor" fontSize="12" opacity="0.5">100%</text>
                    <text x="5" y="66" fill="currentColor" fontSize="12" opacity="0.5">75%</text>
                    <text x="5" y="117" fill="currentColor" fontSize="12" opacity="0.5">50%</text>
                    <text x="5" y="168" fill="currentColor" fontSize="12" opacity="0.5">25%</text>
                    <text x="5" y="219" fill="currentColor" fontSize="12" opacity="0.5">0%</text>

                    {/* Line path */}
                    <path
                      d={complianceTrend.map((day, idx) => {
                        const x = (idx / (complianceTrend.length - 1)) * 800;
                        const y = 204 - (day.compliance_rate / 100) * 204;
                        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                      }).join(' ')}
                      stroke="#eab308"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Area under line */}
                    <path
                      d={complianceTrend.map((day, idx) => {
                        const x = (idx / (complianceTrend.length - 1)) * 800;
                        const y = 204 - (day.compliance_rate / 100) * 204;
                        if (idx === 0) return `M ${x} ${y}`;
                        if (idx === complianceTrend.length - 1) return `L ${x} ${y} L ${x} 204 L 0 204 Z`;
                        return `L ${x} ${y}`;
                      }).join(' ')}
                      fill="#eab308"
                      opacity="0.1"
                    />

                    {/* Data points */}
                    {complianceTrend.map((day, idx) => {
                      const x = (idx / (complianceTrend.length - 1)) * 800;
                      const y = 204 - (day.compliance_rate / 100) * 204;
                      const color = day.compliance_rate >= 90 ? '#22c55e' : day.compliance_rate >= 75 ? '#eab308' : '#ef4444';

                      return (
                        <g key={idx}>
                          <circle
                            cx={x}
                            cy={y}
                            r="6"
                            fill={color}
                            stroke="white"
                            strokeWidth="2"
                            className="cursor-pointer hover:r-8 transition-all"
                          >
                            <title>{`${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}\n${day.compliance_rate.toFixed(1)}%\n${day.total_detections} detections`}</title>
                          </circle>
                        </g>
                      );
                    })}
                  </svg>

                  {/* X-axis labels */}
                  <div className="flex justify-between mt-2 px-2">
                    {complianceTrend.map((day, idx) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">≥90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-muted-foreground">75-89%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-muted-foreground">&lt;75%</span>
                </div>
              </div>
            </Card>

            {/* Violation Types Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-1">Violation Types</h3>
              <p className="text-sm text-muted-foreground mb-4">Most common PPE violations</p>

              {violationTypes.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No violations recorded</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {violationTypes.map((type, idx) => {
                    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500'];
                    const color = colors[idx % colors.length];

                    return (
                      <div key={type.ppe_type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{type.ppe_type}</span>
                          <span className="text-sm text-muted-foreground">
                            {type.count} ({type.percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-3">
                          <div
                            className={`${color} h-3 rounded-full transition-all`}
                            style={{ width: `${type.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Violations by Camera */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-1">Violations by Camera</h3>
            <p className="text-sm text-muted-foreground mb-4">Total violations per camera location</p>

            {violationsByCamera.length === 0 ? (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No violations recorded</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {violationsByCamera.map((camera) => {
                  const barWidth = (camera.total_violations / maxViolations) * 100;

                  return (
                    <div key={camera.camera_id}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium">{camera.camera_name}</p>
                          <p className="text-xs text-muted-foreground">{camera.location}</p>
                        </div>
                        <span className="text-sm font-bold text-red-500">
                          {camera.total_violations} violations
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-4">
                        <div
                          className="bg-red-500 h-4 rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Shift Analytics - Day vs Night */}
          {shiftAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Day Shift */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sun className="h-5 w-5 text-yellow-500" />
                      {shiftAnalytics.day_shift.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{shiftAnalytics.day_shift.time_range}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{shiftAnalytics.day_shift.compliance_rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Compliance</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Detections:</span>
                    <span className="font-medium">{shiftAnalytics.day_shift.total_detections}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compliant:</span>
                    <span className="font-medium text-green-500">{shiftAnalytics.day_shift.compliant_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Violations:</span>
                    <span className="font-medium text-red-500">{shiftAnalytics.day_shift.violation_count}</span>
                  </div>
                </div>

                {shiftAnalytics.day_shift.violation_count > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Common Violations:</p>
                    <div className="space-y-1">
                      {Object.entries(shiftAnalytics.day_shift.violation_types)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{type}:</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Night Shift */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Moon className="h-5 w-5 text-blue-500" />
                      {shiftAnalytics.night_shift.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{shiftAnalytics.night_shift.time_range}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{shiftAnalytics.night_shift.compliance_rate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Compliance</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Detections:</span>
                    <span className="font-medium">{shiftAnalytics.night_shift.total_detections}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Compliant:</span>
                    <span className="font-medium text-green-500">{shiftAnalytics.night_shift.compliant_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Violations:</span>
                    <span className="font-medium text-red-500">{shiftAnalytics.night_shift.violation_count}</span>
                  </div>
                </div>

                {shiftAnalytics.night_shift.violation_count > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Common Violations:</p>
                    <div className="space-y-1">
                      {Object.entries(shiftAnalytics.night_shift.violation_types)
                        .filter(([_, count]) => count > 0)
                        .map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{type}:</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {shiftAnalytics.comparison.compliance_difference !== 0 && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    shiftAnalytics.comparison.better_shift === 'night'
                      ? 'bg-blue-500/10 border border-blue-500/20'
                      : 'bg-yellow-500/10 border border-yellow-500/20'
                  }`}>
                    <p className="text-xs font-medium">
                      {shiftAnalytics.comparison.better_shift === 'night' ? '✓ Better Performance' : 'Needs Improvement'}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Violation Heatmap */}
          {heatmapData.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Violation Heatmap
              </h3>
              <p className="text-sm text-muted-foreground mb-6">Violations by location and time of day</p>

              <div className="space-y-6">
                {heatmapData.map((camera) => (
                  <div key={camera.camera_id}>
                    <div className="mb-3">
                      <p className="text-sm font-medium">{camera.camera_name}</p>
                      <p className="text-xs text-muted-foreground">{camera.location} - {camera.total_violations} total violations</p>
                    </div>

                    {/* Hour-by-hour heatmap */}
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 24 }).map((_, hour) => {
                        const violations = camera.violations_by_hour[hour.toString()] || 0;
                        const maxViolations = Math.max(...Object.values(camera.violations_by_hour));
                        const intensity = maxViolations > 0 ? (violations / maxViolations) : 0;

                        let bgColor = 'bg-secondary';
                        if (intensity > 0.7) bgColor = 'bg-red-500';
                        else if (intensity > 0.4) bgColor = 'bg-orange-500';
                        else if (intensity > 0.1) bgColor = 'bg-yellow-500';

                        return (
                          <div
                            key={hour}
                            className={`h-12 rounded ${bgColor} flex items-center justify-center text-xs font-medium relative group cursor-pointer transition-all hover:scale-105`}
                            title={`${hour}:00 - ${violations} violations`}
                          >
                            <span className={violations > 0 ? 'text-white' : 'text-muted-foreground'}>
                              {hour}
                            </span>
                            {violations > 0 && (
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                {violations} violations
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-red-500 rounded"></div>
                        <span className="text-muted-foreground">High</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-orange-500 rounded"></div>
                        <span className="text-muted-foreground">Medium</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-yellow-500 rounded"></div>
                        <span className="text-muted-foreground">Low</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-secondary rounded"></div>
                        <span className="text-muted-foreground">None</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
      </main>
    </DashboardLayout>
  );
}
