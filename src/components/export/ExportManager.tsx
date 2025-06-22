/**
 * Export Manager Component
 * Comprehensive export and reporting functionality for trading data
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  BarChart3,
  Calendar,
  Filter,
  Settings,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dataType: 'trades' | 'portfolio' | 'agents' | 'analytics' | 'risk' | 'custom';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    agents?: string[];
    symbols?: string[];
    strategies?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
  includeCharts: boolean;
  includeMetadata: boolean;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    schedule?: 'immediate' | 'daily' | 'weekly' | 'monthly';
  };
}

export interface ExportJob {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  format: string;
  dataType: string;
  size?: string;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

interface ExportManagerProps {
  className?: string;
}

export function ExportManager({ className = '' }: ExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'reports' | 'schedule'>('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dataType: 'trades',
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    filters: {},
    includeCharts: false,
    includeMetadata: true,
    emailDelivery: {
      enabled: false,
      recipients: []
    }
  });

  const [exportJobs, setExportJobs] = useState<ExportJob[]>([
    {
      id: 'job_001',
      name: 'Trading Performance Report Q1 2024',
      status: 'completed',
      progress: 100,
      format: 'PDF',
      dataType: 'analytics',
      size: '2.4 MB',
      downloadUrl: '/exports/trading-performance-q1-2024.pdf',
      createdAt: '2024-01-15 14:30',
      completedAt: '2024-01-15 14:32'
    },
    {
      id: 'job_002',
      name: 'Agent Activity Export',
      status: 'processing',
      progress: 67,
      format: 'Excel',
      dataType: 'agents',
      createdAt: '2024-01-15 15:45'
    },
    {
      id: 'job_003',
      name: 'Daily Risk Assessment',
      status: 'completed',
      progress: 100,
      format: 'CSV',
      dataType: 'risk',
      size: '156 KB',
      downloadUrl: '/exports/daily-risk-assessment.csv',
      createdAt: '2024-01-15 12:00',
      completedAt: '2024-01-15 12:01'
    }
  ]);

  const reportTemplates = [
    {
      id: 'daily_summary',
      name: 'Daily Trading Summary',
      description: 'Overview of daily trading activity, P&L, and key metrics',
      format: 'PDF',
      estimatedSize: '1-2 MB',
      duration: '~30 seconds',
      includes: ['Portfolio performance', 'Agent activity', 'Top trades', 'Risk metrics']
    },
    {
      id: 'weekly_performance',
      name: 'Weekly Performance Report',
      description: 'Comprehensive weekly analysis with charts and insights',
      format: 'PDF + Excel',
      estimatedSize: '5-8 MB',
      duration: '~2 minutes',
      includes: ['Performance charts', 'Strategy breakdown', 'Risk analysis', 'Market correlation']
    },
    {
      id: 'monthly_compliance',
      name: 'Monthly Compliance Report',
      description: 'Regulatory compliance report with audit trail',
      format: 'PDF',
      estimatedSize: '3-5 MB',
      duration: '~90 seconds',
      includes: ['Trade compliance', 'Risk compliance', 'Agent permissions', 'Audit logs']
    },
    {
      id: 'custom_analytics',
      name: 'Custom Analytics Dashboard',
      description: 'Flexible report with customizable metrics and timeframes',
      format: 'Multiple',
      estimatedSize: 'Variable',
      duration: '~1-5 minutes',
      includes: ['Custom metrics', 'Flexible timeframes', 'Agent selection', 'Export options']
    }
  ];

  const scheduledReports = [
    {
      id: 'sched_001',
      name: 'Daily Summary',
      template: 'daily_summary',
      schedule: 'Daily at 6:00 PM',
      recipients: ['trader@company.com', 'manager@company.com'],
      status: 'active',
      lastRun: '2024-01-15 18:00',
      nextRun: '2024-01-16 18:00'
    },
    {
      id: 'sched_002',
      name: 'Weekly Performance',
      template: 'weekly_performance',
      schedule: 'Weekly on Monday at 9:00 AM',
      recipients: ['executive@company.com'],
      status: 'active',
      lastRun: '2024-01-15 09:00',
      nextRun: '2024-01-22 09:00'
    }
  ];

  const handleExport = async () => {
    const newJob: ExportJob = {
      id: `job_${Date.now()}`,
      name: `${exportOptions.dataType} Export - ${new Date().toLocaleDateString()}`,
      status: 'pending',
      progress: 0,
      format: exportOptions.format.toUpperCase(),
      dataType: exportOptions.dataType,
      createdAt: new Date().toLocaleString()
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate export process
    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, status: 'processing', progress: 25 }
          : job
      ));
    }, 500);

    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { ...job, progress: 75 }
          : job
      ));
    }, 2000);

    setTimeout(() => {
      setExportJobs(prev => prev.map(job => 
        job.id === newJob.id 
          ? { 
              ...job, 
              status: 'completed', 
              progress: 100,
              size: '1.2 MB',
              downloadUrl: `/exports/${newJob.id}.${exportOptions.format}`,
              completedAt: new Date().toLocaleString()
            }
          : job
      ));
    }, 4000);
  };

  const handleGenerateReport = async (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId);
    if (!template) return;

    const newJob: ExportJob = {
      id: `report_${Date.now()}`,
      name: template.name,
      status: 'pending',
      progress: 0,
      format: template.format,
      dataType: 'report',
      createdAt: new Date().toLocaleString()
    };

    setExportJobs(prev => [newJob, ...prev]);

    // Simulate report generation
    const steps = [25, 50, 75, 100];
    const delays = [1000, 2000, 3000, 4000];

    steps.forEach((progress, index) => {
      setTimeout(() => {
        setExportJobs(prev => prev.map(job => 
          job.id === newJob.id 
            ? { 
                ...job, 
                status: progress === 100 ? 'completed' : 'processing',
                progress,
                ...(progress === 100 && {
                  size: template.estimatedSize.split('-')[0].trim(),
                  downloadUrl: `/reports/${newJob.id}.pdf`,
                  completedAt: new Date().toLocaleString()
                })
              }
            : job
        ));
      }, delays[index]);
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFormatIcon = (format: string) => {
    const lowerFormat = format.toLowerCase();
    if (lowerFormat.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (lowerFormat.includes('excel') || lowerFormat.includes('csv')) return <FileSpreadsheet className="h-4 w-4" />;
    if (lowerFormat.includes('image') || lowerFormat.includes('png')) return <FileImage className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'export', label: 'Data Export', icon: Download },
          { id: 'reports', label: 'Report Templates', icon: BarChart3 },
          { id: 'schedule', label: 'Scheduled Reports', icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Data Export Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Type</label>
                    <select 
                      value={exportOptions.dataType}
                      onChange={(e) => setExportOptions({...exportOptions, dataType: e.target.value as any})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="trades">Trading History</option>
                      <option value="portfolio">Portfolio Data</option>
                      <option value="agents">Agent Performance</option>
                      <option value="analytics">Analytics & Metrics</option>
                      <option value="risk">Risk Assessment</option>
                      <option value="custom">Custom Query</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Export Format</label>
                    <select 
                      value={exportOptions.format}
                      onChange={(e) => setExportOptions({...exportOptions, format: e.target.value as any})}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="csv">CSV (Comma Separated)</option>
                      <option value="excel">Excel Spreadsheet</option>
                      <option value="pdf">PDF Report</option>
                      <option value="json">JSON Data</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <input 
                      type="date"
                      value={exportOptions.dateRange.start}
                      onChange={(e) => setExportOptions({
                        ...exportOptions, 
                        dateRange: {...exportOptions.dateRange, start: e.target.value}
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <input 
                      type="date"
                      value={exportOptions.dateRange.end}
                      onChange={(e) => setExportOptions({
                        ...exportOptions, 
                        dateRange: {...exportOptions.dateRange, end: e.target.value}
                      })}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="includeCharts"
                      checked={exportOptions.includeCharts}
                      onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
                    />
                    <label htmlFor="includeCharts" className="text-sm">Include Charts & Visualizations</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id="includeMetadata"
                      checked={exportOptions.includeMetadata}
                      onChange={(e) => setExportOptions({...exportOptions, includeMetadata: e.target.checked})}
                    />
                    <label htmlFor="includeMetadata" className="text-sm">Include Metadata & Timestamps</label>
                  </div>
                </div>

                <Button onClick={handleExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Start Export
                </Button>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {exportJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          {getFormatIcon(job.format)}
                        </div>
                        <Badge variant={
                          job.status === 'completed' ? 'default' :
                          job.status === 'processing' ? 'secondary' :
                          job.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm font-medium mb-1">{job.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {job.format} • {job.size || 'Processing...'}
                      </div>
                      
                      {job.status === 'processing' && (
                        <Progress value={job.progress} className="h-1 mb-2" />
                      )}
                      
                      {job.status === 'completed' && job.downloadUrl && (
                        <Button size="sm" variant="outline" className="w-full">
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="font-medium">{template.format}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Size:</span>
                    <span className="font-medium">{template.estimatedSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{template.duration}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Includes:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.includes.map((item) => (
                      <Badge key={item} variant="outline" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => handleGenerateReport(template.id)}
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Scheduled Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-medium">{report.name}</div>
                      <Badge variant={report.status === 'active' ? 'default' : 'secondary'}>
                        {report.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Schedule:</span>
                        <div className="font-medium">{report.schedule}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Run:</span>
                        <div className="font-medium">{report.lastRun}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Next Run:</span>
                        <div className="font-medium">{report.nextRun}</div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-sm text-muted-foreground mb-1">Recipients:</div>
                      <div className="flex flex-wrap gap-1">
                        {report.recipients.map((email) => (
                          <Badge key={email} variant="outline" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">
                        Edit Schedule
                      </Button>
                      <Button size="sm" variant="outline">
                        Run Now
                      </Button>
                      <Button size="sm" variant="outline">
                        {report.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}