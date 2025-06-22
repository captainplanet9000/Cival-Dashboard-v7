/**
 * Performance Monitor Component
 * Real-time performance metrics and optimization insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  performanceMonitor, 
  useMemoryMonitor, 
  memoryCache,
  requestPool 
} from '@/lib/performance/optimization';
import {
  Activity,
  Zap,
  Database,
  Network,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
  HardDrive
} from 'lucide-react';

interface PerformanceMonitorProps {
  className?: string;
  showDetails?: boolean;
}

export function PerformanceMonitor({ className = '', showDetails = false }: PerformanceMonitorProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<any>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const memoryInfo = useMemoryMonitor();

  useEffect(() => {
    const updateMetrics = () => {
      setPerformanceMetrics(performanceMonitor.getMetrics());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, []);

  const getPerformanceStatus = () => {
    const avgRenderTime = performanceMetrics.render?.avg || 0;
    const avgApiTime = performanceMetrics.api_call?.avg || 0;
    const memoryUsage = memoryInfo?.usage || 0;

    if (avgRenderTime > 100 || avgApiTime > 1000 || memoryUsage > 80) {
      return { status: 'warning', color: 'orange', message: 'Performance issues detected' };
    } else if (avgRenderTime > 50 || avgApiTime > 500 || memoryUsage > 60) {
      return { status: 'moderate', color: 'yellow', message: 'Performance could be improved' };
    } else {
      return { status: 'good', color: 'green', message: 'Performance is optimal' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const handleClearCache = () => {
    memoryCache.invalidate();
    performanceMonitor.clearMetrics();
    setPerformanceMetrics({});
  };

  if (!showDetails) {
    // Compact view
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {performanceStatus.status === 'good' ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : performanceStatus.status === 'moderate' ? (
            <Activity className="h-4 w-4 text-yellow-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
          <Badge 
            variant={
              performanceStatus.status === 'good' ? 'default' : 
              performanceStatus.status === 'moderate' ? 'secondary' : 'destructive'
            }
            className="text-xs"
          >
            {performanceStatus.status === 'good' ? 'Optimal' : 
             performanceStatus.status === 'moderate' ? 'Good' : 'Slow'}
          </Badge>
        </div>
        {memoryInfo && (
          <div className="text-xs text-muted-foreground">
            Memory: {memoryInfo.usage.toFixed(1)}%
          </div>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={
                performanceStatus.status === 'good' ? 'default' : 
                performanceStatus.status === 'moderate' ? 'secondary' : 'destructive'
              }>
                {performanceStatus.message}
              </Badge>
              <Button size="sm" variant="outline" onClick={handleClearCache}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Clear Cache
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Render Performance */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Render Time</span>
              </div>
              <div className="text-lg font-bold">
                {performanceMetrics.render ? formatTime(performanceMetrics.render.avg) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                {performanceMetrics.render && `${performanceMetrics.render.count} renders`}
              </div>
            </div>

            {/* API Performance */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Network className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">API Calls</span>
              </div>
              <div className="text-lg font-bold">
                {performanceMetrics.api_call ? formatTime(performanceMetrics.api_call.avg) : 'N/A'}
              </div>
              <div className="text-xs text-muted-foreground">
                {performanceMetrics.api_call && `${performanceMetrics.api_call.count} requests`}
              </div>
            </div>

            {/* Cache Performance */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Cache</span>
              </div>
              <div className="text-lg font-bold">{memoryCache.size()}</div>
              <div className="text-xs text-muted-foreground">cached items</div>
            </div>

            {/* Active Requests */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Active Requests</span>
              </div>
              <div className="text-lg font-bold">{requestPool.getActiveRequestCount()}</div>
              <div className="text-xs text-muted-foreground">in progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Usage */}
      {memoryInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Heap Usage</span>
                  <span className="text-sm text-muted-foreground">
                    {memoryInfo.usage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={memoryInfo.usage} className="h-2" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Used:</span>
                  <div className="font-medium">{formatBytes(memoryInfo.usedJSHeapSize)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <div className="font-medium">{formatBytes(memoryInfo.totalJSHeapSize)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Limit:</span>
                  <div className="font-medium">{formatBytes(memoryInfo.jsHeapSizeLimit)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Metrics */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(performanceMetrics).map(([label, metrics]: [string, any]) => (
                <div key={label} className="p-3 border rounded-lg">
                  <div className="font-medium mb-2 capitalize">{label.replace('_', ' ')}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Average:</span>
                      <div className="font-medium">{formatTime(metrics.avg)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Min:</span>
                      <div className="font-medium">{formatTime(metrics.min)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max:</span>
                      <div className="font-medium">{formatTime(metrics.max)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Count:</span>
                      <div className="font-medium">{metrics.count}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {memoryInfo?.usage > 80 && (
              <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="font-medium text-red-700">High Memory Usage</span>
                </div>
                <p className="text-sm text-red-600">
                  Memory usage is above 80%. Consider closing unused tabs or clearing cache.
                </p>
              </div>
            )}

            {performanceMetrics.render?.avg > 100 && (
              <div className="p-3 border border-orange-200 rounded-lg bg-orange-50">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="font-medium text-orange-700">Slow Rendering</span>
                </div>
                <p className="text-sm text-orange-600">
                  Average render time is above 100ms. Consider optimizing component re-renders.
                </p>
              </div>
            )}

            {performanceMetrics.api_call?.avg > 1000 && (
              <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex items-center gap-2 mb-1">
                  <Network className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-yellow-700">Slow API Calls</span>
                </div>
                <p className="text-sm text-yellow-600">
                  Average API response time is above 1 second. Check network connection.
                </p>
              </div>
            )}

            {memoryCache.size() > 800 && (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-blue-700">Large Cache Size</span>
                </div>
                <p className="text-sm text-blue-600">
                  Cache has {memoryCache.size()} items. Consider clearing cache to free memory.
                </p>
              </div>
            )}

            {Object.keys(performanceMetrics).length === 0 && memoryInfo?.usage < 60 && (
              <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-green-700">Performance is Good</span>
                </div>
                <p className="text-sm text-green-600">
                  No performance issues detected. The application is running optimally.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          variant="outline" 
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Metrics
        </Button>
      </div>
    </div>
  );
}