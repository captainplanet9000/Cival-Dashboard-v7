'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  Activity, 
  Target,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings
} from "lucide-react";
import { 
  useDashboardData, 
  useBackendConnection, 
  usePortfolioSummary,
  useAgentsStatus,
  useTradingSignals,
  useMarketOverview
} from "@/hooks/useBackendApi";
import { useRealTimeData } from "@/hooks/useWebSocket";

export default function SimpleDashboardPage() {
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const { isConnected, backendUrl, testConnection, setBackendUrl } = useBackendConnection();
  
  // Individual hooks for granular control
  const portfolioSummary = usePortfolioSummary();
  const agentsStatus = useAgentsStatus();
  const tradingSignals = useTradingSignals();
  const marketOverview = useMarketOverview();
  
  // Real-time data via WebSocket
  const {
    portfolio: realtimePortfolio,
    agents: realtimeAgents,
    market: realtimeMarket,
    signals: realtimeSignals,
    isConnected: wsConnected,
    connectionState
  } = useRealTimeData();

  const handleBackendUrlChange = () => {
    if (backendUrlInput.trim()) {
      setBackendUrl(backendUrlInput.trim());
    }
  };

  const renderConnectionStatus = () => {
    if (isConnected === null) {
      return (
        <div className="flex items-center gap-2 text-yellow-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
          <span>Testing connection...</span>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span>Disconnected</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Simple Dashboard</h1>
          <p className="text-muted-foreground">
            Test the backend API integration with real-time data
          </p>
        </div>
      </div>

      {/* Backend Connection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Backend Connection
          </CardTitle>
          <CardDescription>
            Configure and test the connection to the Python AI Services backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="backend-url">Backend URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="backend-url"
                  placeholder={backendUrl}
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleBackendUrlChange} variant="outline">
                  Update
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Label>Status</Label>
              {renderConnectionStatus()}
            </div>
            <div className="flex flex-col items-center gap-2">
              <Label>Actions</Label>
              <Button onClick={testConnection} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Test
              </Button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Label>WebSocket</Label>
              <div className="flex items-center gap-2">
                {connectionState === 'connecting' ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span className="text-xs text-muted-foreground">Connecting</span>
                  </>
                ) : wsConnected ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs text-green-600">Live</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    <span className="text-xs text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            <p><strong>Current URL:</strong> {backendUrl}</p>
            <p><strong>Default URLs:</strong> http://localhost:8000, http://localhost:9000</p>
          </div>
        </CardContent>
      </Card>

      {/* API Data Display */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Portfolio Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Portfolio Summary
            </CardTitle>
            <CardDescription>
              GET /api/v1/portfolio/summary
            </CardDescription>
          </CardHeader>
          <CardContent>
            {portfolioSummary.loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {portfolioSummary.error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{portfolioSummary.error}</span>
              </div>
            )}
            
{(realtimePortfolio || portfolioSummary.data) && (
              <div className="space-y-3">
                {realtimePortfolio && (
                  <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live data via WebSocket</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Equity</p>
                    <p className="font-medium">${(realtimePortfolio || portfolioSummary.data).total_equity.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily P&L</p>
                    <p className={`font-medium ${(realtimePortfolio || portfolioSummary.data).daily_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(realtimePortfolio || portfolioSummary.data).daily_pnl.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cash Balance</p>
                    <p className="font-medium">${(realtimePortfolio || portfolioSummary.data).cash_balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Positions</p>
                    <p className="font-medium">{(realtimePortfolio || portfolioSummary.data).number_of_positions}</p>
                  </div>
                </div>
                <Button onClick={portfolioSummary.refresh} variant="outline" size="sm" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${portfolioSummary.loading ? 'animate-spin' : ''}`} />
                  Refresh Portfolio
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agents Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Trading Agents
            </CardTitle>
            <CardDescription>
              GET /api/v1/agents/status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agentsStatus.loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {agentsStatus.error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{agentsStatus.error}</span>
              </div>
            )}
            
{(realtimeAgents || agentsStatus.data) && (
              <div className="space-y-3">
                {realtimeAgents && (
                  <div className="flex items-center gap-2 text-xs text-green-600 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Live agent data</span>
                  </div>
                )}
                <div className="space-y-2">
                  {(realtimeAgents || agentsStatus.data).slice(0, 3).map((agent) => (
                    <div key={agent.agent_id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          agent.status === 'active' ? 'bg-green-500' : 
                          agent.status === 'monitoring' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium">{agent.name}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${agent.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${agent.pnl.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{agent.trades_today} trades</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={agentsStatus.refresh} variant="outline" size="sm" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${agentsStatus.loading ? 'animate-spin' : ''}`} />
                  Refresh Agents
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Trading Signals
            </CardTitle>
            <CardDescription>
              GET /api/v1/trading/signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tradingSignals.loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {tradingSignals.error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{tradingSignals.error}</span>
              </div>
            )}
            
            {tradingSignals.data && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {tradingSignals.data.slice(0, 3).map((signal, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          signal.signal === 'buy' ? 'bg-green-500' : 
                          signal.signal === 'sell' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-sm font-medium">{signal.symbol}</span>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium capitalize ${
                          signal.signal === 'buy' ? 'text-green-600' : 
                          signal.signal === 'sell' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {signal.signal}
                        </p>
                        <p className="text-xs text-muted-foreground">{(signal.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={tradingSignals.refresh} variant="outline" size="sm" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${tradingSignals.loading ? 'animate-spin' : ''}`} />
                  Refresh Signals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Market Overview
            </CardTitle>
            <CardDescription>
              GET /api/v1/market/overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketOverview.loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Loading...</span>
              </div>
            )}
            
            {marketOverview.error && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{marketOverview.error}</span>
              </div>
            )}
            
            {marketOverview.data && (
              <div className="space-y-3">
                <div className="space-y-2">
                  {marketOverview.data.market_data.slice(0, 3).map((market) => (
                    <div key={market.symbol} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="text-sm font-medium">{market.symbol}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${market.price.toFixed(2)}</p>
                        <p className={`text-xs ${market.change_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {market.change_pct >= 0 ? '+' : ''}{market.change_pct.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p><strong>Market Sentiment:</strong> {marketOverview.data.market_sentiment.overall}</p>
                  <p><strong>Fear & Greed:</strong> {marketOverview.data.market_sentiment.fear_greed_index}</p>
                </div>
                <Button onClick={marketOverview.refresh} variant="outline" size="sm" className="w-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${marketOverview.loading ? 'animate-spin' : ''}`} />
                  Refresh Market
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global Refresh */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Button 
              onClick={() => {
                portfolioSummary.refresh();
                agentsStatus.refresh();
                tradingSignals.refresh();
                marketOverview.refresh();
              }} 
              size="lg"
              className="w-full max-w-md"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}