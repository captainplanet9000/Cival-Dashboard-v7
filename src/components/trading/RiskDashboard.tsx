/**
 * Risk Monitoring and Alerts Dashboard
 * Comprehensive risk management with real-time monitoring and AG-UI integration
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  TrendingDown, 
  Target, 
  Activity,
  Zap,
  Settings,
  RefreshCw,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Gauge
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// AG-UI Protocol integration
import { subscribe, emit, type TradingEvents } from '@/lib/ag-ui-protocol-v2'

// Risk Types
interface RiskMetrics {
  portfolioRisk: number
  valueAtRisk: {
    var95: number
    var99: number
    timeHorizon: string
  }
  maxDrawdown: {
    current: number
    historical: number
    peak: number
    trough: number
  }
  sharpeRatio: number
  sortinoRatio: number
  beta: number
  alpha: number
  correlations: { [symbol: string]: number }
  concentrationRisk: number
  liquidityRisk: number
  leverageRatio: number
  marginUtilization: number
  lastUpdate: number
}

interface RiskAlert {
  id: string
  type: 'position_size' | 'concentration' | 'drawdown' | 'var_breach' | 'correlation' | 'liquidity' | 'margin_call'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: string
  symbol?: string
  value: number
  threshold: number
  timestamp: number
  acknowledged: boolean
  resolved: boolean
}

interface PositionRisk {
  symbol: string
  exposure: number
  var95: number
  beta: number
  correlation: number
  liquidityScore: number
  concentrationPercent: number
  riskScore: number
  recommendedSize: number
  currentSize: number
}

interface RiskSettings {
  maxPortfolioVar: number
  maxPositionSize: number
  maxConcentration: number
  maxDrawdown: number
  minLiquidity: number
  maxCorrelation: number
  alertsEnabled: boolean
  autoStopLoss: boolean
  emergencyStopEnabled: boolean
  riskToleranceLevel: 'conservative' | 'moderate' | 'aggressive'
}

interface StressTestScenario {
  id: string
  name: string
  description: string
  shocks: { [symbol: string]: number }
  portfolioImpact: number
  varImpact: number
  maxDrawdownImpact: number
  liquidityImpact: number
  timestamp: number
}

const SEVERITY_COLORS = {
  low: 'border-green-200 bg-green-50 text-green-800',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  high: 'border-orange-200 bg-orange-50 text-orange-800',
  critical: 'border-red-200 bg-red-50 text-red-800'
}

const RISK_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#7c3aed']

export function RiskDashboard() {
  // State Management
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [positionRisks, setPositionRisks] = useState<PositionRisk[]>([])
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    maxPortfolioVar: 5.0,
    maxPositionSize: 10.0,
    maxConcentration: 25.0,
    maxDrawdown: 15.0,
    minLiquidity: 3.0,
    maxCorrelation: 0.8,
    alertsEnabled: true,
    autoStopLoss: true,
    emergencyStopEnabled: true,
    riskToleranceLevel: 'moderate'
  })
  const [stressTests, setStressTests] = useState<StressTestScenario[]>([])
  const [riskHistory, setRiskHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false)

  // AG-UI Event Subscriptions
  useEffect(() => {
    // Subscribe to risk alerts
    const riskAlertSub = subscribe('portfolio.risk_alert', (event) => {
      const alert = event.data as RiskAlert
      setAlerts(prev => [alert, ...prev])
      
      // Emit system notification for critical alerts
      if (alert.severity === 'critical') {
        emit('system.notification', {
          type: 'critical',
          message: alert.message,
          level: 'error',
          timestamp: Date.now()
        })
      }
    })

    // Subscribe to portfolio value updates for risk recalculation
    const portfolioSub = subscribe('portfolio.value_updated', (event) => {
      setLastUpdate(new Date())
      // Trigger risk metrics refresh
      fetchRiskMetrics()
    })

    // Subscribe to position updates
    const positionSub = subscribe('trade.position_update', (event) => {
      // Update position risks when positions change
      fetchPositionRisks()
    })

    // Subscribe to margin warnings
    const marginSub = subscribe('portfolio.margin_warning', (event) => {
      const { utilization, threshold } = event.data
      const marginAlert: RiskAlert = {
        id: `margin-${Date.now()}`,
        type: 'margin_call',
        severity: utilization > 0.9 ? 'critical' : 'high',
        message: `High margin utilization: ${(utilization * 100).toFixed(1)}%`,
        details: `Margin utilization exceeded ${(threshold * 100).toFixed(1)}% threshold`,
        value: utilization,
        threshold: threshold,
        timestamp: Date.now(),
        acknowledged: false,
        resolved: false
      }
      setAlerts(prev => [marginAlert, ...prev])
    })

    return () => {
      riskAlertSub.unsubscribe()
      portfolioSub.unsubscribe()
      positionSub.unsubscribe()
      marginSub.unsubscribe()
    }
  }, [])

  // Data Fetching
  const fetchRiskData = useCallback(async () => {
    try {
      setIsLoading(true)
      await Promise.all([
        fetchRiskMetrics(),
        fetchRiskAlerts(),
        fetchPositionRisks(),
        fetchStressTests(),
        fetchRiskHistory()
      ])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch risk data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchRiskMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/risk/metrics')
      if (response.ok) {
        const data = await response.json()
        setRiskMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch risk metrics:', error)
    }
  }, [])

  const fetchRiskAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/risk/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to fetch risk alerts:', error)
    }
  }, [])

  const fetchPositionRisks = useCallback(async () => {
    try {
      const response = await fetch('/api/risk/positions')
      if (response.ok) {
        const data = await response.json()
        setPositionRisks(data.positions || [])
      }
    } catch (error) {
      console.error('Failed to fetch position risks:', error)
    }
  }, [])

  const fetchStressTests = useCallback(async () => {
    try {
      const response = await fetch('/api/risk/stress-tests')
      if (response.ok) {
        const data = await response.json()
        setStressTests(data.scenarios || [])
      }
    } catch (error) {
      console.error('Failed to fetch stress tests:', error)
    }
  }, [])

  const fetchRiskHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/risk/history?period=24h')
      if (response.ok) {
        const data = await response.json()
        setRiskHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch risk history:', error)
    }
  }, [])

  // Auto refresh effect
  useEffect(() => {
    fetchRiskData()
    const interval = setInterval(fetchRiskData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchRiskData])

  // Risk Management Actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/risk/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      })
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/risk/alerts/${alertId}/resolve`, {
        method: 'POST'
      })
      if (response.ok) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        ))
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/trading/emergency-stop', {
        method: 'POST'
      })
      if (response.ok) {
        emit('system.notification', {
          type: 'emergency',
          message: 'Emergency stop activated - all trading halted',
          level: 'error',
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Failed to execute emergency stop:', error)
    }
  }

  const handleRunStressTest = async (scenario: StressTestScenario) => {
    try {
      const response = await fetch('/api/risk/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      })
      if (response.ok) {
        const result = await response.json()
        await fetchStressTests()
      }
    } catch (error) {
      console.error('Failed to run stress test:', error)
    }
  }

  const handleUpdateSettings = async (newSettings: Partial<RiskSettings>) => {
    try {
      const updatedSettings = { ...riskSettings, ...newSettings }
      const response = await fetch('/api/risk/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      })
      if (response.ok) {
        setRiskSettings(updatedSettings)
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
    }
  }

  // Helper Functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getRiskLevel = (value: number, thresholds: number[]) => {
    if (value <= thresholds[0]) return 'low'
    if (value <= thresholds[1]) return 'medium'
    if (value <= thresholds[2]) return 'high'
    return 'critical'
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'high': case 'critical': return <AlertTriangle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const filteredAlerts = showResolvedAlerts ? alerts : alerts.filter(alert => !alert.resolved)
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' && !alert.resolved)

  // Risk level calculations
  const portfolioRiskLevel = riskMetrics ? getRiskLevel(riskMetrics.portfolioRisk, [2, 5, 8]) : 'low'
  const varLevel = riskMetrics ? getRiskLevel(Math.abs(riskMetrics.valueAtRisk.var95), [2, 5, 10]) : 'low'
  const drawdownLevel = riskMetrics ? getRiskLevel(Math.abs(riskMetrics.maxDrawdown.current), [5, 10, 20]) : 'low'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Risk Management Dashboard</h2>
          <p className="text-muted-foreground">Real-time risk monitoring and portfolio protection</p>
        </div>
        <div className="flex items-center space-x-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmergencyStop}
            className="text-red-600 hover:text-red-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Emergency Stop
          </Button>
          <Button variant="outline" size="sm" onClick={fetchRiskData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Risk</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(portfolioRiskLevel)}`}>
              {riskMetrics ? `${riskMetrics.portfolioRisk.toFixed(1)}%` : '0.0%'}
            </div>
            <Progress 
              value={riskMetrics?.portfolioRisk || 0} 
              className="mt-2" 
              max={10}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {portfolioRiskLevel.toUpperCase()} risk level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value at Risk (95%)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(varLevel)}`}>
              {riskMetrics ? formatCurrency(riskMetrics.valueAtRisk.var95) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {riskMetrics?.valueAtRisk.timeHorizon || '1 day'} horizon
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getRiskColor(drawdownLevel)}`}>
              {riskMetrics ? `${riskMetrics.maxDrawdown.current.toFixed(1)}%` : '0.0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Historical: {riskMetrics ? `${riskMetrics.maxDrawdown.historical.toFixed(1)}%` : '0.0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAlerts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts.length} critical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="positions">Position Risk</TabsTrigger>
          <TabsTrigger value="stress">Stress Tests</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Risk Metrics Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics History</CardTitle>
                <CardDescription>24-hour risk evolution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={riskHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value, name) => [
                          name === 'var95' ? formatCurrency(value as number) : `${(value as number).toFixed(2)}%`,
                          String(name).toUpperCase()
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="portfolioRisk"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Portfolio Risk"
                      />
                      <Line
                        type="monotone"
                        dataKey="var95"
                        stroke="#ff7300"
                        strokeWidth={2}
                        name="VaR 95%"
                      />
                      <ReferenceLine y={riskSettings.maxPortfolioVar} stroke="#ef4444" strokeDasharray="3 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Breakdown</CardTitle>
                <CardDescription>Portfolio risk composition</CardDescription>
              </CardHeader>
              <CardContent>
                {riskMetrics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Concentration Risk:</span>
                      <span className="font-bold">{riskMetrics.concentrationRisk.toFixed(1)}%</span>
                    </div>
                    <Progress value={riskMetrics.concentrationRisk} max={50} />
                    
                    <div className="flex justify-between items-center">
                      <span>Liquidity Risk:</span>
                      <span className="font-bold">{riskMetrics.liquidityRisk.toFixed(1)}%</span>
                    </div>
                    <Progress value={riskMetrics.liquidityRisk} max={20} />
                    
                    <div className="flex justify-between items-center">
                      <span>Leverage Ratio:</span>
                      <span className="font-bold">{riskMetrics.leverageRatio.toFixed(2)}x</span>
                    </div>
                    <Progress value={riskMetrics.leverageRatio * 10} max={50} />
                    
                    <div className="flex justify-between items-center">
                      <span>Margin Utilization:</span>
                      <span className="font-bold">{(riskMetrics.marginUtilization * 100).toFixed(1)}%</span>
                    </div>
                    <Progress value={riskMetrics.marginUtilization * 100} max={100} />
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                        <div className="text-lg font-bold">{riskMetrics.sharpeRatio.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Beta</div>
                        <div className="text-lg font-bold">{riskMetrics.beta.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading risk metrics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Risk Alerts</CardTitle>
                  <CardDescription>Real-time risk monitoring alerts</CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResolvedAlerts(!showResolvedAlerts)}
                  >
                    {showResolvedAlerts ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                    {showResolvedAlerts ? 'Hide' : 'Show'} Resolved
                  </Button>
                  <Switch
                    checked={riskSettings.alertsEnabled}
                    onCheckedChange={(enabled) => handleUpdateSettings({ alertsEnabled: enabled })}
                  />
                  <Label>Alerts Enabled</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredAlerts.map((alert) => (
                  <Alert key={alert.id} className={SEVERITY_COLORS[alert.severity]}>
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-start space-x-2">
                        {getAlertIcon(alert.severity)}
                        <div className="flex-1">
                          <AlertTitle className="flex items-center space-x-2">
                            <span>{alert.message}</span>
                            <Badge variant="outline">{alert.type.replace('_', ' ')}</Badge>
                            {alert.symbol && <Badge variant="secondary">{alert.symbol}</Badge>}
                          </AlertTitle>
                          <AlertDescription className="mt-1">
                            {alert.details}
                            <div className="text-xs mt-1">
                              Value: {alert.value.toFixed(2)} • Threshold: {alert.threshold.toFixed(2)} • 
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </AlertDescription>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-4">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                        )}
                        {!alert.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                          >
                            ✓
                          </Button>
                        )}
                      </div>
                    </div>
                  </Alert>
                ))}
                {filteredAlerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active risk alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Risk Analysis</CardTitle>
              <CardDescription>Individual position risk assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {positionRisks.map((position) => (
                  <div key={position.symbol} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-lg">{position.symbol}</span>
                          <Badge variant={position.riskScore > 7 ? 'destructive' : position.riskScore > 4 ? 'secondary' : 'default'}>
                            Risk: {position.riskScore.toFixed(1)}/10
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Exposure</div>
                            <div className="font-medium">{formatCurrency(position.exposure)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">VaR 95%</div>
                            <div className="font-medium">{formatCurrency(position.var95)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Beta</div>
                            <div className="font-medium">{position.beta.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Liquidity</div>
                            <div className="font-medium">{position.liquidityScore.toFixed(1)}/10</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">Concentration: {position.concentrationPercent.toFixed(1)}%</span>
                          <Progress value={position.concentrationPercent} className="w-32" />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Recommended Size</div>
                        <div className="font-bold">{formatCurrency(position.recommendedSize)}</div>
                        <div className="text-xs text-muted-foreground">
                          Current: {formatCurrency(position.currentSize)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {positionRisks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No position risk data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stress Testing</CardTitle>
              <CardDescription>Portfolio stress test scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => handleRunStressTest({
                      id: 'market_crash',
                      name: 'Market Crash',
                      description: '20% market decline scenario',
                      shocks: { 'BTC': -0.2, 'ETH': -0.25, 'ADA': -0.3 },
                      portfolioImpact: 0,
                      varImpact: 0,
                      maxDrawdownImpact: 0,
                      liquidityImpact: 0,
                      timestamp: Date.now()
                    })}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <div className="font-medium">Market Crash</div>
                    <div className="text-xs text-muted-foreground">20% decline scenario</div>
                  </Button>
                  
                  <Button
                    onClick={() => handleRunStressTest({
                      id: 'liquidity_crisis',
                      name: 'Liquidity Crisis',
                      description: 'Severe liquidity constraints',
                      shocks: {},
                      portfolioImpact: 0,
                      varImpact: 0,
                      maxDrawdownImpact: 0,
                      liquidityImpact: 0,
                      timestamp: Date.now()
                    })}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <div className="font-medium">Liquidity Crisis</div>
                    <div className="text-xs text-muted-foreground">Severe liquidity constraints</div>
                  </Button>
                  
                  <Button
                    onClick={() => handleRunStressTest({
                      id: 'flash_crash',
                      name: 'Flash Crash',
                      description: 'Sudden 10% drop in 1 hour',
                      shocks: { 'BTC': -0.1, 'ETH': -0.12 },
                      portfolioImpact: 0,
                      varImpact: 0,
                      maxDrawdownImpact: 0,
                      liquidityImpact: 0,
                      timestamp: Date.now()
                    })}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start"
                  >
                    <div className="font-medium">Flash Crash</div>
                    <div className="text-xs text-muted-foreground">Sudden 10% drop</div>
                  </Button>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Recent Stress Test Results</h4>
                  {stressTests.map((test) => (
                    <div key={test.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-muted-foreground">{test.description}</div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                            <div>
                              <div className="text-muted-foreground">Portfolio Impact</div>
                              <div className="font-medium">{formatPercentage(test.portfolioImpact)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">VaR Impact</div>
                              <div className="font-medium">{formatPercentage(test.varImpact)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Max Drawdown</div>
                              <div className="font-medium">{formatPercentage(test.maxDrawdownImpact)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Liquidity Impact</div>
                              <div className="font-medium">{test.liquidityImpact.toFixed(1)}/10</div>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(test.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Management Settings</CardTitle>
              <CardDescription>Configure risk parameters and thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Max Portfolio VaR (%)</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Slider
                        value={[riskSettings.maxPortfolioVar]}
                        onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxPortfolioVar: value[0] }))}
                        max={20}
                        step={0.1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={riskSettings.maxPortfolioVar}
                        onChange={(e) => setRiskSettings(prev => ({ ...prev, maxPortfolioVar: parseFloat(e.target.value) }))}
                        className="w-20"
                        step="0.1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Max Position Size (%)</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Slider
                        value={[riskSettings.maxPositionSize]}
                        onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxPositionSize: value[0] }))}
                        max={50}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={riskSettings.maxPositionSize}
                        onChange={(e) => setRiskSettings(prev => ({ ...prev, maxPositionSize: parseFloat(e.target.value) }))}
                        className="w-20"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Max Drawdown (%)</Label>
                    <div className="flex items-center space-x-4 mt-2">
                      <Slider
                        value={[riskSettings.maxDrawdown]}
                        onValueChange={(value) => setRiskSettings(prev => ({ ...prev, maxDrawdown: value[0] }))}
                        max={50}
                        step={1}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={riskSettings.maxDrawdown}
                        onChange={(e) => setRiskSettings(prev => ({ ...prev, maxDrawdown: parseFloat(e.target.value) }))}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Real-time Alerts</Label>
                    <Switch
                      checked={riskSettings.alertsEnabled}
                      onCheckedChange={(enabled) => setRiskSettings(prev => ({ ...prev, alertsEnabled: enabled }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Auto Stop Loss</Label>
                    <Switch
                      checked={riskSettings.autoStopLoss}
                      onCheckedChange={(enabled) => setRiskSettings(prev => ({ ...prev, autoStopLoss: enabled }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Emergency Stop</Label>
                    <Switch
                      checked={riskSettings.emergencyStopEnabled}
                      onCheckedChange={(enabled) => setRiskSettings(prev => ({ ...prev, emergencyStopEnabled: enabled }))}
                    />
                  </div>

                  <div>
                    <Label>Risk Tolerance</Label>
                    <div className="mt-2">
                      <select
                        value={riskSettings.riskToleranceLevel}
                        onChange={(e) => setRiskSettings(prev => ({ ...prev, riskToleranceLevel: e.target.value as any }))}
                        className="w-full p-2 border rounded"
                      >
                        <option value="conservative">Conservative</option>
                        <option value="moderate">Moderate</option>
                        <option value="aggressive">Aggressive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => handleUpdateSettings(riskSettings)}
                  className="px-6"
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RiskDashboard