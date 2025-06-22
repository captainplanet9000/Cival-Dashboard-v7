'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
  ssr: false,
  loading: () => <ChartSkeleton />
});

interface BaseChartProps {
  title: string;
  description?: string;
  chartData?: string; // JSON string from API
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  className?: string;
  height?: number;
  actions?: React.ReactNode;
}

// Loading skeleton component
function ChartSkeleton() {
  return (
    <div className="w-full h-[400px] flex items-center justify-center bg-muted/10 rounded-lg animate-pulse">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 bg-muted rounded-full mx-auto animate-spin" />
        <p className="text-sm text-muted-foreground">Loading chart...</p>
      </div>
    </div>
  );
}

// Error display component
function ChartError({ error, onRefresh }: { error: string; onRefresh?: () => void }) {
  return (
    <div className="w-full h-[400px] flex items-center justify-center bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="text-center space-y-4 p-6">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <div className="space-y-2">
          <h3 className="font-semibold text-destructive">Chart Error</h3>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export function BaseChart({
  title,
  description,
  chartData,
  isLoading = false,
  error = null,
  onRefresh,
  className,
  height = 400,
  actions,
}: BaseChartProps) {
  const plotlyData = useMemo(() => {
    if (!chartData) return null;
    
    try {
      return JSON.parse(chartData);
    } catch (err) {
      console.error('Failed to parse chart data:', err);
      return null;
    }
  }, [chartData]);

  const plotConfig = useMemo(() => ({
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'pan2d',
      'lasso2d',
      'select2d',
      'autoScale2d',
      'hoverClosestCartesian',
      'hoverCompareCartesian',
      'toggleSpikelines'
    ] as any[],
    modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawclosedpath', 'drawrect'] as any[],
    responsive: true,
  }), []);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error ? (
          <ChartError error={error} onRefresh={onRefresh} />
        ) : isLoading ? (
          <ChartSkeleton />
        ) : plotlyData ? (
          <div className="w-full">
            <Plot
              data={plotlyData.data}
              layout={{
                ...plotlyData.layout,
                height,
                autosize: true,
                margin: { l: 50, r: 20, t: 20, b: 50 },
                font: {
                  family: 'ui-sans-serif, system-ui, sans-serif',
                  size: 12,
                },
              }}
              config={plotConfig}
              style={{ width: '100%', height: `${height}px` }}
              useResizeHandler
            />
          </div>
        ) : (
          <div className="w-full h-[400px] flex items-center justify-center bg-muted/5 rounded-lg border-2 border-dashed border-muted">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-muted rounded-full mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No chart data available</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default BaseChart; 