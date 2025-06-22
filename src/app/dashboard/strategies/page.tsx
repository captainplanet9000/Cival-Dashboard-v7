import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Play, 
  Pause, 
  Settings, 
  BarChart3,
  DollarSign,
  Target,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle,
  Plus
} from "lucide-react";
import { formatPrice, formatPercentage } from "@/lib/utils";

// Complete 14 Trading Strategies from documentation
const strategies = [
  {
    id: 1,
    name: "Darvas Box Breakout",
    description: "High-momentum breakout strategy based on Nicolas Darvas' box theory",
    status: "active",
    performance: 12.34,
    monthlyReturn: 8.5,
    winRate: 91.3,
    trades: 23,
    sharpeRatio: 2.1,
    maxDrawdown: -3.2,
    capital: 25000,
    riskLevel: "medium",
    timeframe: "1h",
    lastSignal: "2 hours ago"
  },
  {
    id: 2,
    name: "Williams Alligator",
    description: "Trend-following strategy using Bill Williams' Alligator indicator",
    status: "active",
    performance: 8.76,
    monthlyReturn: 6.2,
    winRate: 83.3,
    trades: 18,
    sharpeRatio: 1.8,
    maxDrawdown: -4.1,
    capital: 20000,
    riskLevel: "low",
    timeframe: "4h",
    lastSignal: "1 hour ago"
  },
  {
    id: 3,
    name: "Renko + Moving Average",
    description: "Price action strategy combining Renko charts with MA crossovers",
    status: "paused",
    performance: -2.14,
    monthlyReturn: -1.8,
    winRate: 62.5,
    trades: 8,
    sharpeRatio: 0.4,
    maxDrawdown: -8.3,
    capital: 15000,
    riskLevel: "high",
    timeframe: "30m",
    lastSignal: "3 hours ago"
  },
  {
    id: 4,
    name: "Elliott Wave Detection",
    description: "Advanced pattern recognition for Elliott Wave formations",
    status: "active",
    performance: 15.87,
    monthlyReturn: 12.1,
    winRate: 100.0,
    trades: 12,
    sharpeRatio: 2.8,
    maxDrawdown: -1.5,
    capital: 30000,
    riskLevel: "medium",
    timeframe: "1d",
    lastSignal: "30 minutes ago"
  },
  {
    id: 5,
    name: "MACD Histogram Divergence",
    description: "Momentum strategy using MACD histogram divergence patterns",
    status: "active",
    performance: 9.42,
    monthlyReturn: 7.3,
    winRate: 76.8,
    trades: 31,
    sharpeRatio: 1.9,
    maxDrawdown: -5.2,
    capital: 18000,
    riskLevel: "medium",
    timeframe: "2h",
    lastSignal: "45 minutes ago"
  },
  {
    id: 6,
    name: "Bollinger Bands Squeeze",
    description: "Volatility breakout strategy using BB squeeze patterns",
    status: "active",
    performance: 7.23,
    monthlyReturn: 5.8,
    winRate: 71.4,
    trades: 14,
    sharpeRatio: 1.6,
    maxDrawdown: -6.1,
    capital: 22000,
    riskLevel: "medium",
    timeframe: "1h",
    lastSignal: "1.5 hours ago"
  },
  {
    id: 7,
    name: "Ichimoku Cloud Strategy",
    description: "Comprehensive trend analysis using Ichimoku Kinko Hyo system",
    status: "active",
    performance: 11.89,
    monthlyReturn: 9.2,
    winRate: 85.7,
    trades: 21,
    sharpeRatio: 2.3,
    maxDrawdown: -3.8,
    capital: 26000,
    riskLevel: "low",
    timeframe: "4h",
    lastSignal: "2 hours ago"
  },
  {
    id: 8,
    name: "Fibonacci Retracement",
    description: "Support/resistance strategy using Fibonacci levels",
    status: "active",
    performance: 6.54,
    monthlyReturn: 4.9,
    winRate: 68.9,
    trades: 27,
    sharpeRatio: 1.4,
    maxDrawdown: -7.2,
    capital: 16000,
    riskLevel: "medium",
    timeframe: "1h",
    lastSignal: "20 minutes ago"
  },
  {
    id: 9,
    name: "RSI Divergence Hunter",
    description: "Momentum reversal strategy using RSI divergence patterns",
    status: "paused",
    performance: 4.32,
    monthlyReturn: 3.1,
    winRate: 64.2,
    trades: 19,
    sharpeRatio: 1.1,
    maxDrawdown: -9.1,
    capital: 12000,
    riskLevel: "high",
    timeframe: "30m",
    lastSignal: "4 hours ago"
  },
  {
    id: 10,
    name: "Stochastic Oscillator Strategy",
    description: "Overbought/oversold momentum strategy using Stochastic",
    status: "active",
    performance: 8.91,
    monthlyReturn: 6.7,
    winRate: 79.3,
    trades: 24,
    sharpeRatio: 1.7,
    maxDrawdown: -4.6,
    capital: 19000,
    riskLevel: "medium",
    timeframe: "2h",
    lastSignal: "1 hour ago"
  },
  {
    id: 11,
    name: "Volume Profile Analysis",
    description: "Market structure strategy using volume profile levels",
    status: "active",
    performance: 13.67,
    monthlyReturn: 10.4,
    winRate: 88.9,
    trades: 16,
    sharpeRatio: 2.5,
    maxDrawdown: -2.9,
    capital: 28000,
    riskLevel: "low",
    timeframe: "6h",
    lastSignal: "3 hours ago"
  },
  {
    id: 12,
    name: "Mean Reversion Scalping",
    description: "High-frequency mean reversion strategy for scalping",
    status: "active",
    performance: 5.78,
    monthlyReturn: 4.2,
    winRate: 72.6,
    trades: 156,
    sharpeRatio: 1.3,
    maxDrawdown: -6.8,
    capital: 14000,
    riskLevel: "high",
    timeframe: "5m",
    lastSignal: "5 minutes ago"
  },
  {
    id: 13,
    name: "Harmonic Pattern Recognition",
    description: "Advanced geometric pattern strategy (Gartley, Butterfly, etc.)",
    status: "testing",
    performance: 2.15,
    monthlyReturn: 1.6,
    winRate: 58.3,
    trades: 6,
    sharpeRatio: 0.8,
    maxDrawdown: -4.2,
    capital: 10000,
    riskLevel: "medium",
    timeframe: "1d",
    lastSignal: "6 hours ago"
  },
  {
    id: 14,
    name: "Multi-Timeframe Confluence",
    description: "Advanced strategy combining signals across multiple timeframes",
    status: "active",
    performance: 16.34,
    monthlyReturn: 13.8,
    winRate: 93.8,
    trades: 11,
    sharpeRatio: 3.1,
    maxDrawdown: -1.8,
    capital: 35000,
    riskLevel: "low",
    timeframe: "Variable",
    lastSignal: "15 minutes ago"
  }
];

const strategyStats = {
  totalStrategies: strategies.length,
  activeStrategies: strategies.filter(s => s.status === 'active').length,
  totalCapital: strategies.reduce((sum, s) => sum + s.capital, 0),
  avgPerformance: strategies.reduce((sum, s) => sum + s.performance, 0) / strategies.length,
  totalTrades: strategies.reduce((sum, s) => sum + s.trades, 0),
  avgWinRate: strategies.reduce((sum, s) => sum + s.winRate, 0) / strategies.length,
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-status-online" />;
    case 'paused': return <Pause className="h-4 w-4 text-status-warning" />;
    case 'testing': return <Activity className="h-4 w-4 text-status-warning" />;
    default: return <AlertTriangle className="h-4 w-4 text-status-error" />;
  }
}

function getRiskColor(risk: string) {
  switch (risk) {
    case 'low': return 'text-status-online';
    case 'medium': return 'text-status-warning';
    case 'high': return 'text-status-error';
    default: return 'text-muted-foreground';
  }
}

export default function StrategiesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Strategies</h1>
          <p className="text-muted-foreground">
            Manage and monitor your algorithmic trading strategies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Strategy Settings
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Deploy New Strategy
          </Button>
        </div>
      </div>

      {/* Strategy Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Strategies</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategyStats.totalStrategies}</div>
            <p className="text-xs text-muted-foreground">
              {strategyStats.activeStrategies} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(strategyStats.totalCapital)}</div>
            <p className="text-xs text-trading-profit">
              +{formatPercentage(strategyStats.avgPerformance / 100)} avg performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategyStats.totalTrades}</div>
            <p className="text-xs text-muted-foreground">
              Across all strategies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{strategyStats.avgWinRate.toFixed(1)}%</div>
            <p className="text-xs text-trading-profit">
              Excellent performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Strategies Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {strategies.map((strategy) => (
          <Card key={strategy.id} className="trading-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(strategy.status)}
                  <CardTitle className="text-lg">{strategy.name}</CardTitle>
                </div>
                <div className="flex space-x-1">
                  {strategy.status === 'active' ? (
                    <Button variant="ghost" size="icon">
                      <Pause className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="text-sm">
                {strategy.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Performance</div>
                    <div className={`text-lg font-bold ${
                      strategy.performance > 0 ? 'text-trading-profit' : 'text-trading-loss'
                    }`}>
                      {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Win Rate</div>
                    <div className="text-lg font-bold">{strategy.winRate}%</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Capital</div>
                    <div className="text-lg font-bold">{formatPrice(strategy.capital)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Trades</div>
                    <div className="text-lg font-bold">{strategy.trades}</div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sharpe Ratio:</span>
                    <span className="ml-1 font-medium">{strategy.sharpeRatio}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max DD:</span>
                    <span className="ml-1 font-medium text-trading-loss">{strategy.maxDrawdown}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Risk Level:</span>
                    <span className={`ml-1 font-medium capitalize ${getRiskColor(strategy.riskLevel)}`}>
                      {strategy.riskLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timeframe:</span>
                    <span className="ml-1 font-medium">{strategy.timeframe}</span>
                  </div>
                </div>

                {/* Last Signal */}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    Last signal: {strategy.lastSignal}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                    strategy.status === 'active' ? 'bg-status-online/20 text-status-online' :
                    strategy.status === 'paused' ? 'bg-status-warning/20 text-status-warning' :
                    'bg-status-error/20 text-status-error'
                  }`}>
                    {strategy.status}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 