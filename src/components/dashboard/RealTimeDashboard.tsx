/**
 * Real-Time Trading Dashboard
 * Comprehensive live trading dashboard with all integrated components
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Bot, 
  Shield, 
  Zap,
  AlertTriangle,
  Target,
  BarChart3,
  RefreshCw,
  Settings,
  Maximize2,
  Bell,
  Users,
  Play,
  Pause,
  Brain
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

// Import sub-components
import { TradingInterface } from '../trading/TradingInterface'
import { PortfolioMonitor } from '../trading/PortfolioMonitor'
import { AgentManager } from '../trading/AgentManager'
import { TradingCharts } from '../trading/TradingCharts'
import { RiskDashboard } from '../trading/RiskDashboard'

// AG-UI Protocol integration
import { subscribe, emit, getAGUIEventBus, type TradingEvents, type AgentEvents, type WalletEvents } from '@/lib/ag-ui-protocol-v2'
import { logger } from '@/lib/error-handling/logger'
import { db } from '@/lib/database/persistence'

// Real-time dashboard types
interface DashboardMetrics {
  portfolioValue: number
  dailyPnl: number
  dailyPnlPercent: number
  totalReturn: number
  totalReturnPercent: number
  positions: number
  orders: number
  agents: number
  activeAgents: number
  signals: number
  riskScore: number
  marketStatus: 'open' | 'closed' | 'pre-market' | 'after-hours'
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  lastUpdate: number
}

interface LiveAlert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  timestamp: number
  acknowledged: boolean
  component: string
}

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  action: () => void
  variant: 'default' | 'destructive' | 'outline' | 'secondary'
  disabled?: boolean
}

interface RealtimeData {
  timestamp: number
  portfolioValue: number
  dailyPnl: number
  riskScore: number
  activeSignals: number
}

export function RealTimeDashboard() {
  // State Management
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    portfolioValue: 0,
    dailyPnl: 0,
    dailyPnlPercent: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    positions: 0,
    orders: 0,
    agents: 0,
    activeAgents: 0,
    signals: 0,
    riskScore: 0,
    marketStatus: 'closed',
    connectionStatus: 'connecting',
    lastUpdate: Date.now()
  })

  const [alerts, setAlerts] = useState<LiveAlert[]>([])
  const [realtimeData, setRealtimeData] = useState<RealtimeData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedView, setSelectedView] = useState<'overview' | 'trading' | 'portfolio' | 'agents' | 'charts' | 'risk'>('overview')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // AG-UI Event Bus Integration
  useEffect(() => {
    const eventBus = getAGUIEventBus()

    // Initialize connection
    eventBus.initialize().then(() => {
      setMetrics(prev => ({ ...prev, connectionStatus: 'connected' }))
      logger.info('Real-time dashboard connected to AG-UI Protocol v2')
    }).catch((error) => {
      setMetrics(prev => ({ ...prev, connectionStatus: 'disconnected' }))
      logger.error('Failed to connect to AG-UI Protocol', error)
    })

    // Subscribe to comprehensive event streams
    const subscriptions = [
      // Portfolio events
      subscribe('portfolio.value_updated', (event) => {
        const { total_value, change_24h, change_percentage } = event.data
        setMetrics(prev => ({
          ...prev,
          portfolioValue: total_value,
          dailyPnl: change_24h,
          dailyPnlPercent: change_percentage,
          lastUpdate: Date.now()
        }))
        
        // Add to real-time chart data
        setRealtimeData(prev => [...prev.slice(-49), {
          timestamp: Date.now(),
          portfolioValue: total_value,
          dailyPnl: change_24h,
          riskScore: prev[prev.length - 1]?.riskScore || 0,
          activeSignals: prev[prev.length - 1]?.activeSignals || 0
        }])
      }),

      // Trading events
      subscribe('trade.order_placed', (event) => {
        setMetrics(prev => ({ ...prev, orders: prev.orders + 1 }))
        addAlert('success', `Order placed: ${event.data.symbol} ${event.data.side}`, 'trading')
      }),

      subscribe('trade.order_filled', (event) => {
        setMetrics(prev => ({ ...prev, orders: Math.max(0, prev.orders - 1) }))
        addAlert('success', `Order filled: ${event.data.symbol} at ${event.data.fill_price}`, 'trading')
        
        // Save trade to database
        db.saveTrade({
          id: event.data.order_id,
          orderId: event.data.order_id,
          symbol: event.data.symbol,
          side: event.data.side as 'buy' | 'sell',
          quantity: event.data.quantity,
          price: event.data.fill_price,
          fee: event.data.fees || 0,
          exchange: event.data.exchange,
          timestamp: Date.now(),
          status: 'executed'
        })
      }),

      subscribe('trade.signal_generated', (event) => {
        setMetrics(prev => ({ ...prev, signals: prev.signals + 1 }))
        setRealtimeData(prev => {
          const latest = prev[prev.length - 1]
          return [...prev.slice(-49), {
            ...latest,
            activeSignals: (latest?.activeSignals || 0) + 1,
            timestamp: Date.now()
          }]
        })
        
        const signal = event.data
        addAlert('info', `Trading signal: ${signal.action.toUpperCase()} ${signal.symbol} (${(signal.confidence * 100).toFixed(1)}% confidence)`, 'signals')
      }),

      // Agent events
      subscribe('agent.started', (event) => {
        setMetrics(prev => ({ ...prev, activeAgents: prev.activeAgents + 1 }))
        addAlert('success', `Agent ${event.data.agent_id} started`, 'agents')
      }),

      subscribe('agent.stopped', (event) => {
        setMetrics(prev => ({ ...prev, activeAgents: Math.max(0, prev.activeAgents - 1) }))
        addAlert('warning', `Agent ${event.data.agent_id} stopped: ${event.data.reason}`, 'agents')
      }),

      subscribe('agent.decision_made', (event) => {
        addAlert('info', `Agent decision: ${event.data.decision}`, 'agents')
      }),

      // Risk events
      subscribe('portfolio.risk_alert', (event) => {
        const alert = event.data
        setMetrics(prev => ({ ...prev, riskScore: alert.value || prev.riskScore }))
        addAlert('error', `Risk Alert: ${alert.message}`, 'risk')
        
        setRealtimeData(prev => {
          const latest = prev[prev.length - 1]
          return [...prev.slice(-49), {
            ...latest,
            riskScore: alert.value || latest?.riskScore || 0,
            timestamp: Date.now()
          }]
        })
      }),

      // System events
      subscribe('system.notification', (event) => {
        const { type, message, level } = event.data
        addAlert(level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info', message, 'system')
      }),

      // Connection events
      subscribe('connection.established', () => {
        setMetrics(prev => ({ ...prev, connectionStatus: 'connected' }))
        addAlert('success', 'Real-time connection established', 'system')
      }),

      subscribe('connection.lost', () => {
        setMetrics(prev => ({ ...prev, connectionStatus: 'disconnected' }))
        addAlert('error', 'Real-time connection lost', 'system')
      })
    ]

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [])

  // Data fetching and refresh
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch comprehensive dashboard metrics
      const [
        portfolioResponse,
        ordersResponse,
        agentsResponse,
        signalsResponse,
        riskResponse
      ] = await Promise.all([
        fetch('/api/portfolio/summary'),
        fetch('/api/trading/orders/active'),
        fetch('/api/agents/status'),
        fetch('/api/trading/signals?limit=10'),
        fetch('/api/risk/metrics')
      ])

      if (portfolioResponse.ok) {
        const portfolio = await portfolioResponse.json()
        setMetrics(prev => ({
          ...prev,
          portfolioValue: portfolio.totalValue,
          dailyPnl: portfolio.dailyPnl,
          dailyPnlPercent: portfolio.dailyPnlPercent,
          totalReturn: portfolio.totalGain,
          totalReturnPercent: portfolio.totalGainPercentage,
          positions: portfolio.positions?.length || 0
        }))
      }

      if (ordersResponse.ok) {
        const orders = await ordersResponse.json()
        setMetrics(prev => ({ ...prev, orders: orders.orders?.length || 0 }))
      }

      if (agentsResponse.ok) {
        const agents = await agentsResponse.json()
        const activeAgents = agents.agents?.filter((agent: any) => agent.status === 'active') || []
        setMetrics(prev => ({
          ...prev,
          agents: agents.agents?.length || 0,
          activeAgents: activeAgents.length
        }))
      }

      if (signalsResponse.ok) {
        const signals = await signalsResponse.json()
        setMetrics(prev => ({ ...prev, signals: signals.signals?.length || 0 }))
      }

      if (riskResponse.ok) {
        const risk = await riskResponse.json()
        setMetrics(prev => ({ ...prev, riskScore: risk.portfolioRisk || 0 }))
      }

      setMetrics(prev => ({ ...prev, lastUpdate: Date.now() }))
      logger.info('Dashboard data refreshed successfully')

    } catch (error) {
      logger.error('Failed to fetch dashboard data', error)
      addAlert('error', 'Failed to refresh dashboard data', 'system')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto refresh effect
  useEffect(() => {
    fetchDashboardData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [fetchDashboardData, autoRefresh])

  // Alert management
  const addAlert = useCallback((type: LiveAlert['type'], message: string, component: string) => {
    const newAlert: LiveAlert = {
      id: Date.now().toString() + Math.random().toString(36).substr(2),
      type,
      message,
      timestamp: Date.now(),
      acknowledged: false,
      component
    }
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 19)]) // Keep last 20 alerts
    
    // Auto-dismiss info/success alerts after 5 seconds
    if (type === 'info' || type === 'success') {
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== newAlert.id))
      }, 5000)
    }
  }, [])

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'start-trading',
      label: 'Start Trading',
      icon: <Play className="h-4 w-4" />,
      action: async () => {
        try {
          await fetch('/api/trading/start', { method: 'POST' })
          addAlert('success', 'Trading engine started', 'system')
        } catch (error) {
          addAlert('error', 'Failed to start trading', 'system')
        }
      },
      variant: 'default'
    },
    {
      id: 'stop-trading',
      label: 'Stop Trading',
      icon: <Pause className="h-4 w-4" />,
      action: async () => {
        try {
          await fetch('/api/trading/stop', { method: 'POST' })
          addAlert('warning', 'Trading engine stopped', 'system')
        } catch (error) {
          addAlert('error', 'Failed to stop trading', 'system')
        }
      },
      variant: 'outline'
    },
    {
      id: 'emergency-stop',
      label: 'Emergency Stop',
      icon: <Zap className="h-4 w-4" />,
      action: async () => {
        try {
          await fetch('/api/trading/emergency-stop', { method: 'POST' })
          addAlert('error', 'Emergency stop activated', 'system')
        } catch (error) {
          addAlert('error', 'Failed to execute emergency stop', 'system')
        }
      },
      variant: 'destructive'
    }
  ]

  // Helper functions
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'success': return <Activity className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'success': return 'border-green-200 bg-green-50'
      default: return 'border-emerald-200 bg-emerald-50'
    }
  }

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged)
  const criticalAlerts = alerts.filter(alert => alert.type === 'error' && !alert.acknowledged)

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-Time Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Live trading operations with AI agent coordination
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {criticalAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </Badge>
          )}
          <Badge 
            variant={metrics.connectionStatus === 'connected' ? 'default' : 'destructive'}
            className="flex items-center space-x-1"
          >
            <Activity className="h-3 w-3" />
            <span>{metrics.connectionStatus}</span>
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchDashboardData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.portfolioValue)}</div>
            <p className={`text-xs ${metrics.dailyPnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(metrics.dailyPnlPercent)} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.dailyPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.dailyPnl)}
            </div>
            <p className="text-xs text-muted-foreground">
              24h change
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.agents} total agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.riskScore.toFixed(1)}%</div>
            <Progress value={metrics.riskScore} className="mt-2" max={10} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.positions}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.orders} pending orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signals</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.signals}</div>
            <p className="text-xs text-muted-foreground">
              Active trading signals
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Essential trading controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant={action.variant}
                onClick={action.action}
                disabled={action.disabled}
                className="flex items-center space-x-2"
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Real-Time Performance</CardTitle>
          <CardDescription>Live portfolio and risk metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={realtimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value, name) => [
                    name === 'portfolioValue' ? formatCurrency(value as number) : value,
                    name
                  ]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="portfolioValue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Portfolio Value"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="riskScore"
                  stroke="#ff7300"
                  strokeWidth={2}
                  name="Risk Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Live Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Live Alerts ({unacknowledgedAlerts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 5).map(alert => (
                <Alert key={alert.id} className={getAlertColor(alert.type)}>
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-start space-x-2">
                      {getAlertIcon(alert.type)}
                      <div>
                        <AlertDescription>
                          {alert.message}
                          <div className="text-xs mt-1 text-muted-foreground">
                            {alert.component} • {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </AlertDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      ✓
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trading">Trading</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Trading Engine:</span>
                    <Badge variant="default">Running</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Status:</span>
                    <Badge variant="outline">{metrics.marketStatus}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Connection:</span>
                    <Badge variant={metrics.connectionStatus === 'connected' ? 'default' : 'destructive'}>
                      {metrics.connectionStatus}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Auto Refresh:</span>
                    <Badge variant={autoRefresh ? 'default' : 'secondary'}>
                      {autoRefresh ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Return:</span>
                    <span className={metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(metrics.totalReturn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Return %:</span>
                    <span className={metrics.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercentage(metrics.totalReturnPercent)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Positions:</span>
                    <span>{metrics.positions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Orders:</span>
                    <span>{metrics.orders}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trading">
          <TradingInterface />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioMonitor />
        </TabsContent>

        <TabsContent value="agents">
          <AgentManager />
        </TabsContent>

        <TabsContent value="charts">
          <TradingCharts />
        </TabsContent>

        <TabsContent value="risk">
          <RiskDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RealTimeDashboard