/**
 * Main Trading Dashboard Component
 * Integrates with AG-UI Protocol v2 and comprehensive trading engine
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Zap, Brain, Shield } from 'lucide-react'

// AG-UI Protocol v2 Integration
import { getAGUIEventBus, subscribe, emit, type TradingEvents, type AgentEvents, type WalletEvents } from '@/lib/ag-ui-protocol-v2'

// Trading Engine Types
interface TradingEngineStatus {
  isRunning: boolean
  autoTradeEnabled: boolean
  simulationMode: boolean
  activeStrategies: number
  totalSignals: number
  pendingOrders: number
  connectedExchanges: number
  totalPortfolioValue: number
  dailyPnL: number
  riskScore: number
  lastUpdate: number
}

interface TradingSignal {
  id: string
  strategy: string
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  strength: number
  price: number
  timestamp: number
  confidence: number
  reasoning: string
  metadata: any
}

interface PortfolioSummary {
  totalValue: number
  totalGain: number
  totalGainPercentage: number
  dailyPnl: number
  positions: Position[]
  performance: any
}

interface Position {
  symbol: string
  size: number
  marketValue: number
  unrealizedPnl: number
  exchange: string
  averagePrice: number
  currentPrice: number
}

interface AgentStatus {
  id: string
  name: string
  status: 'active' | 'inactive' | 'error'
  performance: {
    winRate: number
    totalTrades: number
    totalReturn: number
  }
  lastDecision?: string
  confidence?: number
}

interface RiskMetrics {
  portfolioRisk: number
  positionRisks: { [symbol: string]: number }
  alerts: RiskAlert[]
  valueAtRisk: number
  maxDrawdown: number
}

interface RiskAlert {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
}

export function TradingDashboard() {
  // State Management
  const [engineStatus, setEngineStatus] = useState<TradingEngineStatus | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null)
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>([])
  const [agents, setAgents] = useState<AgentStatus[]>([])
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // AG-UI Event Bus Integration
  useEffect(() => {
    const eventBus = getAGUIEventBus()

    // Subscribe to trading events
    const tradingSignalSub = subscribe('trade.signal_generated', (event) => {
      const signal = event.data as TradingSignal
      setActiveSignals(prev => [signal, ...prev.slice(0, 9)]) // Keep last 10 signals
    })

    const orderSub = subscribe('trade.order_placed', (event) => {
      console.log('Order placed:', event.data)
      // Update UI to reflect new order
    })

    const portfolioSub = subscribe('portfolio.value_updated', (event) => {
      setLastUpdate(new Date())
      // Portfolio updates handled by periodic fetch
    })

    // Subscribe to agent events
    const agentDecisionSub = subscribe('agent.decision_made', (event) => {
      const { agent_id, decision } = event.data
      setAgents(prev => prev.map(agent => 
        agent.id === agent_id 
          ? { ...agent, lastDecision: decision }
          : agent
      ))
    })

    // Subscribe to risk alerts
    const riskAlertSub = subscribe('portfolio.risk_alert', (event) => {
      const alertData = event.data
      const riskAlert = {
        id: `alert-${Date.now()}`,
        type: 'portfolio' as const,
        severity: 'high' as const,
        message: alertData.message,
        timestamp: Date.now(),
        value: alertData.value
      }
      setRiskMetrics(prev => prev ? {
        ...prev,
        alerts: [riskAlert, ...prev.alerts.slice(0, 4)] // Keep last 5 alerts
      } : null)
    })

    // Subscribe to system events
    const connectionSub = subscribe('connection.established', () => {
      setConnectionStatus('connected')
    })

    const disconnectionSub = subscribe('connection.lost', () => {
      setConnectionStatus('disconnected')
    })

    // Initialize AG-UI connection
    eventBus.initialize().then(() => {
      setConnectionStatus('connected')
    }).catch((error) => {
      console.error('Failed to initialize AG-UI:', error)
      setConnectionStatus('disconnected')
    })

    // Cleanup subscriptions
    return () => {
      tradingSignalSub.unsubscribe()
      orderSub.unsubscribe()
      portfolioSub.unsubscribe()
      agentDecisionSub.unsubscribe()
      riskAlertSub.unsubscribe()
      connectionSub.unsubscribe()
      disconnectionSub.unsubscribe()
    }
  }, [])

  // Data Fetching
  const fetchData = useCallback(async () => {
    try {
      // Fetch trading engine status
      const statusResponse = await fetch('/api/trading/status')
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        setEngineStatus(status)
      }

      // Fetch portfolio summary
      const portfolioResponse = await fetch('/api/portfolio/summary')
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setPortfolio(portfolioData)
      }

      // Fetch agent status
      const agentsResponse = await fetch('/api/agents/status')
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData.agents || [])
      }

      // Fetch risk metrics
      const riskResponse = await fetch('/api/risk/metrics')
      if (riskResponse.ok) {
        const riskData = await riskResponse.json()
        setRiskMetrics(riskData)
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch trading data:', error)
    }
  }, [])

  // Initial data fetch and periodic updates
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  // Trading Actions
  const handleStartTrading = async () => {
    try {
      const response = await fetch('/api/trading/start', { method: 'POST' })
      if (response.ok) {
        emit('system.notification', {
          type: 'success',
          message: 'Trading engine started',
          level: 'info',
          timestamp: Date.now()
        })
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to start trading:', error)
    }
  }

  const handleStopTrading = async () => {
    try {
      const response = await fetch('/api/trading/stop', { method: 'POST' })
      if (response.ok) {
        emit('system.notification', {
          type: 'success',
          message: 'Trading engine stopped',
          level: 'info',
          timestamp: Date.now()
        })
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to stop trading:', error)
    }
  }

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/trading/emergency-stop', { method: 'POST' })
      if (response.ok) {
        emit('system.notification', {
          type: 'emergency',
          message: 'Emergency stop activated',
          level: 'error',
          timestamp: Date.now()
        })
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to execute emergency stop:', error)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'connected': case 'running': return 'text-green-500'
      case 'inactive': case 'disconnected': case 'stopped': return 'text-red-500'
      case 'error': case 'critical': return 'text-red-600'
      default: return 'text-yellow-500'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-green-200 bg-green-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'high': return 'border-orange-200 bg-orange-50'
      case 'critical': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trading Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered autonomous trading with real-time monitoring
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>{connectionStatus}</span>
          </Badge>
          <span className="text-sm text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolio ? formatCurrency(portfolio.totalValue) : '$0.00'}
            </div>
            <p className={`text-xs ${portfolio && portfolio.totalGainPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolio ? formatPercentage(portfolio.totalGainPercentage) : '+0.00%'} from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolio && portfolio.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolio ? formatCurrency(portfolio.dailyPnl) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {engineStatus ? `${engineStatus.connectedExchanges} exchanges` : '0 exchanges'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {engineStatus?.activeStrategies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {engineStatus?.totalSignals || 0} signals pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {riskMetrics?.portfolioRisk?.toFixed(1) || '0.0'}
            </div>
            <Progress value={riskMetrics?.portfolioRisk || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Trading Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Trading Engine Control</span>
          </CardTitle>
          <CardDescription>
            Status: <span className={getStatusColor(engineStatus?.isRunning ? 'running' : 'stopped')}>
              {engineStatus?.isRunning ? 'Running' : 'Stopped'}
            </span>
            {engineStatus?.simulationMode && (
              <Badge variant="outline" className="ml-2">Simulation Mode</Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              onClick={handleStartTrading} 
              disabled={engineStatus?.isRunning}
              variant="default"
            >
              Start Trading
            </Button>
            <Button 
              onClick={handleStopTrading} 
              disabled={!engineStatus?.isRunning}
              variant="outline"
            >
              Stop Trading
            </Button>
            <Button 
              onClick={handleEmergencyStop} 
              variant="destructive"
              className="ml-auto"
            >
              Emergency Stop
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">Trading Signals</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Portfolio Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {portfolio ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total Value:</span>
                      <span className="font-bold">{formatCurrency(portfolio.totalValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Gain:</span>
                      <span className={portfolio.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(portfolio.totalGain)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Daily P&L:</span>
                      <span className={portfolio.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(portfolio.dailyPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Positions:</span>
                      <span>{portfolio.positions.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading portfolio data...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSignals.slice(0, 5).map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <div className="font-medium">
                          {signal.action.toUpperCase()} {signal.symbol}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {signal.strategy} • {formatCurrency(signal.price)}
                        </div>
                      </div>
                      <Badge variant={signal.action === 'buy' ? 'default' : 'destructive'}>
                        {signal.strength}%
                      </Badge>
                    </div>
                  ))}
                  {activeSignals.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No recent signals
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Trading Signals</CardTitle>
              <CardDescription>
                AI-generated trading signals from multiple strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeSignals.map((signal) => (
                  <div key={signal.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={signal.action === 'buy' ? 'default' : 'destructive'}>
                            {signal.action.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{signal.symbol}</span>
                          <span className="text-sm text-muted-foreground">
                            via {signal.strategy}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {signal.reasoning}
                        </div>
                        <div className="text-sm">
                          Price: {formatCurrency(signal.price)} • 
                          Confidence: {(signal.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{signal.strength}%</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {activeSignals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active signals
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{agent.name}</span>
                    <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                      {agent.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Win Rate:</span>
                      <span>{agent.performance.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Trades:</span>
                      <span>{agent.performance.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Return:</span>
                      <span className={agent.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(agent.performance.totalReturn)}
                      </span>
                    </div>
                    {agent.lastDecision && (
                      <div className="mt-3 p-2 bg-muted rounded">
                        <div className="text-sm font-medium">Last Decision:</div>
                        <div className="text-sm text-muted-foreground">{agent.lastDecision}</div>
                        {agent.confidence && (
                          <div className="text-xs">Confidence: {(agent.confidence * 100).toFixed(1)}%</div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {agents.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No agents active
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portfolio?.positions.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {position.exchange} • Size: {position.size.toFixed(6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(position.marketValue)}</div>
                      <div className={`text-sm ${position.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(position.unrealizedPnl)}
                      </div>
                    </div>
                  </div>
                )) || []}
                {(!portfolio?.positions || portfolio.positions.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No open positions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {riskMetrics ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Portfolio Risk:</span>
                      <span>{riskMetrics.portfolioRisk.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Value at Risk:</span>
                      <span>{formatCurrency(riskMetrics.valueAtRisk)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Drawdown:</span>
                      <span>{riskMetrics.maxDrawdown.toFixed(2)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading risk metrics...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {riskMetrics?.alerts.map((alert) => (
                    <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>{alert.type}</AlertTitle>
                      <AlertDescription>
                        {alert.message}
                        <div className="text-xs mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )) || []}
                  {(!riskMetrics?.alerts || riskMetrics.alerts.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground">
                      No active risk alerts
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TradingDashboard