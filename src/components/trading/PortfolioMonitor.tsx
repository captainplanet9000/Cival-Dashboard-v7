/**
 * Real-time Portfolio Monitoring Component
 * Integrates with AG-UI Protocol v2 for live portfolio updates
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  BarChart3, 
  RefreshCw, 
  DollarSign,
  Activity,
  Target,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

// AG-UI Protocol integration
import { subscribe, emit, type TradingEvents, type WalletEvents } from '@/lib/ag-ui-protocol-v2'

// Portfolio Types
interface PortfolioPosition {
  id: string
  symbol: string
  exchange: string
  size: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  allocation: number
  risk: number
  lastUpdate: number
}

interface PortfolioPerformance {
  totalValue: number
  totalPnl: number
  totalPnlPercent: number
  dailyPnl: number
  weeklyPnl: number
  monthlyPnl: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  totalTrades: number
}

interface PortfolioHistory {
  timestamp: number
  totalValue: number
  pnl: number
  positions: number
}

interface AllocationData {
  name: string
  value: number
  color: string
  allocation: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

export function PortfolioMonitor() {
  // State Management
  const [positions, setPositions] = useState<PortfolioPosition[]>([])
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null)
  const [history, setHistory] = useState<PortfolioHistory[]>([])
  const [allocationData, setAllocationData] = useState<AllocationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showSmallPositions, setShowSmallPositions] = useState(false)

  // AG-UI Event Subscriptions
  useEffect(() => {
    // Subscribe to portfolio updates
    const portfolioSub = subscribe('portfolio.value_updated', (event) => {
      const { total_value, change_24h, change_percentage } = event.data
      setPerformance(prev => prev ? {
        ...prev,
        totalValue: total_value,
        dailyPnl: change_24h * total_value / 100,
      } : null)
      setLastUpdate(new Date())
    })

    // Subscribe to position updates
    const positionSub = subscribe('trade.position_update', (event) => {
      const { position_id, symbol, current_value, unrealized_pnl } = event.data
      setPositions(prev => prev.map(pos => 
        pos.id === position_id ? {
          ...pos,
          marketValue: current_value,
          unrealizedPnl: unrealized_pnl,
          lastUpdate: Date.now()
        } : pos
      ))
    })

    // Subscribe to trade executions
    const tradeSub = subscribe('trade.executed', (event) => {
      // Trigger portfolio refresh when trades are executed
      fetchPortfolioData()
    })

    return () => {
      portfolioSub.unsubscribe()
      positionSub.unsubscribe()
      tradeSub.unsubscribe()
    }
  }, [])

  // Data Fetching
  const fetchPortfolioData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch current positions
      const positionsResponse = await fetch('/api/portfolio/positions')
      if (positionsResponse.ok) {
        const positionsData = await positionsResponse.json()
        setPositions(positionsData.positions || [])
      }

      // Fetch performance metrics
      const performanceResponse = await fetch('/api/portfolio/performance')
      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json()
        setPerformance(performanceData)
      }

      // Fetch portfolio history
      const historyResponse = await fetch('/api/portfolio/history?period=24h')
      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setHistory(historyData.history || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto refresh effect
  useEffect(() => {
    fetchPortfolioData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchPortfolioData, 10000) // Refresh every 10 seconds
      return () => clearInterval(interval)
    }
  }, [fetchPortfolioData, autoRefresh])

  // Calculate allocation data
  useEffect(() => {
    if (positions.length > 0 && performance) {
      const allocations = positions
        .filter(pos => showSmallPositions || pos.allocation >= 1) // Filter small positions
        .map((pos, index) => ({
          name: pos.symbol,
          value: pos.marketValue,
          color: COLORS[index % COLORS.length],
          allocation: pos.allocation
        }))
        .sort((a, b) => b.value - a.value)

      setAllocationData(allocations)
    }
  }, [positions, performance, showSmallPositions])

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

  const formatNumber = (value: number, decimals: number = 6) => {
    return value.toFixed(decimals).replace(/\.?0+$/, '')
  }

  const getColorClass = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTrendIcon = (value: number) => {
    return value >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
  }

  const filteredPositions = positions.filter(pos => 
    showSmallPositions || pos.allocation >= 1
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Portfolio Monitor</h2>
          <p className="text-muted-foreground">Real-time portfolio tracking and analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : ''}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? 'Live' : 'Paused'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPortfolioData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance ? formatCurrency(performance.totalValue) : '$0.00'}
            </div>
            <p className={`text-xs flex items-center ${getColorClass(performance?.totalPnlPercent || 0)}`}>
              {getTrendIcon(performance?.totalPnlPercent || 0)}
              <span className="ml-1">
                {performance ? formatPercentage(performance.totalPnlPercent) : '+0.00%'}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getColorClass(performance?.dailyPnl || 0)}`}>
              {performance ? formatCurrency(performance.dailyPnl) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredPositions.length} above 1%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performance ? `${performance.winRate.toFixed(1)}%` : '0.0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              {performance?.totalTrades || 0} total trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Positions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSmallPositions(!showSmallPositions)}
                >
                  {showSmallPositions ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showSmallPositions ? 'Hide' : 'Show'} Small
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPositions.map((position) => (
                  <div key={position.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-lg">{position.symbol}</span>
                          <Badge variant="outline">{position.exchange}</Badge>
                          <Badge variant={position.unrealizedPnl >= 0 ? 'default' : 'destructive'}>
                            {formatPercentage(position.unrealizedPnlPercent)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Size: {formatNumber(position.size)} • 
                          Avg Price: {formatCurrency(position.averagePrice)} • 
                          Current: {formatCurrency(position.currentPrice)}
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">
                            Allocation: {position.allocation.toFixed(1)}%
                          </span>
                          <Progress value={position.allocation} className="w-20" />
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-lg font-bold">
                          {formatCurrency(position.marketValue)}
                        </div>
                        <div className={`text-sm ${getColorClass(position.unrealizedPnl)}`}>
                          {formatCurrency(position.unrealizedPnl)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Risk: {position.risk.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredPositions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions to display
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, allocation }) => `${name} (${allocation.toFixed(1)}%)`}
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Allocation Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.value)}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.allocation.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getColorClass(performance?.totalPnl || 0)}`}>
                  {performance ? formatCurrency(performance.totalPnl) : '$0.00'}
                </div>
                <p className={`text-sm ${getColorClass(performance?.totalPnlPercent || 0)}`}>
                  {performance ? formatPercentage(performance.totalPnlPercent) : '+0.00%'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Max Drawdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {performance ? `${performance.maxDrawdown.toFixed(2)}%` : '0.00%'}
                </div>
                <p className="text-sm text-muted-foreground">Peak to trough</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sharpe Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {performance ? performance.sharpeRatio.toFixed(2) : '0.00'}
                </div>
                <p className="text-sm text-muted-foreground">Risk-adjusted returns</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Value History</CardTitle>
              <CardDescription>Last 24 hours</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value) => [formatCurrency(value as number), 'Portfolio Value']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalValue" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PortfolioMonitor