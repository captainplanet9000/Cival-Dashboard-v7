'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useDashboardData, useBackendConnection } from "@/hooks/useBackendApi";
import { useRealTimeData } from "@/hooks/useWebSocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {   BarChart3,   TrendingUp,   TrendingDown,   Activity,   Target,   AlertTriangle,   Zap,  RefreshCw,  Settings,  Download,  Maximize2,  LineChart,  PieChart,  Calendar,  Filter} from 'lucide-react';
import { PortfolioPerformanceChart } from '@/components/charts/portfolio-performance-chart';
import { CandlestickChart } from '@/components/charts/candlestick-chart';
import { StrategyComparisonChart } from '@/components/charts/strategy-comparison-chart';
import { BaseChart } from '@/components/charts/base-chart';
import { visualizationClient } from '@/lib/api/visualization-client';
import { toast } from 'react-hot-toast';
import { formatPrice, formatPercentage } from "@/lib/utils";

// Enhanced mock data for analytics
const performanceMetrics = {
  totalReturn: {
    value: 156247.82,
    change: 12847.32,
    changePercent: 8.97,
    period: "YTD"
  },
  sharpeRatio: {
    value: 2.34,
    change: 0.12,
    changePercent: 5.41,
    benchmark: 1.8
  },
  maxDrawdown: {
    value: -4.2,
    change: 0.8,
    changePercent: -16.0,
    target: -5.0
  },
  winRate: {
    value: 87.3,
    change: 2.1,
    changePercent: 2.46,
    target: 85.0
  },
  volatility: {
    value: 12.4,
    change: -0.6,
    changePercent: -4.62,
    benchmark: 15.2
  },
  sortino: {
    value: 3.12,
    change: 0.18,
    changePercent: 6.12,
    benchmark: 2.4
  }
};

const riskMetrics = [
  {
    name: "Value at Risk (95%)",
    value: -8247.32,
    threshold: -10000,
    status: "safe",
    description: "Maximum expected loss over 1 day"
  },
  {
    name: "Beta",
    value: 0.78,
    threshold: 1.0,
    status: "safe",
    description: "Portfolio sensitivity to market movements"
  },
  {
    name: "Correlation to SPY",
    value: 0.42,
    threshold: 0.8,
    status: "safe",
    description: "Correlation with S&P 500 index"
  },
  {
    name: "Concentration Risk",
    value: 23.4,
    threshold: 30.0,
    status: "warning",
    description: "Percentage in top 3 positions"
  }
];

const strategyPerformance = [
  {
    name: "Darvas Box Breakout",
    totalReturn: 34.2,
    sharpe: 2.8,
    maxDrawdown: -3.1,
    trades: 147,
    winRate: 89.1,
    allocation: 25.0,
    status: "outperforming"
  },
  {
    name: "Williams Alligator",
    totalReturn: 28.7,
    sharpe: 2.1,
    maxDrawdown: -5.2,
    trades: 203,
    winRate: 82.3,
    allocation: 20.0,
    status: "performing"
  },
  {
    name: "Elliott Wave",
    totalReturn: 42.1,
    sharpe: 3.4,
    maxDrawdown: -2.8,
    trades: 89,
    winRate: 94.4,
    allocation: 15.0,
    status: "outperforming"
  },
  {
    name: "Renko + MA",
    totalReturn: -2.3,
    sharpe: -0.4,
    maxDrawdown: -8.1,
    trades: 156,
    winRate: 58.3,
    allocation: 10.0,
    status: "underperforming"
  }
];

const timeFrameData = [
  { period: "1D", return: 2.34, benchmark: 1.12 },
  { period: "1W", return: 8.97, benchmark: 3.45 },
  { period: "1M", return: 15.23, benchmark: 8.76 },
  { period: "3M", return: 28.67, benchmark: 12.34 },
  { period: "6M", return: 45.89, benchmark: 18.92 },
  { period: "1Y", return: 78.23, benchmark: 24.56 }
];

export default function AnalyticsPage() {
  // Real-time API integration
  const { portfolioSummary, performanceMetrics: livePerformanceMetrics, isLoading } = useDashboardData();
  const { isConnected } = useBackendConnection();
  const { 
    portfolio: realtimePortfolio, 
    isConnected: wsConnected 
  } = useRealTimeData();

  // Use real-time data when available
  const currentPortfolio = realtimePortfolio || portfolioSummary;
  const currentMetrics = livePerformanceMetrics || performanceMetrics;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [riskHeatmapData, setRiskHeatmapData] = useState<string>('');
  const [realTimePnLData, setRealTimePnLData] = useState<string>('');
  const [chartsLoading, setChartsLoading] = useState({ risk: false, pnl: false });
  const [chartsError, setChartsError] = useState({ risk: null as string | null, pnl: null as string | null });

  // Load additional charts that don't have dedicated components yet
  const loadRiskHeatmap = async () => {
    setChartsLoading(prev => ({ ...prev, risk: true }));
    setChartsError(prev => ({ ...prev, risk: null }));
    
    try {
      const response = await visualizationClient.getRiskHeatmapChart({ theme: 'dark' });
      setRiskHeatmapData(response.chart);
    } catch (err: any) {
      setChartsError(prev => ({ ...prev, risk: err.message }));
    } finally {
      setChartsLoading(prev => ({ ...prev, risk: false }));
    }
  };

  const loadRealTimePnL = async () => {
    setChartsLoading(prev => ({ ...prev, pnl: true }));
    setChartsError(prev => ({ ...prev, pnl: null }));
    
    try {
      const response = await visualizationClient.getRealTimePnLChart({ theme: 'dark' });
      setRealTimePnLData(response.chart);
    } catch (err: any) {
      setChartsError(prev => ({ ...prev, pnl: err.message }));
    } finally {
      setChartsLoading(prev => ({ ...prev, pnl: false }));
    }
  };

  const refreshAllCharts = async () => {
    setIsRefreshing(true);
    toast.loading('Refreshing all charts...', { id: 'refresh-charts' });
    
    try {
      await Promise.all([
        loadRiskHeatmap(),
        loadRealTimePnL(),
      ]);
      toast.success('All charts refreshed successfully', { id: 'refresh-charts' });
    } catch (error) {
      toast.error('Some charts failed to refresh', { id: 'refresh-charts' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadRiskHeatmap();
    loadRealTimePnL();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadRiskHeatmap();
      loadRealTimePnL();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const checkServiceHealth = async () => {
    try {
      const health = await visualizationClient.healthCheck();
      toast.success(`Visualization service is ${health.status}`);
    } catch (error) {
      toast.error('Visualization service is offline');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance analysis and risk metrics for your trading portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Date Range
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Breakdown</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Key Performance Metrics */}
          {performanceMetrics ? (
          <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Return ({performanceMetrics.totalReturn.period})</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(performanceMetrics.totalReturn.value)}</div>
                <p className="text-xs text-trading-profit">
                  +{formatPrice(performanceMetrics.totalReturn.change)} ({formatPercentage(performanceMetrics.totalReturn.changePercent / 100)})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.sharpeRatio.value}</div>
                <p className="text-xs text-trading-profit">
                  +{performanceMetrics.sharpeRatio.change} vs benchmark ({performanceMetrics.sharpeRatio.benchmark})
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-trading-loss">{performanceMetrics.maxDrawdown.value}%</div>
                <p className="text-xs text-trading-profit">
                  Improved by {Math.abs(performanceMetrics.maxDrawdown.change)}% (target: {performanceMetrics.maxDrawdown.target}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.winRate.value}%</div>
                <p className="text-xs text-trading-profit">
                  +{performanceMetrics.winRate.change}% (target: {performanceMetrics.winRate.target}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Volatility</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.volatility.value}%</div>
                <p className="text-xs text-trading-profit">
                  -{Math.abs(performanceMetrics.volatility.change)}% vs benchmark ({performanceMetrics.volatility.benchmark}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sortino Ratio</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performanceMetrics.sortino.value}</div>
                <p className="text-xs text-trading-profit">
                  +{performanceMetrics.sortino.change} vs benchmark ({performanceMetrics.sortino.benchmark})
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Performance Over Time</CardTitle>
              <CardDescription>
                Cumulative returns compared to benchmark indices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading chart...</div>}>
                <PortfolioPerformanceChart height={400} />
              </Suspense>
            </CardContent>
          </Card>

          {/* Time Frame Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Returns by Time Frame</CardTitle>
              <CardDescription>
                Performance across different time periods vs benchmark
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeFrameData.map((frame) => (
                  <div key={frame.period} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="font-medium w-12">{frame.period}</div>
                      <div className="w-48 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (frame.return / 80) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-semibold text-trading-profit">
                          +{frame.return}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          vs {frame.benchmark}%
                        </div>
                      </div>
                      <Badge variant={frame.return > frame.benchmark ? "default" : "secondary"}>
                        {frame.return > frame.benchmark ? "Outperform" : "Underperform"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </>
          ) : (
            <div className="text-center text-muted-foreground">
              Loading performance metrics...
            </div>
          )}
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {/* Risk Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {riskMetrics.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  {metric.status === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Target className="h-4 w-4 text-green-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {typeof metric.value === 'number' && metric.value < 0 
                      ? formatPrice(metric.value) 
                      : metric.value}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {metric.description}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge variant={metric.status === "safe" ? "default" : "destructive"}>
                      {metric.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Threshold: {typeof metric.threshold === 'number' && metric.threshold < 0 
                        ? formatPrice(metric.threshold) 
                        : metric.threshold}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risk Allocation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Allocation by Strategy</CardTitle>
              <CardDescription>
                Portfolio risk distribution across different trading strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Risk allocation pie chart will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          {/* Strategy Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance Comparison</CardTitle>
              <CardDescription>
                Individual strategy metrics and allocation analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading chart...</div>}>
                <StrategyComparisonChart />
              </Suspense>
            </CardContent>
          </Card>

          {/* Strategy Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Breakdown</CardTitle>
              <CardDescription>
                Detailed performance metrics for each active strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategyPerformance.map((strategy) => (
                  <div key={strategy.name} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{strategy.name}</h3>
                      <Badge variant={
                        strategy.status === "outperforming" ? "default" :
                        strategy.status === "performing" ? "secondary" : "destructive"
                      }>
                        {strategy.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Return</div>
                        <div className={`font-semibold ${
                          strategy.totalReturn > 0 ? "text-trading-profit" : "text-trading-loss"
                        }`}>
                          {strategy.totalReturn > 0 ? "+" : ""}{strategy.totalReturn}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Sharpe Ratio</div>
                        <div className="font-semibold">{strategy.sharpe}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Max Drawdown</div>
                        <div className="font-semibold text-trading-loss">{strategy.maxDrawdown}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Trades</div>
                        <div className="font-semibold">{strategy.trades}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Win Rate</div>
                        <div className="font-semibold">{strategy.winRate}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Allocation</div>
                        <div className="font-semibold">{strategy.allocation}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6">
          {/* Attribution Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Strategy Attribution</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+18.4%</div>
                <p className="text-xs text-trading-profit">
                  Strategy selection contributed +18.4% to total returns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Selection</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+12.7%</div>
                <p className="text-xs text-trading-profit">
                  Asset selection within strategies contributed +12.7%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Timing Effect</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+3.2%</div>
                <p className="text-xs text-trading-profit">
                  Entry/exit timing contributed +3.2%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Attribution Breakdown Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Return Attribution by Strategy</CardTitle>
                <CardDescription>
                  How each strategy contributed to overall portfolio returns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategyPerformance.map((strategy) => {
                    const contribution = (strategy.totalReturn * strategy.allocation) / 100;
                    return (
                      <div key={strategy.name} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <div className="font-medium text-sm">{strategy.name}</div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="font-semibold text-sm">
                              {contribution > 0 ? '+' : ''}{contribution.toFixed(2)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {strategy.allocation}% allocation
                            </div>
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                contribution > 0 ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.abs(contribution / 5) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Factor Attribution</CardTitle>
                <CardDescription>
                  Performance attribution to market risk factors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { factor: "Market Beta", contribution: 8.4, description: "General market exposure" },
                    { factor: "Size Factor", contribution: 2.1, description: "Small vs large cap bias" },
                    { factor: "Value Factor", contribution: -1.2, description: "Value vs growth bias" },
                    { factor: "Momentum", contribution: 5.8, description: "Price momentum exposure" },
                    { factor: "Volatility", contribution: 3.2, description: "Low volatility factor" },
                    { factor: "Quality", contribution: 4.1, description: "Quality metrics factor" },
                    { factor: "Alpha Generation", contribution: 12.6, description: "Strategy-specific returns" }
                  ].map((factor) => (
                    <div key={factor.factor} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="font-medium text-sm">{factor.factor}</div>
                        <div className="text-xs text-muted-foreground">{factor.description}</div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className={`font-semibold text-sm ${
                          factor.contribution > 0 ? 'text-trading-profit' : 'text-trading-loss'
                        }`}>
                          {factor.contribution > 0 ? '+' : ''}{factor.contribution}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              factor.contribution > 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.abs(factor.contribution / 10) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sector Attribution */}
          <Card>
            <CardHeader>
              <CardTitle>Sector Allocation vs Benchmark</CardTitle>
              <CardDescription>
                Portfolio sector weights compared to benchmark allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { sector: "Technology", portfolio: 28.5, benchmark: 22.3, performance: 2.8 },
                  { sector: "Financial Services", portfolio: 18.2, benchmark: 20.1, performance: -0.4 },
                  { sector: "Healthcare", portfolio: 15.7, benchmark: 14.2, performance: 1.2 },
                  { sector: "Consumer Cyclical", portfolio: 12.1, benchmark: 15.8, performance: -1.1 },
                  { sector: "Energy", portfolio: 8.3, benchmark: 6.4, performance: 3.2 },
                  { sector: "Industrials", portfolio: 9.8, benchmark: 11.7, performance: 0.6 },
                  { sector: "Materials", portfolio: 4.2, benchmark: 5.1, performance: -0.8 },
                  { sector: "Other", portfolio: 3.2, benchmark: 4.4, performance: 0.1 }
                ].map((sector) => (
                  <div key={sector.sector} className="grid grid-cols-4 gap-4 p-3 rounded-lg border items-center">
                    <div className="font-medium text-sm">{sector.sector}</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm w-12 text-right">{sector.portfolio}%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                        <div 
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(sector.portfolio / 30) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm w-12 text-right text-muted-foreground">{sector.benchmark}%</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-20">
                        <div 
                          className="bg-gray-400 h-2 rounded-full"
                          style={{ width: `${(sector.benchmark / 30) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`text-right font-semibold text-sm ${
                      sector.performance > 0 ? 'text-trading-profit' : 'text-trading-loss'
                    }`}>
                      {sector.performance > 0 ? '+' : ''}{sector.performance}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Legend:</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-xs">Portfolio</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-400 rounded"></div>
                      <span className="text-xs">Benchmark</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Attribution Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Attribution</CardTitle>
              <CardDescription>
                Strategy performance contribution by month - hover for details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-13 gap-1 text-xs">
                  <div></div>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
                    <div key={month} className="text-center font-medium text-muted-foreground">{month}</div>
                  ))}
                </div>
                {strategyPerformance.map((strategy) => (
                  <div key={strategy.name} className="grid grid-cols-13 gap-1">
                    <div className="text-xs font-medium pr-2 text-right flex items-center">
                      {strategy.name.split(' ')[0]}
                    </div>
                    {Array.from({ length: 12 }, (_, i) => {
                      const performance = Math.random() * 10 - 2; // Mock monthly performance
                      const intensity = Math.abs(performance) / 5;
                      const isPositive = performance > 0;
                      return (
                        <div
                          key={i}
                          className={`h-6 rounded text-xs flex items-center justify-center text-white font-medium cursor-pointer transition-all hover:scale-110 ${
                            isPositive 
                              ? `bg-green-${Math.min(900, Math.max(200, Math.floor(intensity * 400) + 400))}` 
                              : `bg-red-${Math.min(900, Math.max(200, Math.floor(intensity * 400) + 400))}`
                          }`}
                          style={{
                            backgroundColor: isPositive 
                              ? `rgb(${255 - intensity * 100}, ${255}, ${255 - intensity * 100})`
                              : `rgb(${255}, ${255 - intensity * 100}, ${255 - intensity * 100})`
                          }}
                          title={`${strategy.name}: ${performance > 0 ? '+' : ''}${performance.toFixed(1)}%`}
                        >
                          {performance.toFixed(1)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Darker colors indicate stronger performance (positive or negative)</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-400 rounded"></div>
                      <span>Positive</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-400 rounded"></div>
                      <span>Negative</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 