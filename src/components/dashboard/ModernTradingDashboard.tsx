/**
 * Modern Trading Dashboard
 * Mobile-responsive dashboard with emerald/violet/amber color scheme
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Bot, 
  Shield, 
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  Menu,
  X,
  Calendar,
  PieChart,
  Users,
  Wallet
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Store integrations
import { useAppStore, usePositions, usePortfolioValue } from '@/lib/store'

interface DashboardMetrics {
  totalValue: number
  dailyPnL: number
  totalPnL: number
  activePositions: number
  activeAgents: number
  activeFarms: number
  winRate: number
  avgReturn: number
}

interface ChartData {
  time: string
  value: number
  pnl: number
}

export function ModernTradingDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalValue: 0,
    dailyPnL: 0,
    totalPnL: 0,
    activePositions: 0,
    activeAgents: 0,
    activeFarms: 0,
    winRate: 0,
    avgReturn: 0
  })

  // Store data
  const appStore = useAppStore()
  const positions = usePositions()
  const portfolioValue = usePortfolioValue()

  // Initialize store
  useEffect(() => {
    appStore.initialize()
  }, [])

  // Update metrics when store data changes
  useEffect(() => {
    setMetrics({
      totalValue: portfolioValue,
      dailyPnL: appStore.totalPnL,
      totalPnL: appStore.totalPnL,
      activePositions: positions.length,
      activeAgents: 3, // Mock data
      activeFarms: 2, // Mock data
      winRate: 75.4, // Mock data
      avgReturn: 12.8 // Mock data
    })
  }, [portfolioValue, appStore.totalPnL, positions])

  // Generate mock chart data
  const generateChartData = (): ChartData[] => {
    const data: ChartData[] = []
    const now = new Date()
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000)
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        value: 50000 + Math.random() * 10000 - 5000,
        pnl: (Math.random() - 0.5) * 2000
      })
    }
    return data
  }

  const chartData = generateChartData()

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'agents', label: 'Agents', icon: Bot },
    { id: 'farms', label: 'Farms', icon: Target },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ]

  const MetricCard = ({ title, value, change, changeType, icon: Icon, gradient }: {
    title: string
    value: string | number
    change?: string
    changeType?: 'positive' | 'negative' | 'neutral'
    icon: any
    gradient: string
  }) => (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`} />
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        {change && (
          <p className={`text-xs flex items-center mt-1 ${
            changeType === 'positive' ? 'text-emerald-600' :
            changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {changeType === 'positive' ? <TrendingUp className="h-3 w-3 mr-1" /> :
             changeType === 'negative' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Portfolio Value"
          value={`$${metrics.totalValue.toLocaleString()}`}
          change="+2.4% today"
          changeType="positive"
          icon={Wallet}
          gradient="from-emerald-500 to-emerald-600"
        />
        <MetricCard
          title="Daily P&L"
          value={`$${metrics.dailyPnL.toLocaleString()}`}
          change="+5.2% vs yesterday"
          changeType={metrics.dailyPnL >= 0 ? 'positive' : 'negative'}
          icon={TrendingUp}
          gradient="from-violet-500 to-violet-600"
        />
        <MetricCard
          title="Active Agents"
          value={metrics.activeAgents}
          change={`${metrics.activeAgents} running`}
          changeType="neutral"
          icon={Bot}
          gradient="from-amber-500 to-amber-600"
        />
        <MetricCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          change="+1.2% this week"
          changeType="positive"
          icon={Target}
          gradient="from-rose-500 to-rose-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Portfolio Value Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span>Portfolio Value (24h)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#valueGradient)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* P&L Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-violet-500"></div>
              <span>P&L Distribution (24h)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="pnl" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white">
              <div className="text-center">
                <Zap className="h-6 w-6 mx-auto mb-1" />
                <div className="text-sm">Start Trading</div>
              </div>
            </Button>
            <Button variant="outline" className="h-20 border-violet-200 hover:bg-violet-50">
              <div className="text-center">
                <Bot className="h-6 w-6 mx-auto mb-1 text-violet-600" />
                <div className="text-sm text-violet-600">Deploy Agent</div>
              </div>
            </Button>
            <Button variant="outline" className="h-20 border-amber-200 hover:bg-amber-50">
              <div className="text-center">
                <Target className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                <div className="text-sm text-amber-600">Create Farm</div>
              </div>
            </Button>
            <Button variant="outline" className="h-20 border-rose-200 hover:bg-rose-50">
              <div className="text-center">
                <Shield className="h-6 w-6 mx-auto mb-1 text-rose-600" />
                <div className="text-sm text-rose-600">Risk Analysis</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveTab(tab.id)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-violet-600 bg-clip-text text-transparent">
                  Cival Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced Trading Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Desktop Tabs */}
        <div className="hidden lg:block mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6 bg-white dark:bg-gray-800 border shadow-sm">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-violet-500 data-[state=active]:text-white"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-6">
              <TabsContent value="overview" className="space-y-6">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="portfolio">
                <div className="text-center py-12">
                  <PieChart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Portfolio Management</h3>
                  <p className="text-gray-500">Advanced portfolio tracking and analysis coming soon</p>
                </div>
              </TabsContent>
              <TabsContent value="agents">
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">AI Agent Management</h3>
                  <p className="text-gray-500">Deploy and manage your AI trading agents</p>
                </div>
              </TabsContent>
              <TabsContent value="farms">
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Yield Farming</h3>
                  <p className="text-gray-500">Optimize your DeFi yield farming strategies</p>
                </div>
              </TabsContent>
              <TabsContent value="calendar">
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Trading Calendar</h3>
                  <p className="text-gray-500">Track daily earnings and trading performance</p>
                </div>
              </TabsContent>
              <TabsContent value="analytics">
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                  <p className="text-gray-500">Deep insights into your trading performance</p>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Mobile Content */}
        <div className="lg:hidden">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab !== 'overview' && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                {tabs.find(t => t.id === activeTab)?.icon && 
                  React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "h-12 w-12 mx-auto" })
                }
              </div>
              <h3 className="text-lg font-medium mb-2">
                {tabs.find(t => t.id === activeTab)?.label}
              </h3>
              <p className="text-gray-500">Feature coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}