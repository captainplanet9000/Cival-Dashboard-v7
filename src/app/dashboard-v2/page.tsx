'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AGUIProvider } from "@/components/ag-ui/AGUIProvider";
import { AGUIChat } from "@/components/ag-ui/AGUIChat";
import { RealTimeStatus } from "@/components/realtime/RealTimeStatus";
import { LiveMarketTicker } from "@/components/realtime/LiveMarketTicker";
import { useWebSocket, usePortfolioUpdates, useTradingSignals, useRiskAlerts } from "@/lib/realtime/websocket";
import { ExportManager } from "@/components/export/ExportManager";
import { PerformanceMonitor } from "@/components/performance/PerformanceMonitor";
import { 
  Activity, BarChart3, Brain, DollarSign, 
  Shield, Vault, TrendingUp, Users, 
  Database, Settings, Play, Pause,
  ArrowUpRight, ArrowDownRight, AlertTriangle,
  Menu, X, FileText, Lock, MessageSquare, Download,
  Zap
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  status: string;
  strategy: string;
  cash: number;
  total_value: number;
  total_trades?: number;
}

interface Trade {
  id: number;
  agent_id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  timestamp: string;
  paper_trade: boolean;
}

interface Portfolio {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  strategies: any[];
  holdings: any[];
  systemHealth: any;
}

interface Strategy {
  id: string;
  name: string;
  status: string;
  totalReturn: number;
  trades: number;
  winRate: number;
  allocation: number;
  avgHoldTime: string;
  sharpeRatio: number;
  maxDrawdown: number;
  lastTrade: string;
  description: string;
  riskLevel: string;
  capitalAllocated: number;
}

interface MarketData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
}

interface AIAnalysis {
  symbol: string;
  action: string;
  confidence: string;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  probability: number;
  reasoning: string[];
  risks: string[];
  aiModel: string;
  timestamp: string;
  analysisId: string;
}

export default function DashboardV2() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AIAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real-time WebSocket hooks
  const { isConnected } = useWebSocket();
  const portfolioUpdates = usePortfolioUpdates();
  const tradingSignals = useTradingSignals();
  const riskAlerts = useRiskAlerts();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsRes, tradesRes, portfolioRes, strategiesRes, marketRes, aiRes] = await Promise.all([
        fetch('http://localhost:9000/agents'),
        fetch('http://localhost:9000/trades'),
        fetch('/api/portfolio'),
        fetch('/api/strategies'),
        fetch('/api/market'),
        fetch('/api/ai-analysis')
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
      }

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setTrades(tradesData.trades || []);
      }

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPortfolio(portfolioData.data);
      }

      if (strategiesRes.ok) {
        const strategiesData = await strategiesRes.json();
        setStrategies(strategiesData.data || []);
      }

      if (marketRes.ok) {
        const marketResData = await marketRes.json();
        setMarketData(marketResData.data || []);
      }

      if (aiRes.ok) {
        const aiResData = await aiRes.json();
        setAiAnalyses(aiResData.data || []);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const simulateTrade = async (agentId: string, symbol: string) => {
    try {
      const response = await fetch('http://localhost:9000/trades/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          symbol: symbol,
          side: 'buy',
          quantity: 10
        })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Trade simulation failed:', err);
    }
  };

  const toggleStrategy = async (strategyId: string, currentStatus: string) => {
    try {
      const action = currentStatus === 'active' ? 'pause' : 'start';
      const response = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId, action })
      });

      if (response.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Strategy toggle failed:', err);
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;
    
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery, symbol: 'AAPL' })
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.data);
      }
    } catch (err) {
      console.error('AI query failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'strategies', label: 'Strategies', icon: TrendingUp },
    { id: 'trading', label: 'Live Trading', icon: Activity },
    { id: 'ai', label: 'AI Enhanced', icon: Brain },
    { id: 'risk', label: 'Risk Management', icon: Shield },
    { id: 'vault', label: 'Vault Banking', icon: Vault },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'agents', label: 'Agent Management', icon: Users },
    { id: 'exports', label: 'Export & Reports', icon: Download },
    { id: 'performance', label: 'Performance Monitor', icon: Zap },
    { id: 'mcp', label: 'MCP Servers', icon: Database },
    { id: 'data', label: 'Data Management', icon: FileText },
    { id: 'agent-trading', label: 'Agent Trading', icon: Lock },
  ];

  const getTabTitle = () => {
    const item = navItems.find(item => item.id === activeTab);
    return item ? item.label : 'Dashboard';
  };

  if (loading && !agents.length) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading trading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AGUIProvider 
      endpoint="http://localhost:9000/api/v1/agui"
      transport="sse"
      enabled={true}
    >
      <div className="min-h-screen bg-slate-50 flex lg:flex-row">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="outline"
          size="sm"
          className="bg-white shadow-md"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 shadow-lg z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:shadow-none
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">🤖 Cival AI</h2>
            <p className="text-sm text-slate-600">Trading Platform</p>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
          
          {/* Status */}
          <div className="p-4 border-t border-slate-200">
            <div className="p-3 bg-slate-100 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">System Status</span>
                <Badge variant={error ? "destructive" : "default"}>
                  {error ? "Error" : "Live"}
                </Badge>
              </div>
              <div className="text-xs text-slate-600">
                {portfolio && `Portfolio: $${portfolio.totalValue.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-h-screen bg-slate-50">
        {/* Header */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm z-30">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{getTabTitle()}</h1>
                <p className="text-slate-600 text-sm mt-1">
                  Real-time algorithmic trading platform
                </p>
              </div>
              <div className="flex items-center gap-3">
                <RealTimeStatus />
                <PerformanceMonitor showDetails={false} />
                <Button onClick={fetchData} variant="outline" size="sm">
                  🔄 Refresh
                </Button>
                <Badge variant={error ? "destructive" : "default"}>
                  {error ? "❌ Error" : "✅ Live"}
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Live Market Ticker */}
        <div className="border-b bg-white">
          <LiveMarketTicker compact={true} className="h-12" />
        </div>

        {/* Content */}
        <main className="p-4 lg:p-8 pt-20 lg:pt-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab 
              portfolio={portfolio}
              agents={agents}
              trades={trades}
              simulateTrade={simulateTrade}
            />
          )}

          {activeTab === 'strategies' && (
            <StrategiesTab 
              strategies={strategies}
              toggleStrategy={toggleStrategy}
            />
          )}

          {activeTab === 'trading' && (
            <TradingTab 
              marketData={marketData}
              simulateTrade={simulateTrade}
            />
          )}

          {activeTab === 'ai' && (
            <AITab 
              aiAnalyses={aiAnalyses}
              aiQuery={aiQuery}
              setAiQuery={setAiQuery}
              aiResponse={aiResponse}
              aiLoading={aiLoading}
              handleAiQuery={handleAiQuery}
              simulateTrade={simulateTrade}
            />
          )}

          {activeTab === 'risk' && <RiskManagementTab portfolio={portfolio} />}
          {activeTab === 'vault' && <VaultBankingTab />}
          {activeTab === 'analytics' && <AnalyticsTab strategies={strategies} />}
          {activeTab === 'agents' && <AgentManagementTab agents={agents} />}
          {activeTab === 'exports' && <ExportManager />}
          {activeTab === 'performance' && <PerformanceMonitor showDetails={true} />}
          {activeTab === 'mcp' && <MCPServersTab />}
          {activeTab === 'data' && <DataManagementTab />}
          {activeTab === 'agent-trading' && <AgentTradingTab agents={agents} />}
        </main>
      </div>
      </div>
    </AGUIProvider>
  );
}

// Tab Components
function OverviewTab({ portfolio, agents, trades, simulateTrade }: any) {
  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      {portfolio && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${portfolio.totalValue.toLocaleString()}</div>
              <p className={`text-xs flex items-center ${portfolio.dailyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolio.dailyChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                {portfolio.dailyChange >= 0 ? '+' : ''}${portfolio.dailyChange.toFixed(2)} ({portfolio.dailyChangePercent.toFixed(1)}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agents.filter((a: any) => a.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">of {agents.length} total agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trades.length}</div>
              <p className="text-xs text-muted-foreground">paper trades executed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87.3%</div>
              <p className="text-xs text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +2.1% this week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Real-time Data & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveMarketTicker showSpread={false} />
        </div>
        <div>
          <RealTimeStatus showDetails={true} />
        </div>
      </div>

      {/* Trading Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            AI Trading Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent: any) => (
              <div key={agent.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                    {agent.status}
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strategy:</span>
                    <span className="font-medium">{agent.strategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cash:</span>
                    <span className="font-medium">${agent.cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Portfolio Value:</span>
                    <span className="font-medium">${agent.total_value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Trades:</span>
                    <span className="font-medium">{agent.total_trades || 0}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => simulateTrade(agent.id, 'AAPL')}
                    className="flex-1"
                  >
                    📈 Buy AAPL
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => simulateTrade(agent.id, 'TSLA')}
                    className="flex-1"
                  >
                    🚗 Buy TSLA
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No trades yet. Use the "Buy" buttons above to simulate trades.
            </p>
          ) : (
            <div className="space-y-2">
              {trades.slice(-10).reverse().map((trade: any) => (
                <div key={trade.id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                      {trade.side.toUpperCase()}
                    </Badge>
                    <span className="font-medium">{trade.symbol}</span>
                    <span className="text-sm text-muted-foreground">
                      {trade.quantity} shares @ ${trade.price}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      ${(trade.quantity * trade.price).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StrategiesTab({ strategies, toggleStrategy }: any) {
  return (
    <div className="space-y-6">
      {/* Strategy Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.filter((s: any) => s.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">of {strategies.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Return</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{strategies.length > 0 ? (strategies.reduce((acc: number, s: any) => acc + s.totalReturn, 0) / strategies.length).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">across all strategies</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategies.reduce((acc: number, s: any) => acc + s.trades, 0)}</div>
            <p className="text-xs text-muted-foreground">executed trades</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {strategies.length > 0 ? (strategies.reduce((acc: number, s: any) => acc + s.winRate, 0) / strategies.length).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {strategies.map((strategy: any) => (
          <Card key={strategy.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{strategy.name}</CardTitle>
                <Badge variant={strategy.status === 'active' ? 'default' : 'secondary'}>
                  {strategy.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{strategy.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Return:</span>
                    <div className={`font-medium ${strategy.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {strategy.totalReturn >= 0 ? '+' : ''}{strategy.totalReturn.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Trades:</span>
                    <div className="font-medium">{strategy.trades}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Rate:</span>
                    <div className="font-medium">{strategy.winRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sharpe:</span>
                    <div className="font-medium">{strategy.sharpeRatio.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Win Rate</span>
                    <span>{strategy.winRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={strategy.winRate} className="h-2" />
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div>Risk Level: <span className={`font-medium ${
                    strategy.riskLevel === 'Low' ? 'text-green-600' :
                    strategy.riskLevel === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{strategy.riskLevel}</span></div>
                  <div>Capital: ${strategy.capitalAllocated.toLocaleString()}</div>
                  <div>Avg Hold: {strategy.avgHoldTime}</div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button 
                  size="sm" 
                  variant={strategy.status === 'active' ? 'outline' : 'default'} 
                  className="flex-1"
                  onClick={() => toggleStrategy(strategy.id, strategy.status)}
                >
                  {strategy.status === 'active' ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {strategy.status === 'active' ? 'Pause' : 'Start'}
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TradingTab({ marketData, simulateTrade }: any) {
  return (
    <div className="space-y-6">
      {/* Market Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Market Overview</CardTitle>
            <Badge variant="default" className="bg-green-600">
              • LIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {marketData.slice(0, 10).map((stock: any) => (
              <div key={stock.symbol} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{stock.symbol}</div>
                  <Badge variant="outline" className="text-xs">
                    {stock.symbol.includes('-USD') ? 'CRYPTO' : 'STOCK'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-bold">${stock.price.toLocaleString()}</div>
                  <div className={`text-sm flex items-center ${
                    stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stock.changePercent >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Vol: {(stock.volume / 1000000).toFixed(1)}M
                  </div>
                </div>
                <div className="mt-3 flex gap-1">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => simulateTrade('market-agent', stock.symbol)}>
                    Buy
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-7 text-xs">
                    Sell
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Book</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground mb-2">
                  <span>Price</span>
                  <span>Size</span>
                  <span>Total</span>
                </div>
                {/* Asks */}
                {[...Array(5)].map((_, i) => {
                  const price = 189.75 + (i + 1) * 0.25;
                  const size = Math.floor(Math.random() * 1000) + 100;
                  return (
                    <div key={`ask-${i}`} className="grid grid-cols-3 gap-4 text-sm text-red-600">
                      <span>${price.toFixed(2)}</span>
                      <span>{size}</span>
                      <span>${(price * size).toFixed(0)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-b py-2 my-2">
                  <div className="text-center font-medium">Spread: $0.02</div>
                </div>
                {/* Bids */}
                {[...Array(5)].map((_, i) => {
                  const price = 189.75 - (i + 1) * 0.25;
                  const size = Math.floor(Math.random() * 1000) + 100;
                  return (
                    <div key={`bid-${i}`} className="grid grid-cols-3 gap-4 text-sm text-green-600">
                      <span>${price.toFixed(2)}</span>
                      <span>{size}</span>
                      <span>${(price * size).toFixed(0)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Trade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Symbol</label>
                <input 
                  type="text" 
                  className="w-full mt-1 px-3 py-2 border rounded-md" 
                  placeholder="AAPL"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <input 
                  type="number" 
                  className="w-full mt-1 px-3 py-2 border rounded-md" 
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Order Type</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-md">
                  <option>Market</option>
                  <option>Limit</option>
                  <option>Stop</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="bg-green-600 hover:bg-green-700">
                  Buy
                </Button>
                <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
                  Sell
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AITab({ aiAnalyses, aiQuery, setAiQuery, aiResponse, aiLoading, handleAiQuery, simulateTrade }: any) {
  return (
    <div className="space-y-6">
      {/* AI System Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Status</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Online</div>
            <p className="text-xs text-muted-foreground">3 models active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Analyses Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiAnalyses.length}</div>
            <p className="text-xs text-muted-foreground">generated recommendations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-xs text-green-600">+2.1% vs yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234ms</div>
            <p className="text-xs text-muted-foreground">avg processing time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced AG UI Chat */}
        <div className="lg:col-span-2">
          <AGUIChat 
            title="Enhanced AI Agent Chat"
            placeholder="Ask about market analysis, trading strategies, risk assessment, or specific symbols..."
            showAgents={true}
            showThinking={true}
            autoScroll={true}
            className="mb-6"
          />
        </div>
        
        {/* AI Recommendations */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Trading Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiAnalyses.slice(0, 6).map((analysis: any) => (
                  <div key={analysis.analysisId} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-lg">{analysis.symbol}</div>
                        <Badge variant={analysis.action === 'BUY' ? 'default' : analysis.action === 'SELL' ? 'destructive' : 'secondary'}>
                          {analysis.action}
                        </Badge>
                        <Badge variant={analysis.confidence === 'HIGH' ? 'default' : analysis.confidence === 'MEDIUM' ? 'secondary' : 'outline'}>
                          {analysis.confidence}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Probability</div>
                        <div className="font-bold">{analysis.probability}%</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-muted-foreground">Current:</span>
                        <div className="font-medium">${analysis.currentPrice}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target:</span>
                        <div className="font-medium">${analysis.targetPrice}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Stop Loss:</span>
                        <div className="font-medium">${analysis.stopLoss}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-green-600">Reasoning:</span>
                        <ul className="text-xs text-muted-foreground ml-2">
                          {analysis.reasoning.map((reason: string, i: number) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                      {analysis.risks.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-red-600">Risks:</span>
                          <ul className="text-xs text-muted-foreground ml-2">
                            {analysis.risks.map((risk: string, i: number) => (
                              <li key={i}>• {risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground">
                        Model: {analysis.aiModel} | Timeframe: {analysis.timeframe}
                      </div>
                      <Button size="sm" onClick={() => simulateTrade('ai-agent', analysis.symbol)}>
                        Execute Trade
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* AI Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-80 overflow-y-auto border rounded p-3 bg-slate-50">
                {aiResponse ? (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">AI Analysis Response:</div>
                    <div className="text-sm bg-white p-3 rounded border">
                      {aiResponse.response}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {aiResponse.confidence}% | Model: {aiResponse.model}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Ask the AI assistant about market conditions, trading strategies, or specific symbols.
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <textarea
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask about market analysis, trading strategies, or specific symbols..."
                  className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                />
                <Button 
                  onClick={handleAiQuery} 
                  disabled={aiLoading || !aiQuery.trim()}
                  className="w-full"
                >
                  {aiLoading ? 'Analyzing...' : 'Ask AI'}
                </Button>
              </div>
              
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Quick Actions</div>
                <div className="space-y-2">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setAiQuery('What are the current market trends?')}>
                    Market Trends
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setAiQuery('Analyze AAPL for day trading')}>
                    Analyze AAPL
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setAiQuery('Risk assessment for current portfolio')}>
                    Risk Assessment
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Enhanced Risk Management Tab
function RiskManagementTab({ portfolio }: any) {
  const [timeframe, setTimeframe] = useState('1D');
  const [riskMetrics, setRiskMetrics] = useState({
    var_1d: -2847,
    var_1w: -8450,
    var_1m: -15230,
    maxDrawdown: -4.2,
    sharpe: 2.34,
    sortino: 3.12,
    beta: 0.78,
    alpha: 0.15,
    correlation: 0.62,
    volatility: 0.18
  });

  const [stressTests, setStressTests] = useState([
    { scenario: '2008 Financial Crisis', portfolioLoss: -28.5, probability: 'Low', hedgeProtection: 15.2 },
    { scenario: 'COVID-19 Market Crash', portfolioLoss: -22.1, probability: 'Medium', hedgeProtection: 18.7 },
    { scenario: 'Technology Bubble Burst', portfolioLoss: -35.4, probability: 'Low', hedgeProtection: 12.3 },
    { scenario: 'Flash Crash Event', portfolioLoss: -12.8, probability: 'Medium', hedgeProtection: 8.9 },
    { scenario: 'Interest Rate Shock', portfolioLoss: -18.2, probability: 'High', hedgeProtection: 22.1 }
  ]);

  return (
    <div className="space-y-6">
      {/* Risk Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio VaR ({timeframe})</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${riskMetrics[timeframe === '1D' ? 'var_1d' : timeframe === '1W' ? 'var_1w' : 'var_1m'].toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">95% confidence level</p>
            <div className="mt-2 flex gap-1">
              {['1D', '1W', '1M'].map((tf) => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? 'default' : 'outline'}
                  className="h-6 px-2 text-xs"
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{riskMetrics.maxDrawdown}%</div>
            <p className="text-xs text-green-600">Within 5% limit</p>
            <div className="mt-2">
              <Progress value={Math.abs(riskMetrics.maxDrawdown) * 20} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{riskMetrics.sharpe}</div>
            <p className="text-xs text-green-600">Excellent performance</p>
            <div className="text-xs text-muted-foreground mt-1">
              Sortino: {riskMetrics.sortino}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Beta</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{riskMetrics.beta}</div>
            <p className="text-xs text-muted-foreground">vs S&P 500</p>
            <div className="text-xs text-green-600 mt-1">
              Alpha: +{(riskMetrics.alpha * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Limits Monitor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Limits Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Position Concentration', current: 85, limit: 100, status: 'ok', description: 'Max single position size' },
              { name: 'Sector Exposure', current: 45, limit: 50, status: 'warning', description: 'Technology sector limit' },
              { name: 'Daily Loss Limit', current: 15, limit: 100, status: 'ok', description: 'Maximum daily loss' },
              { name: 'Volatility Threshold', current: 92, limit: 100, status: 'warning', description: 'Portfolio volatility' },
              { name: 'Correlation Risk', current: 30, limit: 80, status: 'ok', description: 'Average correlation' },
              { name: 'Leverage Ratio', current: 75, limit: 150, status: 'ok', description: 'Total leverage used' }
            ].map((limit) => (
              <div key={limit.name} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="font-medium">{limit.name}</div>
                  <div className="text-sm text-muted-foreground">{limit.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Current: {limit.current} / Limit: {limit.limit}
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex-1">
                    <Progress 
                      value={(limit.current / limit.limit) * 100} 
                      className="h-2"
                    />
                  </div>
                  <Badge variant={
                    limit.status === 'ok' ? 'default' : 
                    limit.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {limit.status === 'ok' ? 'OK' : limit.status === 'warning' ? 'WARNING' : 'BREACH'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stress Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Stress Testing & Scenario Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stressTests.map((test, index) => (
              <div key={index} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{test.scenario}</div>
                  <Badge variant={
                    test.probability === 'Low' ? 'outline' :
                    test.probability === 'Medium' ? 'secondary' : 'destructive'
                  }>
                    {test.probability} Risk
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Portfolio Loss:</span>
                    <div className="font-semibold text-red-600">{test.portfolioLoss}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hedge Protection:</span>
                    <div className="font-semibold text-green-600">+{test.hedgeProtection}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Impact:</span>
                    <div className="font-semibold">
                      {(test.portfolioLoss + test.hedgeProtection).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Composition Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Position Risk Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { symbol: 'AAPL', exposure: 12.5, var: 1250, beta: 1.2, sector: 'Technology' },
                { symbol: 'MSFT', exposure: 11.8, var: 1180, beta: 0.9, sector: 'Technology' },
                { symbol: 'GOOGL', exposure: 9.3, var: 980, beta: 1.1, sector: 'Technology' },
                { symbol: 'TSLA', exposure: 8.7, var: 1540, beta: 2.1, sector: 'Automotive' },
                { symbol: 'NVDA', exposure: 7.2, var: 1680, beta: 1.8, sector: 'Technology' }
              ].map((position) => (
                <div key={position.symbol} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{position.symbol}</div>
                    <Badge variant="outline" className="text-xs">{position.sector}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-right">
                    <div>
                      <div className="text-muted-foreground">Exposure</div>
                      <div className="font-medium">{position.exposure}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">VaR</div>
                      <div className="font-medium">${position.var}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Beta</div>
                      <div className="font-medium">{position.beta}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { factor: 'Market Risk', contribution: 45.2, color: 'bg-blue-500' },
                { factor: 'Sector Risk', contribution: 28.7, color: 'bg-green-500' },
                { factor: 'Stock Selection', contribution: 18.3, color: 'bg-purple-500' },
                { factor: 'Currency Risk', contribution: 5.1, color: 'bg-orange-500' },
                { factor: 'Other Factors', contribution: 2.7, color: 'bg-gray-500' }
              ].map((factor) => (
                <div key={factor.factor} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{factor.factor}</span>
                    <span className="font-medium">{factor.contribution}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${factor.color}`}
                      style={{ width: `${factor.contribution}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VaultBankingTab() {
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');

  const vaultData = {
    totalCapital: 125847,
    allocated: 98234,
    available: 27613,
    monthlyInflow: 8500,
    monthlyOutflow: 3200,
    totalReturn: 18.7
  };

  const vaults = [
    { 
      id: 'algo-trading',
      name: 'Algorithmic Trading', 
      allocation: 45000, 
      apy: 12.4, 
      status: 'active',
      risk: 'Medium',
      strategies: ['Momentum', 'Mean Reversion', 'Arbitrage'],
      lastRebalance: '2 days ago',
      performance: { ytd: 15.2, month: 2.8, week: 0.9 }
    },
    { 
      id: 'defi-ops',
      name: 'DeFi Operations', 
      allocation: 25000, 
      apy: 8.7, 
      status: 'active',
      risk: 'High',
      strategies: ['Yield Farming', 'Liquidity Mining', 'Staking'],
      lastRebalance: '1 week ago',
      performance: { ytd: 22.1, month: 3.4, week: 1.2 }
    },
    { 
      id: 'risk-hedge',
      name: 'Risk Hedging', 
      allocation: 15000, 
      apy: 4.2, 
      status: 'active',
      risk: 'Low',
      strategies: ['Options Hedging', 'VIX Protection', 'Correlation Trades'],
      lastRebalance: '3 days ago',
      performance: { ytd: 4.8, month: 0.6, week: -0.1 }
    },
    { 
      id: 'emergency',
      name: 'Emergency Reserve', 
      allocation: 10000, 
      apy: 2.1, 
      status: 'stable',
      risk: 'Very Low',
      strategies: ['Money Market', 'Treasury Bills', 'High-Grade Bonds'],
      lastRebalance: '1 month ago',
      performance: { ytd: 2.3, month: 0.2, week: 0.05 }
    },
    { 
      id: 'research',
      name: 'Research & Development', 
      allocation: 3234, 
      apy: 0.0, 
      status: 'development',
      risk: 'Variable',
      strategies: ['Strategy Testing', 'Model Development', 'Paper Trading'],
      lastRebalance: 'Never',
      performance: { ytd: -2.1, month: 0.5, week: 0.2 }
    }
  ];

  const transactions = [
    { id: 1, type: 'Allocation', from: 'Available', to: 'Algorithmic Trading', amount: 5000, date: '2024-01-08', status: 'completed' },
    { id: 2, type: 'Profit', from: 'DeFi Operations', to: 'Available', amount: 1200, date: '2024-01-07', status: 'completed' },
    { id: 3, type: 'Rebalance', from: 'Risk Hedging', to: 'Algorithmic Trading', amount: 2500, date: '2024-01-06', status: 'completed' },
    { id: 4, type: 'Withdrawal', from: 'Available', to: 'External', amount: 3000, date: '2024-01-05', status: 'pending' }
  ];

  return (
    <div className="space-y-6">
      {/* Master Vault Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Master Vault Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-700">${vaultData.totalCapital.toLocaleString()}</div>
              <div className="text-sm text-blue-600">Total Capital</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-700">${vaultData.allocated.toLocaleString()}</div>
              <div className="text-sm text-green-600">Allocated</div>
              <div className="text-xs text-green-500 mt-1">{((vaultData.allocated / vaultData.totalCapital) * 100).toFixed(1)}% of total</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">${vaultData.available.toLocaleString()}</div>
              <div className="text-sm text-yellow-600">Available</div>
              <div className="text-xs text-yellow-500 mt-1">Ready for allocation</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-700">+{vaultData.totalReturn}%</div>
              <div className="text-sm text-purple-600">Total Return</div>
              <div className="text-xs text-purple-500 mt-1">Year to date</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-lg font-bold text-gray-700">+${vaultData.monthlyInflow.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Monthly Net Flow</div>
              <div className="text-xs text-gray-500 mt-1">Inflow: ${vaultData.monthlyInflow.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Outflow: ${vaultData.monthlyOutflow.toLocaleString()}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button className="flex-1">
              <DollarSign className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
            <Button variant="outline" className="flex-1">
              <Activity className="w-4 h-4 mr-2" />
              Rebalance All
            </Button>
            <Button variant="outline" className="flex-1">
              <Settings className="w-4 h-4 mr-2" />
              Vault Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Vaults */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vaults.map((vault) => (
          <Card key={vault.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedVault(vault.id)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{vault.name}</CardTitle>
                <Badge variant={vault.status === 'active' ? 'default' : vault.status === 'stable' ? 'secondary' : 'outline'}>
                  {vault.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="text-2xl font-bold">${vault.allocation.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Allocated Capital</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-lg font-semibold text-green-600">{vault.apy}%</div>
                    <div className="text-xs text-muted-foreground">Target APY</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{vault.risk}</div>
                    <div className="text-xs text-muted-foreground">Risk Level</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Performance</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className={vault.performance.ytd >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {vault.performance.ytd >= 0 ? '+' : ''}{vault.performance.ytd}%
                      </div>
                      <div className="text-muted-foreground">YTD</div>
                    </div>
                    <div>
                      <div className={vault.performance.month >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {vault.performance.month >= 0 ? '+' : ''}{vault.performance.month}%
                      </div>
                      <div className="text-muted-foreground">Month</div>
                    </div>
                    <div>
                      <div className={vault.performance.week >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {vault.performance.week >= 0 ? '+' : ''}{vault.performance.week}%
                      </div>
                      <div className="text-muted-foreground">Week</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-1">Strategies</div>
                  <div className="flex flex-wrap gap-1">
                    {vault.strategies.map((strategy, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {strategy}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last rebalance: {vault.lastRebalance}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Manage
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Fund Transfer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Transfer & Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Vault</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
              >
                <option value="">Select source vault</option>
                <option value="available">Available Funds</option>
                {vaults.map(vault => (
                  <option key={vault.id} value={vault.id}>{vault.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Vault</label>
              <select 
                className="w-full p-2 border rounded-md"
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
              >
                <option value="">Select destination vault</option>
                {vaults.map(vault => (
                  <option key={vault.id} value={vault.id}>{vault.name}</option>
                ))}
                <option value="external">External Account</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Amount ($)</label>
              <input 
                type="number"
                className="w-full p-2 border rounded-md"
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
            </div>
          </div>
          <Button disabled={!transferFrom || !transferTo || !transferAmount}>
            <ArrowUpRight className="w-4 h-4 mr-2" />
            Execute Transfer
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    transaction.status === 'completed' ? 'bg-green-500' : 
                    transaction.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <div>
                    <div className="font-medium">{transaction.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {transaction.from} → {transaction.to}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${transaction.amount.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{transaction.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsTab({ strategies }: any) {
  const [timeframe, setTimeframe] = useState('1M');
  const [selectedMetric, setSelectedMetric] = useState('return');

  const performanceData = {
    totalReturn: 28.7,
    sharpe: 2.34,
    sortino: 3.12,
    winRate: 87.3,
    maxDrawdown: -4.2,
    volatility: 18.5,
    alpha: 0.15,
    beta: 0.78,
    calmarRatio: 6.8,
    informationRatio: 1.45
  };

  const strategyPerformance = [
    { name: 'Momentum Strategy', return: 34.2, sharpe: 2.8, winRate: 89.5, trades: 127, avgHold: '2.3 days', allocation: 35 },
    { name: 'Mean Reversion', return: 22.1, sharpe: 2.1, winRate: 85.2, trades: 98, avgHold: '1.8 days', allocation: 25 },
    { name: 'Arbitrage', return: 18.9, sharpe: 3.2, winRate: 92.1, trades: 203, avgHold: '0.5 days', allocation: 20 },
    { name: 'Trend Following', return: 31.5, sharpe: 1.9, winRate: 78.3, trades: 76, avgHold: '5.2 days', allocation: 15 },
    { name: 'Statistical Arbitrage', return: 15.7, sharpe: 2.5, winRate: 88.9, trades: 156, avgHold: '0.8 days', allocation: 5 }
  ];

  const monthlyReturns = [
    { month: 'Jan', return: 2.8, benchmark: 1.2 },
    { month: 'Feb', return: -1.1, benchmark: -0.8 },
    { month: 'Mar', return: 4.2, benchmark: 2.1 },
    { month: 'Apr', return: 3.7, benchmark: 1.9 },
    { month: 'May', return: 1.9, benchmark: 0.7 },
    { month: 'Jun', return: 2.4, benchmark: 1.5 },
    { month: 'Jul', return: 3.1, benchmark: 2.3 },
    { month: 'Aug', return: -0.8, benchmark: -1.2 },
    { month: 'Sep', return: 2.7, benchmark: 1.8 },
    { month: 'Oct', return: 4.1, benchmark: 2.5 },
    { month: 'Nov', return: 3.3, benchmark: 1.7 },
    { month: 'Dec', return: 2.9, benchmark: 1.4 }
  ];

  const riskMetrics = [
    { metric: 'Value at Risk (95%)', value: '-$2,847', status: 'normal' },
    { metric: 'Expected Shortfall', value: '-$4,125', status: 'normal' },
    { metric: 'Maximum Drawdown', value: '-4.2%', status: 'good' },
    { metric: 'Volatility (Annualized)', value: '18.5%', status: 'normal' },
    { metric: 'Downside Deviation', value: '12.3%', status: 'good' },
    { metric: 'Tracking Error', value: '8.7%', status: 'normal' }
  ];

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{performanceData.totalReturn}%</div>
            <p className="text-xs text-muted-foreground">Since inception</p>
            <div className="mt-2">
              <Progress value={Math.min(performanceData.totalReturn * 2, 100)} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{performanceData.sharpe}</div>
            <p className="text-xs text-green-600">Excellent</p>
            <div className="text-xs text-muted-foreground mt-1">
              Sortino: {performanceData.sortino}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.winRate}%</div>
            <p className="text-xs text-green-600">Outstanding</p>
            <div className="mt-2">
              <Progress value={performanceData.winRate} className="h-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{performanceData.maxDrawdown}%</div>
            <p className="text-xs text-green-600">Low risk</p>
            <div className="text-xs text-muted-foreground mt-1">
              Volatility: {performanceData.volatility}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alpha/Beta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">+{(performanceData.alpha * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Alpha vs S&P 500</p>
            <div className="text-xs text-muted-foreground mt-1">
              Beta: {performanceData.beta}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Breakdown
            </CardTitle>
            <div className="flex gap-2">
              {['1W', '1M', '3M', '6M', '1Y', 'ALL'].map((tf) => (
                <Button
                  key={tf}
                  size="sm"
                  variant={timeframe === tf ? 'default' : 'outline'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500 font-medium">Portfolio Performance Chart</p>
              <p className="text-gray-400 text-sm">Interactive performance visualization would be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Performance & Monthly Returns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Strategy Performance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategyPerformance.map((strategy) => (
                <div key={strategy.name} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">{strategy.name}</div>
                    <Badge variant="outline">{strategy.allocation}% allocation</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground">Return</div>
                      <div className="font-semibold text-green-600">+{strategy.return}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sharpe</div>
                      <div className="font-semibold">{strategy.sharpe}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Win Rate</div>
                      <div className="font-semibold">{strategy.winRate}%</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{strategy.trades} trades</span>
                    <span>Avg hold: {strategy.avgHold}</span>
                  </div>
                  
                  <div className="mt-2">
                    <Progress value={strategy.winRate} className="h-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Returns vs Benchmark</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyReturns.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="font-medium w-12">{month.month}</div>
                  <div className="flex-1 mx-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 relative">
                        <div 
                          className={`h-2 rounded-full ${month.return >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(Math.abs(month.return) * 10, 100)}%` }}
                        ></div>
                      </div>
                      <div className="w-16 text-right">
                        <div className={`text-sm font-medium ${month.return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {month.return >= 0 ? '+' : ''}{month.return}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Benchmark: {month.benchmark >= 0 ? '+' : ''}{month.benchmark}% 
                      <span className={`ml-2 ${(month.return - month.benchmark) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({month.return - month.benchmark >= 0 ? '+' : ''}{(month.return - month.benchmark).toFixed(1)}% vs benchmark)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Analytics & Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskMetrics.map((risk) => (
                <div key={risk.metric} className="flex items-center justify-between p-3 border rounded">
                  <div className="font-medium">{risk.metric}</div>
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">{risk.value}</div>
                    <Badge variant={
                      risk.status === 'good' ? 'default' :
                      risk.status === 'normal' ? 'secondary' : 'destructive'
                    }>
                      {risk.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { factor: 'Asset Selection', contribution: 12.3, description: 'Stock picking performance' },
                { factor: 'Market Timing', contribution: 8.7, description: 'Entry/exit timing' },
                { factor: 'Sector Allocation', contribution: 5.2, description: 'Sector weight decisions' },
                { factor: 'Risk Management', contribution: 2.1, description: 'Stop-loss effectiveness' },
                { factor: 'Trading Costs', contribution: -0.8, description: 'Fees and slippage' },
                { factor: 'Other Factors', contribution: 0.2, description: 'Residual effects' }
              ].map((factor) => (
                <div key={factor.factor} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{factor.factor}</div>
                      <div className="text-xs text-muted-foreground">{factor.description}</div>
                    </div>
                    <div className={`font-semibold ${factor.contribution >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {factor.contribution >= 0 ? '+' : ''}{factor.contribution}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${factor.contribution >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(Math.abs(factor.contribution) * 8, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{performanceData.calmarRatio}</div>
              <div className="text-sm text-muted-foreground">Calmar Ratio</div>
              <div className="text-xs text-muted-foreground mt-1">Return/Max Drawdown</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{performanceData.informationRatio}</div>
              <div className="text-sm text-muted-foreground">Information Ratio</div>
              <div className="text-xs text-muted-foreground mt-1">Active return/tracking error</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">92.1%</div>
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="text-xs text-muted-foreground mt-1">Gross profit/gross loss</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">2.8:1</div>
              <div className="text-sm text-muted-foreground">Risk/Reward Ratio</div>
              <div className="text-xs text-muted-foreground mt-1">Average win/average loss</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentManagementTab({ agents }: any) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState('group');
  const [deploymentConfig, setDeploymentConfig] = useState({
    environment: 'production',
    autoRestart: true,
    maxRetries: 3,
    resourceLimit: 'medium'
  });
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const autoGenAgents = [
    {
      id: 'market_analyst',
      name: 'Market Analyst',
      type: 'UserProxyAgent',
      status: 'active',
      model: 'gpt-4-turbo',
      responseTime: 180,
      successRate: 96.2,
      capabilities: ['technical_analysis', 'market_sentiment', 'price_prediction', 'pattern_recognition'],
      conversationsActive: 2,
      messagesProcessed: 847,
      lastActivity: '2 min ago',
      resources: { cpu: 45, memory: 23, network: 12 },
      systemPrompt: 'You are a market analyst specialized in technical analysis and market sentiment...'
    },
    {
      id: 'risk_manager',
      name: 'Risk Manager',
      type: 'AssistantAgent',
      status: 'active',
      model: 'gpt-4-turbo',
      responseTime: 156,
      successRate: 98.1,
      capabilities: ['risk_assessment', 'position_sizing', 'portfolio_analysis', 'var_calculation'],
      conversationsActive: 1,
      messagesProcessed: 523,
      lastActivity: '1 min ago',
      resources: { cpu: 32, memory: 18, network: 8 },
      systemPrompt: 'You are a risk manager responsible for portfolio risk assessment...'
    },
    {
      id: 'trade_executor',
      name: 'Trade Executor',
      type: 'ConversableAgent',
      status: 'active',
      model: 'gpt-4-turbo',
      responseTime: 89,
      successRate: 99.3,
      capabilities: ['order_execution', 'trade_management', 'market_timing', 'order_routing'],
      conversationsActive: 3,
      messagesProcessed: 1205,
      lastActivity: '30 sec ago',
      resources: { cpu: 67, memory: 41, network: 28 },
      systemPrompt: 'You are a trade executor responsible for order placement and execution...'
    },
    {
      id: 'research_agent',
      name: 'Research Agent',
      type: 'AssistantAgent',
      status: 'active',
      model: 'gpt-4-turbo',
      responseTime: 234,
      successRate: 94.7,
      capabilities: ['fundamental_analysis', 'news_analysis', 'sector_research', 'earnings_analysis'],
      conversationsActive: 1,
      messagesProcessed: 356,
      lastActivity: '5 min ago',
      resources: { cpu: 28, memory: 15, network: 19 },
      systemPrompt: 'You are a research agent specialized in fundamental analysis...'
    },
    {
      id: 'portfolio_manager',
      name: 'Portfolio Manager',
      type: 'GroupChatManager',
      status: 'active',
      model: 'gpt-4-turbo',
      responseTime: 198,
      successRate: 97.4,
      capabilities: ['portfolio_optimization', 'asset_allocation', 'performance_attribution', 'rebalancing'],
      conversationsActive: 4,
      messagesProcessed: 678,
      lastActivity: '3 min ago',
      resources: { cpu: 52, memory: 34, network: 15 },
      systemPrompt: 'You are a portfolio manager responsible for overall portfolio strategy...'
    }
  ];

  const activeConversations = [
    {
      id: 'conv_001',
      name: 'AAPL Analysis Session',
      participants: ['market_analyst', 'risk_manager', 'trade_executor'],
      status: 'active',
      messageCount: 23,
      duration: '12m 34s',
      lastMessage: 'Risk Manager: Position size should not exceed 2% of portfolio',
      priority: 'high'
    },
    {
      id: 'conv_002',
      name: 'Portfolio Rebalancing',
      participants: ['portfolio_manager', 'risk_manager', 'research_agent'],
      status: 'active',
      messageCount: 18,
      duration: '8m 15s',
      lastMessage: 'Portfolio Manager: Initiating sector rotation strategy',
      priority: 'medium'
    },
    {
      id: 'conv_003',
      name: 'Market Sentiment Analysis',
      participants: ['research_agent', 'market_analyst'],
      status: 'waiting',
      messageCount: 7,
      duration: '3m 42s',
      lastMessage: 'Research Agent: Analyzing earnings reports for tech sector',
      priority: 'low'
    }
  ];

  const agentTemplates = [
    {
      name: 'Market Sentiment Analyzer',
      type: 'AssistantAgent',
      description: 'Specialized in social media and news sentiment analysis',
      capabilities: ['sentiment_analysis', 'social_media_monitoring', 'news_impact'],
      model: 'gpt-4-turbo',
      status: 'Available'
    },
    {
      name: 'Options Strategy Agent',
      type: 'UserProxyAgent',
      description: 'Expert in options trading strategies and volatility analysis',
      capabilities: ['options_analysis', 'volatility_modeling', 'strategy_optimization'],
      model: 'gpt-4-turbo',
      status: 'Available'
    },
    {
      name: 'Crypto Trading Agent',
      type: 'ConversableAgent',
      description: 'Specialized in cryptocurrency market analysis and trading',
      capabilities: ['crypto_analysis', 'defi_protocols', 'on_chain_analysis'],
      model: 'gpt-4-turbo',
      status: 'Available'
    },
    {
      name: 'ESG Compliance Agent',
      type: 'AssistantAgent',
      description: 'Ensures trades meet ESG criteria and sustainability goals',
      capabilities: ['esg_scoring', 'sustainability_analysis', 'compliance_checking'],
      model: 'gpt-4-turbo',
      status: 'Available'
    }
  ];

  const handleAgentAction = async (agentId: string, action: string) => {
    try {
      const response = await fetch('/api/agents/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action })
      });
      // Handle response
    } catch (error) {
      console.error('Agent action failed:', error);
    }
  };

  const handleDeployAgent = async (template: any) => {
    try {
      const response = await fetch('/api/agents/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          template,
          config: deploymentConfig
        })
      });
      // Handle response
    } catch (error) {
      console.error('Agent deployment failed:', error);
    }
  };

  const handleStartConversation = async (participants: string[], topic: string) => {
    try {
      const response = await fetch('/api/agents/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants,
          topic,
          mode: conversationMode
        })
      });
      // Handle response
    } catch (error) {
      console.error('Conversation start failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* AutoGen Management Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AutoGen Agents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{autoGenAgents.length}</div>
            <p className="text-xs text-muted-foreground">Deployed agents</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs">{autoGenAgents.filter(a => a.status === 'active').length} active</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeConversations.filter(c => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Multi-agent sessions</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs">{activeConversations.reduce((sum, c) => sum + c.messageCount, 0)} messages</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(autoGenAgents.reduce((sum, a) => sum + a.responseTime, 0) / autoGenAgents.length)}ms
            </div>
            <p className="text-xs text-green-600">Excellent performance</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(autoGenAgents.reduce((sum, a) => sum + a.successRate, 0) / autoGenAgents.length).toFixed(1)}%
            </div>
            <p className="text-xs text-green-600">High reliability</p>
          </CardContent>
        </Card>
      </div>

      {/* AutoGen Agent Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AutoGen Agent Orchestra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {autoGenAgents.map((agent) => (
              <div key={agent.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      <div className="font-semibold">{agent.name}</div>
                    </div>
                    <Badge variant="outline">{agent.type}</Badge>
                    <Badge variant="secondary">{agent.model}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}>
                      {selectedAgent === agent.id ? 'Hide Details' : 'View Details'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleAgentAction(agent.id, 'restart')}>
                      Restart
                    </Button>
                    <Button size="sm" variant={agent.status === 'active' ? 'destructive' : 'default'} 
                      onClick={() => handleAgentAction(agent.id, agent.status === 'active' ? 'stop' : 'start')}>
                      {agent.status === 'active' ? 'Stop' : 'Start'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Response Time:</span>
                    <div className="font-medium">{agent.responseTime}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <div className="font-medium">{agent.successRate}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conversations:</span>
                    <div className="font-medium">{agent.conversationsActive} active</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Messages:</span>
                    <div className="font-medium">{agent.messagesProcessed}</div>
                  </div>
                </div>

                {selectedAgent === agent.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Capabilities</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Resource Usage</div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <span className="text-xs text-muted-foreground">CPU:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={agent.resources.cpu} className="h-2" />
                            <span className="text-xs">{agent.resources.cpu}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Memory:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={agent.resources.memory} className="h-2" />
                            <span className="text-xs">{agent.resources.memory}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Network:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={agent.resources.network} className="h-2" />
                            <span className="text-xs">{agent.resources.network}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">System Prompt</div>
                      <div className="text-xs bg-gray-50 p-3 rounded border max-h-20 overflow-y-auto">
                        {agent.systemPrompt}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Conversations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Active Agent Conversations
            </CardTitle>
            <div className="flex items-center gap-2">
              <select 
                value={conversationMode} 
                onChange={(e) => setConversationMode(e.target.value)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="group">Group Chat</option>
                <option value="sequential">Sequential</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
              <Button size="sm" onClick={() => handleStartConversation(['market_analyst', 'risk_manager'], 'New Analysis')}>
                Start Conversation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeConversations.map((conversation) => (
              <div key={conversation.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{conversation.name}</div>
                    <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                      {conversation.status}
                    </Badge>
                    <Badge variant={
                      conversation.priority === 'high' ? 'destructive' :
                      conversation.priority === 'medium' ? 'secondary' : 'outline'
                    }>
                      {conversation.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{conversation.messageCount} messages</span>
                    <span>•</span>
                    <span>{conversation.duration}</span>
                  </div>
                </div>

                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">Participants: </span>
                  {conversation.participants.map((p, i) => (
                    <span key={p}>
                      {autoGenAgents.find(a => a.id === p)?.name}
                      {i < conversation.participants.length - 1 && ', '}
                    </span>
                  ))}
                </div>

                <div className="text-sm text-muted-foreground mb-3 italic">
                  "{conversation.lastMessage}"
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActiveConversation(conversation.id)}>
                    View Conversation
                  </Button>
                  <Button size="sm" variant="outline">
                    Add Participant
                  </Button>
                  <Button size="sm" variant={conversation.status === 'active' ? 'secondary' : 'default'}>
                    {conversation.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent Templates & Deployment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Agent Templates & Deployment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Deployment Configuration</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Environment</label>
                    <select 
                      value={deploymentConfig.environment}
                      onChange={(e) => setDeploymentConfig({...deploymentConfig, environment: e.target.value})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="production">Production</option>
                      <option value="staging">Staging</option>
                      <option value="development">Development</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Resource Limit</label>
                    <select 
                      value={deploymentConfig.resourceLimit}
                      onChange={(e) => setDeploymentConfig({...deploymentConfig, resourceLimit: e.target.value})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    >
                      <option value="low">Low (1 CPU, 512MB)</option>
                      <option value="medium">Medium (2 CPU, 1GB)</option>
                      <option value="high">High (4 CPU, 2GB)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={deploymentConfig.autoRestart}
                      onChange={(e) => setDeploymentConfig({...deploymentConfig, autoRestart: e.target.checked})}
                    />
                    <label className="text-sm">Auto-restart on failure</label>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-3">Available Agent Templates</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {agentTemplates.map((template) => (
                  <div key={template.name} className="p-4 border rounded-lg">
                    <div className="font-medium text-sm mb-1">{template.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{template.description}</div>
                    <div className="flex items-center gap-1 mb-3">
                      <Badge variant="outline" className="text-xs">{template.type}</Badge>
                      <Badge variant="secondary" className="text-xs">{template.model}</Badge>
                    </div>
                    <div className="mb-3">
                      <div className="text-xs text-muted-foreground mb-1">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {template.capabilities.slice(0, 2).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap.replace('_', ' ')}
                          </Badge>
                        ))}
                        {template.capabilities.length > 2 && (
                          <span className="text-xs text-muted-foreground">+{template.capabilities.length - 2} more</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => handleDeployAgent(template)}>
                      Deploy Agent
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MCPServersTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { name: 'Core Orchestrator', status: 'online', uptime: '99.9%', requests: 1247 },
          { name: 'Data Pipeline', status: 'online', uptime: '99.8%', requests: 3456 },
          { name: 'Agent Coordinator', status: 'online', uptime: '100%', requests: 892 },
          { name: 'Persistence Layer', status: 'warning', uptime: '98.7%', requests: 2134 },
          { name: 'Trading Gateway', status: 'online', uptime: '99.5%', requests: 756 },
          { name: 'Security Layer', status: 'online', uptime: '100%', requests: 445 }
        ].map((server) => (
          <Card key={server.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <Badge variant={server.status === 'online' ? 'default' : 'destructive'}>
                  {server.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Uptime</div>
                  <div className="text-lg font-semibold">{server.uptime}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Requests/hr</div>
                  <div className="text-lg font-semibold">{server.requests}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    Restart
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Logs
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
              <div className="text-2xl font-bold">127ms</div>
              <Progress value={75} className="mt-2" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
              <div className="text-2xl font-bold">0.02%</div>
              <Progress value={2} className="mt-2" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Throughput</div>
              <div className="text-2xl font-bold">8.9k/hr</div>
              <Progress value={89} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DataManagementTab() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [processingJobs, setProcessingJobs] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date');

  const dataFolders = [
    { id: 'all', name: 'All Files', count: 28, icon: FileText },
    { id: 'market_data', name: 'Market Data', count: 12, icon: BarChart3 },
    { id: 'strategy_configs', name: 'Strategy Configs', count: 6, icon: Settings },
    { id: 'backtests', name: 'Backtest Results', count: 4, icon: Activity },
    { id: 'risk_models', name: 'Risk Models', count: 3, icon: Shield },
    { id: 'research', name: 'Research Data', count: 8, icon: Brain }
  ];

  const fileList = [
    {
      id: 1,
      name: 'AAPL_daily_data_2024.csv',
      type: 'CSV',
      size: '2.4 MB',
      uploaded: '2 hours ago',
      folder: 'market_data',
      status: 'processed',
      preview: { rows: 8760, columns: 12, quality: 98.5 },
      tags: ['AAPL', 'daily', '2024', 'price_data']
    },
    {
      id: 2,
      name: 'momentum_strategy_v3.json',
      type: 'JSON',
      size: '156 KB',
      uploaded: '1 day ago',
      folder: 'strategy_configs',
      status: 'validated',
      preview: { parameters: 24, backtested: true, performance: 15.7 },
      tags: ['momentum', 'strategy', 'validated']
    },
    {
      id: 3,
      name: 'portfolio_risk_model.xlsx',
      type: 'Excel',
      size: '890 KB',
      uploaded: '3 days ago',
      folder: 'risk_models',
      status: 'processing',
      preview: { sheets: 6, calculations: 45, accuracy: 94.2 },
      tags: ['risk', 'portfolio', 'model']
    },
    {
      id: 4,
      name: 'market_sentiment_signals.csv',
      type: 'CSV',
      size: '5.2 MB',
      uploaded: '1 week ago',
      folder: 'research',
      status: 'processed',
      preview: { rows: 50000, features: 18, sentiment_score: 0.72 },
      tags: ['sentiment', 'signals', 'research']
    },
    {
      id: 5,
      name: 'backtest_results_Q1_2024.zip',
      type: 'Archive',
      size: '12.3 MB',
      uploaded: '2 weeks ago',
      folder: 'backtests',
      status: 'archived',
      preview: { strategies: 8, trades: 2847, sharpe_ratio: 2.34 },
      tags: ['backtest', 'Q1', '2024', 'results']
    }
  ];

  const processingRules = [
    {
      id: 1,
      name: 'Market Data Validation',
      description: 'Validates OHLCV data format and removes outliers',
      status: 'active',
      rules: 12,
      lastRun: '5 min ago',
      successRate: 99.2,
      autoTrigger: true
    },
    {
      id: 2,
      name: 'Strategy Config Validation',
      description: 'Validates JSON strategy configurations',
      status: 'active',
      rules: 8,
      lastRun: '1 hour ago',
      successRate: 96.8,
      autoTrigger: true
    },
    {
      id: 3,
      name: 'Risk Model Processing',
      description: 'Processes and validates risk calculation models',
      status: 'paused',
      rules: 15,
      lastRun: '2 days ago',
      successRate: 87.5,
      autoTrigger: false
    },
    {
      id: 4,
      name: 'Sentiment Analysis Pipeline',
      description: 'Processes sentiment data and generates signals',
      status: 'active',
      rules: 6,
      lastRun: '30 min ago',
      successRate: 94.1,
      autoTrigger: true
    }
  ];

  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    
    for (const file of fileArray) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', selectedFolder);
      
      try {
        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Actual upload would happen here
        const response = await fetch('/api/data/upload', {
          method: 'POST',
          body: formData
        });
        
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  const handleFileAction = async (fileId: number, action: string) => {
    try {
      const response = await fetch(`/api/data/files/${fileId}/${action}`, {
        method: 'POST'
      });
      // Handle response
    } catch (error) {
      console.error('File action failed:', error);
    }
  };

  const handleProcessingRuleToggle = async (ruleId: number, enabled: boolean) => {
    try {
      const response = await fetch(`/api/data/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      // Handle response
    } catch (error) {
      console.error('Rule toggle failed:', error);
    }
  };

  const filteredFiles = fileList.filter(file => {
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder;
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Data Management Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fileList.length}</div>
            <p className="text-xs text-muted-foreground">Across all folders</p>
            <div className="text-xs text-green-600 mt-1">
              +3 files this week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127 GB</div>
            <p className="text-xs text-muted-foreground">of 500 GB limit</p>
            <Progress value={25.4} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Jobs</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Active pipelines</p>
            <div className="text-xs text-green-600 mt-1">
              96.2% success rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">94.8%</div>
            <p className="text-xs text-muted-foreground">Overall quality score</p>
            <div className="text-xs text-green-600 mt-1">
              +2.1% vs last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Advanced File Upload & Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    handleFileUpload(e.dataTransfer.files);
                  }
                }}
              >
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <div className="text-lg font-medium">Upload Trading Data Files</div>
                <div className="text-sm text-muted-foreground mb-4">
                  Supports CSV, JSON, Excel, ZIP files up to 100MB
                </div>
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept=".csv,.json,.xlsx,.xls,.zip,.txt"
                />
                <label htmlFor="file-upload">
                  <Button className="cursor-pointer">Choose Files</Button>
                </label>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={uploadProgress[file.name] || 0} className="w-20 h-2" />
                          <span className="text-xs">{uploadProgress[file.name] || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Upload Options</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Target Folder</label>
                  <select 
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm"
                  >
                    <option value="market_data">Market Data</option>
                    <option value="strategy_configs">Strategy Configs</option>
                    <option value="backtests">Backtest Results</option>
                    <option value="risk_models">Risk Models</option>
                    <option value="research">Research Data</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="auto-process" defaultChecked />
                  <label htmlFor="auto-process" className="text-sm">Auto-process on upload</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="validate" defaultChecked />
                  <label htmlFor="validate" className="text-sm">Validate data format</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="backup" />
                  <label htmlFor="backup" className="text-sm">Create backup copy</label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Browser */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              File Browser & Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search files or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 border rounded text-sm w-64"
              />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="size">Sort by Size</option>
                <option value="type">Sort by Type</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                {viewMode === 'grid' ? 'List' : 'Grid'} View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Folder Navigation */}
            <div>
              <div className="text-sm font-medium mb-3">Folders</div>
              <div className="space-y-1">
                {dataFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedFolder === folder.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedFolder(folder.id)}
                  >
                    <div className="flex items-center gap-2">
                      <folder.icon className="h-4 w-4" />
                      <span className="text-sm">{folder.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {folder.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* File List */}
            <div className="lg:col-span-3">
              <div className="space-y-3">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {file.type} • {file.size} • {file.uploaded}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          file.status === 'processed' ? 'default' :
                          file.status === 'processing' ? 'secondary' :
                          file.status === 'validated' ? 'outline' : 'destructive'
                        }>
                          {file.status}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleFileAction(file.id, 'download')}>
                          Download
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleFileAction(file.id, 'process')}>
                          Process
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {file.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                      <strong>Preview: </strong>
                      {file.type === 'CSV' && `${file.preview.rows} rows, ${file.preview.columns} columns, ${file.preview.quality}% quality`}
                      {file.type === 'JSON' && `${file.preview.parameters} parameters, backtested: ${file.preview.backtested}, performance: ${file.preview.performance}%`}
                      {file.type === 'Excel' && `${file.preview.sheets} sheets, ${file.preview.calculations} calculations, ${file.preview.accuracy}% accuracy`}
                      {file.type === 'Archive' && `${file.preview.strategies} strategies, ${file.preview.trades} trades, Sharpe: ${file.preview.sharpe_ratio}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Processing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Processing & Validation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {processingRules.map((rule) => (
              <div key={rule.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-muted-foreground">{rule.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                      {rule.status}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant={rule.status === 'active' ? 'destructive' : 'default'}
                      onClick={() => handleProcessingRuleToggle(rule.id, rule.status !== 'active')}
                    >
                      {rule.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Rules:</span>
                    <div className="font-medium">{rule.rules} configured</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Run:</span>
                    <div className="font-medium">{rule.lastRun}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <div className="font-medium text-green-600">{rule.successRate}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto Trigger:</span>
                    <div className="font-medium">{rule.autoTrigger ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={rule.successRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentTradingTab({ agents }: any) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [permissionsMode, setPermissionsMode] = useState<'overview' | 'detailed'>('overview');
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  const tradingAgents = [
    {
      id: 'market_analyst_trader',
      name: 'Market Analyst Trader',
      type: 'Momentum',
      status: 'active',
      permissions: {
        riskLevel: 'medium',
        maxPositionSize: 50000,
        maxDailyLoss: 5000,
        allowedSymbols: ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL'],
        allowedOrderTypes: ['market', 'limit', 'stop_loss'],
        sectorLimits: { tech: 40, energy: 20, finance: 15 },
        tradingHours: { start: '09:30', end: '16:00', timezone: 'EST' },
        requireApproval: { amount: 25000, volatility: 30 }
      },
      currentUsage: {
        positionSize: 32000,
        dailyLoss: 750,
        tradesExecuted: 23,
        avgExecutionTime: '180ms',
        successRate: 94.2
      },
      portfolio: {
        totalValue: 125000,
        cash: 18000,
        positions: 8,
        pnl: 12500,
        exposure: 0.76
      }
    },
    {
      id: 'risk_arbitrage_agent',
      name: 'Risk Arbitrage Agent',
      type: 'Arbitrage',
      status: 'active',
      permissions: {
        riskLevel: 'high',
        maxPositionSize: 100000,
        maxDailyLoss: 10000,
        allowedSymbols: ['SPY', 'QQQ', 'IWM', 'GLD', 'TLT', 'VIX'],
        allowedOrderTypes: ['market', 'limit', 'stop_loss', 'bracket'],
        sectorLimits: { all: 100 },
        tradingHours: { start: '04:00', end: '20:00', timezone: 'EST' },
        requireApproval: { amount: 50000, volatility: 50 }
      },
      currentUsage: {
        positionSize: 87000,
        dailyLoss: 0,
        tradesExecuted: 156,
        avgExecutionTime: '95ms',
        successRate: 98.7
      },
      portfolio: {
        totalValue: 245000,
        cash: 12000,
        positions: 15,
        pnl: 8700,
        exposure: 0.95
      }
    },
    {
      id: 'options_trading_agent',
      name: 'Options Trading Agent',
      type: 'Options',
      status: 'restricted',
      permissions: {
        riskLevel: 'high',
        maxPositionSize: 75000,
        maxDailyLoss: 7500,
        allowedSymbols: ['AAPL', 'TSLA', 'SPY', 'QQQ'],
        allowedOrderTypes: ['limit', 'stop_loss'],
        sectorLimits: { tech: 60, index: 40 },
        tradingHours: { start: '09:30', end: '15:45', timezone: 'EST' },
        requireApproval: { amount: 10000, volatility: 25 }
      },
      currentUsage: {
        positionSize: 45000,
        dailyLoss: 2300,
        tradesExecuted: 34,
        avgExecutionTime: '245ms',
        successRate: 87.5
      },
      portfolio: {
        totalValue: 98000,
        cash: 23000,
        positions: 12,
        pnl: -2300,
        exposure: 0.61
      }
    },
    {
      id: 'crypto_trading_agent',
      name: 'Crypto Trading Agent',
      type: 'Cryptocurrency',
      status: 'paused',
      permissions: {
        riskLevel: 'very_high',
        maxPositionSize: 25000,
        maxDailyLoss: 2500,
        allowedSymbols: ['BTC', 'ETH', 'SOL', 'ADA'],
        allowedOrderTypes: ['market', 'limit'],
        sectorLimits: { crypto: 100 },
        tradingHours: { start: '00:00', end: '23:59', timezone: 'UTC' },
        requireApproval: { amount: 5000, volatility: 100 }
      },
      currentUsage: {
        positionSize: 0,
        dailyLoss: 0,
        tradesExecuted: 0,
        avgExecutionTime: 'N/A',
        successRate: 0
      },
      portfolio: {
        totalValue: 15000,
        cash: 15000,
        positions: 0,
        pnl: 0,
        exposure: 0
      }
    }
  ];

  const auditLog = [
    {
      id: 1,
      timestamp: '2024-01-15 10:34:22',
      agent: 'Market Analyst Trader',
      action: 'TRADE_EXECUTED',
      details: 'BUY 100 AAPL @ $155.00',
      approver: 'System',
      risk_score: 2.3,
      status: 'approved'
    },
    {
      id: 2,
      timestamp: '2024-01-15 10:32:15',
      agent: 'Risk Arbitrage Agent',
      action: 'PERMISSION_REQUEST',
      details: 'Request to increase position size to $120,000',
      approver: 'Risk Manager',
      risk_score: 4.1,
      status: 'pending'
    },
    {
      id: 3,
      timestamp: '2024-01-15 10:28:43',
      agent: 'Options Trading Agent',
      action: 'TRADE_BLOCKED',
      details: 'SELL 10 TSLA 200C - Volatility threshold exceeded',
      approver: 'System',
      risk_score: 6.8,
      status: 'blocked'
    },
    {
      id: 4,
      timestamp: '2024-01-15 10:25:12',
      agent: 'Market Analyst Trader',
      action: 'LIMIT_UPDATED',
      details: 'Daily loss limit increased to $6,000',
      approver: 'Human Operator',
      risk_score: 3.5,
      status: 'approved'
    }
  ];

  const handlePermissionUpdate = async (agentId: string, permission: string, value: any) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [permission]: value })
      });
      // Handle response
    } catch (error) {
      console.error('Permission update failed:', error);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/trading/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !emergencyStop })
      });
      setEmergencyStop(!emergencyStop);
    } catch (error) {
      console.error('Emergency stop failed:', error);
    }
  };

  const handleAgentAction = async (agentId: string, action: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/trading/${action}`, {
        method: 'POST'
      });
      // Handle response
    } catch (error) {
      console.error('Agent action failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trading Control Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Traders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tradingAgents.filter(a => a.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">of {tradingAgents.length} total</p>
            <div className="flex items-center gap-1 mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs">
                {tradingAgents.filter(a => a.status === 'active').length} trading actively
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${tradingAgents.reduce((sum, a) => sum + a.portfolio.totalValue, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Assets under management</p>
            <div className="text-xs text-green-600 mt-1">
              +{tradingAgents.reduce((sum, a) => sum + a.portfolio.pnl, 0).toLocaleString()} P&L
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Exposure</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((tradingAgents.reduce((sum, a) => sum + a.portfolio.exposure, 0) / tradingAgents.length) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Average exposure</p>
            <Progress value={(tradingAgents.reduce((sum, a) => sum + a.portfolio.exposure, 0) / tradingAgents.length) * 100} className="h-1 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Stop</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-2xl font-bold ${emergencyStop ? 'text-red-600' : 'text-green-600'}`}>
                  {emergencyStop ? 'ACTIVE' : 'INACTIVE'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {emergencyStop ? 'All trading halted' : 'Normal operations'}
                </p>
              </div>
              <Button
                size="sm"
                variant={emergencyStop ? 'destructive' : 'outline'}
                onClick={handleEmergencyStop}
              >
                {emergencyStop ? 'Resume' : 'Stop All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Permissions Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Trading Permissions & Controls
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={permissionsMode === 'overview' ? 'default' : 'outline'}
                onClick={() => setPermissionsMode('overview')}
              >
                Overview
              </Button>
              <Button
                size="sm"
                variant={permissionsMode === 'detailed' ? 'default' : 'outline'}
                onClick={() => setPermissionsMode('detailed')}
              >
                Detailed
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tradingAgents.map((agent) => (
              <div key={agent.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      agent.status === 'active' ? 'bg-green-500' :
                      agent.status === 'restricted' ? 'bg-orange-500' :
                      'bg-gray-400'
                    }`}></div>
                    <div>
                      <div className="font-semibold">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">{agent.type} Strategy</div>
                    </div>
                    <Badge variant={
                      agent.permissions.riskLevel === 'low' ? 'outline' :
                      agent.permissions.riskLevel === 'medium' ? 'secondary' :
                      agent.permissions.riskLevel === 'high' ? 'default' : 'destructive'
                    }>
                      {agent.permissions.riskLevel.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                    >
                      {selectedAgent === agent.id ? 'Hide Details' : 'Edit Permissions'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant={agent.status === 'active' ? 'destructive' : 'default'}
                      onClick={() => handleAgentAction(agent.id, agent.status === 'active' ? 'pause' : 'activate')}
                    >
                      {agent.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Max Position:</span>
                    <div className="font-medium">${agent.permissions.maxPositionSize.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Used: ${agent.currentUsage.positionSize.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Daily Loss Limit:</span>
                    <div className="font-medium">${agent.permissions.maxDailyLoss.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">
                      Used: ${agent.currentUsage.dailyLoss.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <div className="font-medium text-green-600">{agent.currentUsage.successRate}%</div>
                    <div className="text-xs text-muted-foreground">
                      {agent.currentUsage.tradesExecuted} trades today
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Portfolio Value:</span>
                    <div className="font-medium">${agent.portfolio.totalValue.toLocaleString()}</div>
                    <div className={`text-xs ${agent.portfolio.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {agent.portfolio.pnl >= 0 ? '+' : ''}${agent.portfolio.pnl.toLocaleString()} P&L
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Position Usage</div>
                    <Progress value={(agent.currentUsage.positionSize / agent.permissions.maxPositionSize) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Daily Loss Usage</div>
                    <Progress value={(agent.currentUsage.dailyLoss / agent.permissions.maxDailyLoss) * 100} className="h-2" />
                  </div>
                </div>

                {selectedAgent === agent.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium mb-3">Trading Permissions</div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Allowed Symbols</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.permissions.allowedSymbols.map((symbol) => (
                                <Badge key={symbol} variant="outline" className="text-xs">
                                  {symbol}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Order Types</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {agent.permissions.allowedOrderTypes.map((type) => (
                                <Badge key={type} variant="outline" className="text-xs">
                                  {type.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Trading Hours</label>
                            <div className="text-sm mt-1">
                              {agent.permissions.tradingHours.start} - {agent.permissions.tradingHours.end} {agent.permissions.tradingHours.timezone}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-medium mb-3">Risk Controls</div>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Approval Required</label>
                            <div className="text-sm mt-1">
                              Amount {'>'}${agent.permissions.requireApproval.amount.toLocaleString()} or Volatility {'>'} {agent.permissions.requireApproval.volatility}%
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Sector Limits</label>
                            <div className="space-y-1 mt-1">
                              {Object.entries(agent.permissions.sectorLimits).map(([sector, limit]) => (
                                <div key={sector} className="flex justify-between text-sm">
                                  <span className="capitalize">{sector}</span>
                                  <span>{limit}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handlePermissionUpdate(agent.id, 'maxPositionSize', agent.permissions.maxPositionSize * 1.1)}>
                        Increase Position Limit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePermissionUpdate(agent.id, 'riskLevel', 'high')}>
                        Upgrade Risk Level
                      </Button>
                      <Button size="sm" variant="outline">
                        Add Symbol Permission
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Trading Audit Log
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAuditLog(!showAuditLog)}>
              {showAuditLog ? 'Hide' : 'Show'} Full Log
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {auditLog.slice(0, showAuditLog ? auditLog.length : 4).map((entry) => (
              <div key={entry.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      entry.status === 'approved' ? 'default' :
                      entry.status === 'pending' ? 'secondary' : 'destructive'
                    }>
                      {entry.action.replace('_', ' ')}
                    </Badge>
                    <span className="font-medium">{entry.agent}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Risk: {entry.risk_score}/10
                    </Badge>
                    <span className="text-sm text-muted-foreground">{entry.timestamp}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-1">{entry.details}</div>
                <div className="text-xs text-muted-foreground">
                  Approver: {entry.approver} • Status: {entry.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}