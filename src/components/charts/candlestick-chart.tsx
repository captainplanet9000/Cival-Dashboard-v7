'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BaseChart } from './base-chart';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, BarChart2 } from 'lucide-react';
import { visualizationClient, ChartResponse } from '@/lib/api/visualization-client';

interface CandlestickChartProps {
  className?: string;
  height?: number;
  defaultSymbol?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function CandlestickChart({
  className,
  height = 450,
  defaultSymbol = 'AAPL',
  autoRefresh = false,
  refreshInterval = 60000, // 1 minute
}: CandlestickChartProps) {
  const [chartData, setChartData] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState('1d');

  const loadChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response: ChartResponse = await visualizationClient.getCandlestickChart(symbol, {
        timeframe,
        theme: 'dark',
      });
      
      setChartData(response.chart);
    } catch (err: any) {
      console.error('Candlestick chart error:', err);
      setError(err.message || 'Failed to load candlestick chart');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

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

  const symbolOptions = [
    { value: 'AAPL', label: 'Apple Inc.' },
    { value: 'GOOGL', label: 'Alphabet Inc.' },
    { value: 'MSFT', label: 'Microsoft Corp.' },
    { value: 'AMZN', label: 'Amazon.com Inc.' },
    { value: 'TSLA', label: 'Tesla Inc.' },
    { value: 'NVDA', label: 'NVIDIA Corp.' },
    { value: 'META', label: 'Meta Platforms' },
    { value: 'BTC-USD', label: 'Bitcoin USD' },
    { value: 'ETH-USD', label: 'Ethereum USD' },
  ];

  const timeframeOptions = [
    { value: '1m', label: '1 Minute' },
    { value: '5m', label: '5 Minutes' },
    { value: '15m', label: '15 Minutes' },
    { value: '1h', label: '1 Hour' },
    { value: '1d', label: '1 Day' },
    { value: '1w', label: '1 Week' },
  ];

  const actions = (
    <div className="flex items-center gap-2">
      <Select value={symbol} onValueChange={setSymbol}>
        <SelectTrigger className="w-40">
          <BarChart2 className="w-4 h-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {symbolOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={timeframe} onValueChange={setTimeframe}>
        <SelectTrigger className="w-32">
          <Clock className="w-4 h-4 mr-2" />
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
      title={`${symbol} Price Chart`}
      description="Candlestick chart with volume for market analysis"
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

export default CandlestickChart; 