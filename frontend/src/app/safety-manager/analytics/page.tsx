'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { detectionsAPI, camerasAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    total_detections: 0,
    compliant_count: 0,
    violation_count: 0,
    compliance_rate: 0,
    common_violations: {} as Record<string, number>,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    try {
      const data = await detectionsAPI.getStats({
        start_date: dateRange.start,
        end_date: dateRange.end,
      });
      setStats(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate trend data (mock for visualization)
  const trendData = [
    { day: 'Mon', compliant: 85, violations: 15 },
    { day: 'Tue', compliant: 88, violations: 12 },
    { day: 'Wed', compliant: 82, violations: 18 },
    { day: 'Thu', compliant: 90, violations: 10 },
    { day: 'Fri', compliant: 87, violations: 13 },
    { day: 'Sat', compliant: 92, violations: 8 },
    { day: 'Sun', compliant: 89, violations: 11 },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Analytics Dashboard"
        description="PPE compliance trends, statistics, and insights"
      />

      <div className="p-6 space-y-6">
        {/* Date Range Filter */}
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
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <Button size="sm" variant="outline" onClick={loadAnalytics}>
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDateRange({
                  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  end: new Date().toISOString().split('T')[0],
                });
              }}
            >
              Last 7 Days
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDateRange({
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                  end: new Date().toISOString().split('T')[0],
                });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_detections}</div>
              <p className="text-xs text-muted-foreground mt-1">
                People detected in selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliant</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.compliant_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Workers with proper PPE
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Violations</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {stats.violation_count}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                PPE compliance violations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              {stats.compliance_rate >= 90 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.compliance_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.compliance_rate >= 90 ? 'Excellent' : 'Needs improvement'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compliance Trend Chart (Simplified) */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Trend</CardTitle>
              <CardDescription>Daily compliance rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {trendData.map((day, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col gap-1 items-center">
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${day.compliant * 2}px` }}
                        title={`Compliant: ${day.compliant}%`}
                      ></div>
                      <div
                        className="w-full bg-red-500 rounded-b"
                        style={{ height: `${day.violations * 2}px` }}
                        title={`Violations: ${day.violations}%`}
                      ></div>
                    </div>
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-muted-foreground">Violations</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Violation Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Violation Types</CardTitle>
              <CardDescription>Most common PPE violations</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.common_violations).length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">No violations recorded</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stats.common_violations)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => {
                      const percentage = stats.violation_count > 0
                        ? (count / stats.violation_count) * 100
                        : 0;
                      return (
                        <div key={type}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{type}</span>
                            <span className="text-sm text-muted-foreground">
                              {count} ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Insights & Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Insights & Recommendations</CardTitle>
            <CardDescription>AI-powered safety insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.compliance_rate >= 95 && (
                <div className="flex gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-500">Excellent Compliance</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your team maintains outstanding PPE compliance. Keep up the great work!
                    </p>
                  </div>
                </div>
              )}

              {stats.compliance_rate < 90 && stats.compliance_rate >= 75 && (
                <div className="flex gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-500">Compliance Warning</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Compliance rate is below target. Consider additional training or reminders.
                    </p>
                  </div>
                </div>
              )}

              {stats.compliance_rate < 75 && (
                <div className="flex gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-500">Immediate Action Required</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Critical compliance rate. Immediate intervention and training recommended.
                    </p>
                  </div>
                </div>
              )}

              {Object.keys(stats.common_violations).length > 0 && (
                <div className="flex gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-500">Focus Areas</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Most common violation: {Object.entries(stats.common_violations)[0]?.[0] || 'None'}.
                      Consider targeted training for this specific PPE requirement.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
