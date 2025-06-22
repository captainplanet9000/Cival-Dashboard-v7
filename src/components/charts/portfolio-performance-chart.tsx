'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BaseChart } from './base-chart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, TrendingUp } from 'lucide-react';
import { visualizationClient, ChartResponse } from '@/lib/api/visualization-client';

interface PortfolioPerformanceChartProps {
  className?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function PortfolioPerformanceChart({
  className,
  height = 400,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
}: PortfolioPerformanceChartProps) {
  const [chartData, setChartData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState('1d');

  const loadChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ChartResponse = await visualizationClient.getPortfolioPerformanceChart({
        timeframe,
        theme: 'dark',
      });
      
      setChartData(response.chart);
    } catch (err: any) {
      console.error('Portfolio chart error:', err);
      setError(err.message || 'Failed to load portfolio performance chart');
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  // Initial load
  useEffect(() => {
    loadChart();
  }, [loadChart]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadChart, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadChart]);

  const timeframeOptions = [
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
    { value: '1M', label: '1 Month' },
    { value: '3M', label: '3 Months' },
    { value: '1y', label: '1 Year' },
  ];

  const actions = (
    <div className="flex items-center gap-2">
      <Select value={timeframe} onValueChange={setTimeframe}>
        <SelectTrigger className="w-32">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {timeframeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <BaseChart
      title="Portfolio Performance"
      description="Track your portfolio value and P&L over time"
      chartData={chartData}
      isLoading={isLoading}
      error={error}
      onRefresh={loadChart}
      className={className}
      height={height}
      actions={actions}
    />
  );
}

export default PortfolioPerformanceChart; 