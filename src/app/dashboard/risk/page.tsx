import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  Settings,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Gauge
} from "lucide-react";
import { formatPrice, formatPercentage } from "@/lib/utils";

// Risk metrics data
const riskMetrics = {
  portfolioVar: 15420.50,        // Value at Risk (95% confidence)
  portfolioVarPercent: 1.23,     // VaR as % of portfolio
  expectedShortfall: 18650.75,   // Expected Shortfall / CVaR
  sharpeRatio: 1.85,
  sortinoRatio: 2.12,
  maxDrawdown: 8.45,
  currentDrawdown: 2.31,
  volatility: 14.2,
  beta: 1.15,
  riskBudgetUsed: 67.5,          // % of risk budget used
  riskBudgetTotal: 100
};

// Position-level risk data
const positionRisks = [
  {
    symbol: "AAPL",
    strategy: "Darvas Box Breakout",
    exposure: 27750.00,
    exposurePercent: 22.05,
    var95: 1890.25,
    beta: 1.25,
    volatility: 16.8,
    riskRating: "Medium",
    riskScore: 65,
    stopLoss: 182.50,
    currentPrice: 187.89,
    unrealizedPnL: 370.50,
    riskStatus: "normal"
  },
  {
    symbol: "TSLA",
    strategy: "Elliott Wave Detection", 
    exposure: 12560.00,
    exposurePercent: 9.98,
    var95: 2045.80,
    beta: 2.15,
    volatility: 28.4,
    riskRating: "High",
    riskScore: 85,
    stopLoss: 240.00,
    currentPrice: 251.23,
    unrealizedPnL: 278.00,
    riskStatus: "warning"
  },
  {
    symbol: "NVDA",
    strategy: "Volume Profile Analysis",
    exposure: 12048.00,
    exposurePercent: 9.58,
    var95: 1654.20,
    beta: 1.85,
    volatility: 22.1,
    riskRating: "High",
    riskScore: 78,
    stopLoss: 488.00,
    currentPrice: 478.92,
    unrealizedPnL: 80.75,
    riskStatus: "alert"
  },
  {
    symbol: "MSFT",
    strategy: "MACD Histogram Divergence",
    exposure: 34289.00,
    exposurePercent: 27.24,
    var95: 1425.15,
    beta: 0.95,
    volatility: 12.6,
    riskRating: "Low",
    riskScore: 35,
    stopLoss: 335.00,
    currentPrice: 339.12,
    unrealizedPnL: -377.00,
    riskStatus: "normal"
  }
];

// Risk limits and controls
const riskLimits = [
  {
    id: 1,
    name: "Daily Loss Limit",
    type: "Portfolio",
    limit: 5000,
    current: 1247.83,
    usage: 25,
    status: "ok",
    action: "Stop trading if exceeded"
  },
  {
    id: 2,
    name: "Position Size Limit",
    type: "Individual",
    limit: 30,
    current: 27.24,
    usage: 91,
    status: "warning",
    action: "Reduce MSFT position"
  },
  {
    id: 3,
    name: "Sector Concentration",
    type: "Diversification",
    limit: 40,
    current: 32.1,
    usage: 80,
    status: "ok",
    action: "Monitor tech exposure"
  },
  {
    id: 4,
    name: "Maximum Drawdown",
    type: "Portfolio",
    limit: 10,
    current: 2.31,
    usage: 23,
    status: "ok",
    action: "Within acceptable range"
  },
  {
    id: 5,
    name: "VaR Utilization",
    type: "Portfolio",
    limit: 2.0,
    current: 1.23,
    usage: 62,
    status: "ok",
    action: "Risk budget available"
  }
];

// Recent risk alerts
const riskAlerts = [
  {
    id: 1,
    timestamp: "10:45 AM",
    severity: "warning",
    title: "Position Size Alert",
    message: "MSFT position approaching 30% limit (27.24%)",
    strategy: "MACD Histogram Divergence",
    action: "Consider reducing position size",
    acknowledged: false
  },
  {
    id: 2,
    timestamp: "09:30 AM", 
    severity: "info",
    title: "Volatility Increase",
    message: "TSLA volatility increased to 28.4% (3% above normal)",
    strategy: "Elliott Wave Detection",
    action: "Monitor closely",
    acknowledged: true
  },
  {
    id: 3,
    timestamp: "09:15 AM",
    severity: "alert",
    title: "Stop Loss Proximity",
    message: "NVDA within 2% of stop loss level",
    strategy: "Volume Profile Analysis", 
    action: "Review exit strategy",
    acknowledged: false
  }
];

function getRiskColor(score: number) {
  if (score >= 80) return 'text-status-error';
  if (score >= 60) return 'text-status-warning';
  return 'text-status-online';
}

function getRiskStatusColor(status: string) {
  switch (status) {
    case 'normal': return 'text-status-online';
    case 'warning': return 'text-status-warning';
    case 'alert': return 'text-status-error';
    default: return 'text-muted-foreground';
  }
}

function getLimitStatusColor(status: string) {
  switch (status) {
    case 'ok': return 'text-status-online';
    case 'warning': return 'text-status-warning';
    case 'exceeded': return 'text-status-error';
    default: return 'text-muted-foreground';
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'alert': return <AlertTriangle className="h-4 w-4 text-status-error" />;
    case 'warning': return <AlertCircle className="h-4 w-4 text-status-warning" />;
    case 'info': return <Eye className="h-4 w-4 text-blue-500" />;
    default: return <CheckCircle2 className="h-4 w-4 text-status-online" />;
  }
}

export default function RiskPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground">
            Monitor portfolio risk, exposure limits, and risk controls in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Risk Settings
          </Button>
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Risk Report
          </Button>
          <Button>
            <Shield className="mr-2 h-4 w-4" />
            Emergency Stop
          </Button>
        </div>
      </div>

      {/* Risk Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio VaR (95%)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-warning">
              {formatPrice(riskMetrics.portfolioVar)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(riskMetrics.portfolioVarPercent / 100)} of portfolio value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-trading-profit">
              {riskMetrics.sharpeRatio}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-trading-loss">
              {formatPercentage(riskMetrics.maxDrawdown / 100)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current: {formatPercentage(riskMetrics.currentDrawdown / 100)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Budget Used</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(riskMetrics.riskBudgetUsed / 100)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available capacity remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Position Risk Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Position Risk Analysis</CardTitle>
            <CardDescription>
              Risk metrics for individual positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positionRisks.map((position) => (
                <div key={position.symbol} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold">{position.symbol}</span>
                      <span className={`text-xs px-2 py-1 rounded ${getRiskColor(position.riskScore)}`}>
                        {position.riskRating}
                      </span>
                      <span className={`h-2 w-2 rounded-full ${getRiskStatusColor(position.riskStatus)}`}></span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {position.strategy}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Exposure: {formatPrice(position.exposure)} ({formatPercentage(position.exposurePercent / 100)})
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">VaR: {formatPrice(position.var95)}</div>
                    <div className="text-sm text-muted-foreground">
                      β: {position.beta} • σ: {position.volatility}%
                    </div>
                    <div className="text-xs">
                      Score: <span className={getRiskColor(position.riskScore)}>{position.riskScore}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Limits & Controls</CardTitle>
            <CardDescription>
              Current usage vs. defined risk limits
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskLimits.map((limit) => (
                <div key={limit.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{limit.name}</span>
                      <span className={`h-2 w-2 rounded-full ${getLimitStatusColor(limit.status)}`}></span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {limit.type === 'Portfolio' && limit.name.includes('Loss') ? formatPrice(limit.current) : 
                         limit.name.includes('Ratio') ? limit.current :
                         `${limit.current}%`} / {limit.type === 'Portfolio' && limit.name.includes('Loss') ? formatPrice(limit.limit) : 
                         limit.name.includes('Ratio') ? limit.limit :
                         `${limit.limit}%`}
                      </div>
                      <div className={`text-xs ${getLimitStatusColor(limit.status)}`}>
                        {limit.usage}% used
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        limit.usage >= 90 ? 'bg-status-error' : 
                        limit.usage >= 70 ? 'bg-status-warning' : 'bg-status-online'
                      }`}
                      style={{ width: `${Math.min(limit.usage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {limit.action}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Alerts & Notifications</CardTitle>
          <CardDescription>
            Recent risk events and alerts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {riskAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
                alert.severity === 'alert' ? 'border-l-status-error bg-red-50' :
                alert.severity === 'warning' ? 'border-l-status-warning bg-yellow-50' :
                'border-l-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                        {alert.acknowledged && (
                          <CheckCircle2 className="h-4 w-4 text-status-online" />
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{alert.message}</p>
                      <div className="text-xs text-muted-foreground">
                        Strategy: {alert.strategy}
                      </div>
                      <div className="text-xs font-medium text-blue-600">
                        Recommended: {alert.action}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!alert.acknowledged && (
                      <Button size="sm" variant="outline">
                        Acknowledge
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Risk Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Beta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskMetrics.beta}</div>
            <p className="text-sm text-muted-foreground">
              Market sensitivity (vs S&P 500)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Volatility</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{riskMetrics.volatility}%</div>
            <p className="text-sm text-muted-foreground">
              Annualized standard deviation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sortino Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-trading-profit">{riskMetrics.sortinoRatio}</div>
            <p className="text-sm text-muted-foreground">
              Downside risk-adjusted returns
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 