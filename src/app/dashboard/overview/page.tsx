'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity, 
  Target,
  Shield,
  Zap,
  BarChart3,
  LineChart,
  ExternalLink,
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { formatPrice, formatPercentage, formatRelativeTime } from "@/lib/utils";
import { PortfolioPerformanceChart } from "@/components/charts/portfolio-performance-chart";
import { useDashboardData, useBackendConnection } from "@/hooks/useBackendApi";
import { useRealTimeData } from "@/hooks/useWebSocket";
import Link from "next/link";

export default function OverviewPage() {
  const {
    portfolioSummary,
    portfolioPositions,
    marketOverview,
    tradingSignals,
    agentsStatus,
    performanceMetrics,
    health,
    isLoading,
    hasErrors,
    refreshAll,
    errors
  } = useDashboardData();

  const { isConnected, backendUrl, testConnection } = useBackendConnection();
  
  // Real-time data via WebSocket
  const {
    portfolio: realtimePortfolio,
    agents: realtimeAgents,
    market: realtimeMarket,
    signals: realtimeSignals,
    isConnected: wsConnected,
    connectionState,
    lastUpdated
  } = useRealTimeData();

  // Use real-time data if available, otherwise fall back to API data
  const currentPortfolio = realtimePortfolio || portfolioSummary;
  const currentAgents = realtimeAgents || agentsStatus;
  const currentMarket = realtimeMarket || marketOverview;
  const currentSignals = realtimeSignals || tradingSignals;

  // Connection status indicator
  const renderConnectionStatus = () => {
    return (
      <div className="flex items-center gap-4 text-sm">
        {/* API Connection Status */}
        <div className="flex items-center gap-2">
          {isConnected === null ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-muted-foreground">API connecting...</span>
            </>
          ) : isConnected ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-600">API connected</span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-red-600">API disconnected</span>
              <Button variant="outline" size="sm" onClick={testConnection}>
                Reconnect
              </Button>
            </>
          )}
        </div>

        {/* WebSocket Connection Status */}
        <div className="flex items-center gap-2">
          {connectionState === 'connecting' ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-muted-foreground">WebSocket connecting...</span>
            </>
          ) : wsConnected ? (
            <>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-600">Live updates</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-red-600">No live updates</span>
            </>
          )}
        </div>
      </div>
    );
  };

  // Handle loading state
  if (isLoading && !portfolioSummary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground">Loading your trading performance data...</p>
            {renderConnectionStatus()}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Handle error state
  if (hasErrors && !portfolioSummary) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
            <p className="text-muted-foreground text-red-600">Failed to load portfolio data</p>
            {renderConnectionStatus()}
          </div>
          <Button onClick={refreshAll} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              {Object.entries(errors).map(([key, error]) => error && (
                <p key={key} className="text-red-800">
                  <strong>{key}:</strong> {error}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If we have no data yet, show loading
  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading portfolio data...</p>
          {renderConnectionStatus()}
        </div>
      </div>
    );
  }

  // Prepare metrics data from current data (real-time or API)
  const metricsData = [
    {
      title: "Total Portfolio Value",
      value: currentPortfolio.total_equity,
      change: currentPortfolio.daily_pnl,
      changePercent: (currentPortfolio.daily_pnl / (currentPortfolio.total_equity - currentPortfolio.daily_pnl)) * 100,
      icon: DollarSign,
      format: "currency",
    },
    {
      title: "Active Agents",
      value: currentAgents?.filter(agent => agent.status === 'active').length || 0,
      change: 1,
      changePercent: 5.0,
      icon: Activity,
      format: "number",
    },
    {
      title: "Total Return",
      value: currentPortfolio.total_return_percent,
      change: currentPortfolio.daily_pnl,
      changePercent: 1.4,
      icon: Target,
      format: "percentage",
    },
    {
      title: "Total Positions",
      value: currentPortfolio.number_of_positions,
      change: 0,
      changePercent: 0,
      icon: BarChart3,
      format: "number",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>Monitor your algorithmic trading performance and system health</span>
            {renderConnectionStatus()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {wsConnected && (
            <div className="flex items-center gap-2 text-sm text-green-600 mr-4">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Live Data</span>
              {lastUpdated.portfolio && (
                <span className="text-xs text-muted-foreground">
                  Updated {Math.round((Date.now() - lastUpdated.portfolio.getTime()) / 1000)}s ago
                </span>
              )}
            </div>
          )}
          <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/risk">
              <Shield className="mr-2 h-4 w-4" />
              Risk Report
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/strategies">
              <Zap className="mr-2 h-4 w-4" />
              Manage Strategies
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsData.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.change > 0;
          
          return (
            <Card key={metric.title} className={isLoading ? 'opacity-75' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metric.format === "currency" && formatPrice(metric.value)}
                  {metric.format === "percentage" && `${metric.value.toFixed(1)}%`}
                  {metric.format === "number" && metric.value.toLocaleString()}
                </div>
                <p className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositive ? '+' : ''}{metric.format === "currency" ? formatPrice(metric.change) : metric.change} 
                  ({formatPercentage(metric.changePercent / 100)}) from yesterday
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Trading Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Active Trading Agents</CardTitle>
            <CardDescription>
              Performance overview of your AI trading agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentAgents?.map((agent) => (
                <div key={agent.agent_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.status === 'active' ? 'bg-green-500' : 
                      agent.status === 'monitoring' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.trades_today} trades today • {(agent.win_rate * 100).toFixed(1)}% win rate • {agent.strategy}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      agent.pnl > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {agent.pnl > 0 ? '+' : ''}${agent.pnl.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {agent.status}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">No agent data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>
              Monitor the status of all trading system components
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {health?.services ? Object.entries(health.services).map(([serviceName, serviceStatus]) => (
                <div key={serviceName} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      serviceStatus.status === 'running' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">{serviceName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p className="text-sm text-muted-foreground">
                        {serviceStatus.service || 'Trading Service'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm capitalize font-medium ${
                      serviceStatus.status === 'running' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {serviceStatus.status}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-4">No health data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Performance Visualization */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                  Live Portfolio Performance
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Python-powered real-time analytics and visualization
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Full Analytics
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PortfolioPerformanceChart height={350} autoRefresh={true} />
        </CardContent>
      </Card>

      {/* Portfolio Holdings */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
          <CardDescription>
            Current positions and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {portfolioPositions?.map((position) => (
              <div key={position.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{position.symbol}</p>
                    <p className="text-sm text-muted-foreground">Cryptocurrency</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-right">
                    <p className="font-medium">{position.quantity.toLocaleString()} units</p>
                    <p className="text-muted-foreground">@ ${position.avg_cost.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${position.market_value.toFixed(2)}</p>
                    <p className="text-muted-foreground">${position.current_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${position.unrealized_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
                    </p>
                    <p className={`text-sm ${position.pnl_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {position.pnl_percent >= 0 ? '+' : ''}{position.pnl_percent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{portfolioSummary ? ((position.market_value / portfolioSummary.total_equity) * 100).toFixed(1) : '0'}%</p>
                    <p className="text-muted-foreground">allocation</p>
                  </div>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">No positions available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trading Signals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trading Signals</CardTitle>
          <CardDescription>
            Latest AI-generated trading recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(currentSignals || []).slice(0, 5).map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    signal.signal === 'buy' ? 'bg-green-500' : 
                    signal.signal === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="font-medium">{signal.symbol}</p>
                    <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold capitalize ${
                    signal.signal === 'buy' ? 'text-green-600' : 
                    signal.signal === 'sell' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {signal.signal}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(signal.confidence * 100).toFixed(0)}% confidence
                  </p>
                </div>
              </div>
            )) || (
              <p className="text-muted-foreground text-center py-4">No trading signals available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}