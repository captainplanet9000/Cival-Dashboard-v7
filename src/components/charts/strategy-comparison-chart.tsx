'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BaseChart } from './base-chart';
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';
import { visualizationClient, ChartResponse } from '@/lib/api/visualization-client';

interface StrategyComparisonChartProps {
  className?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function StrategyComparisonChart({
  className,
  height = 400,
  autoRefresh = false,
  refreshInterval = 60000,
}: StrategyComparisonChartProps) {
  const [chartData, setChartData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ChartResponse = await visualizationClient.getStrategyComparisonChart({
        theme: 'dark',
      });
      
      setChartData(response.chart);
    } catch (err: any) {
      console.error('Strategy comparison chart error:', err);
      setError(err.message || 'Failed to load strategy comparison chart');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadChart, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadChart]);

  return (
    <BaseChart
      title="Strategy Performance Comparison"
      description="Compare risk vs return across all trading strategies"
      chartData={chartData}
      isLoading={isLoading}
      error={error}
      onRefresh={loadChart}
      className={className}
      height={height}
    />
  );
}

export default StrategyComparisonChart; 