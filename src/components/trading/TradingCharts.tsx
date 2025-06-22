/**
 * Advanced Trading Charts and Analytics Component
 * Professional-grade charts with technical indicators and real-time data
 */

'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity, 
  Target, 
  Layers,
  Maximize2,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Zap
} from 'lucide-react'

// AG-UI Protocol integration
import { subscribe, type TradingEvents } from '@/lib/ag-ui-protocol-v2'

// Chart Data Types
interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  date: string
  time: string
}

interface IndicatorData {
  sma20?: number
  sma50?: number
  ema12?: number
  ema26?: number
  rsi?: number
  macd?: number
  macdSignal?: number
  macdHistogram?: number
  bollingerUpper?: number
  bollingerMiddle?: number
  bollingerLower?: number
  volume?: number
}

interface TradingSignalOverlay {
  timestamp: number
  type: 'buy' | 'sell'
  price: number
  strategy: string
  confidence: number
  id: string
}

interface PriceLevel {
  price: number
  type: 'support' | 'resistance' | 'target' | 'stop'
  label: string
  color: string
}

interface ChartConfig {
  symbol: string
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  indicators: {
    sma: boolean
    ema: boolean
    rsi: boolean
    macd: boolean
    bollinger: boolean
    volume: boolean
  }
  overlays: {
    signals: boolean
    levels: boolean
    positions: boolean
  }
  style: 'candlestick' | 'line' | 'area'
}

// Technical Indicators Calculator
class TechnicalIndicators {
  static sma(data: number[], period: number): number[] {
    const result: number[] = []
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(sum / period)
    }
    return result
  }

  static ema(data: number[], period: number): number[] {
    const result: number[] = []
    const multiplier = 2 / (period + 1)
    result[0] = data[0]

    for (let i = 1; i < data.length; i++) {
      result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier))
    }
    return result
  }

  static rsi(data: number[], period: number = 14): number[] {
    const gains: number[] = []
    const losses: number[] = []
    const rsi: number[] = []

    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
      const rs = avgGain / (avgLoss || 0.0001)
      rsi.push(100 - (100 / (1 + rs)))
    }

    return rsi
  }

  static bollinger(data: number[], period: number = 20, stdDev: number = 2) {
    const sma = this.sma(data, period)
    const upper: number[] = []
    const middle: number[] = []
    const lower: number[] = []

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1)
      const mean = slice.reduce((a, b) => a + b, 0) / period
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
      const standardDeviation = Math.sqrt(variance)

      middle.push(mean)
      upper.push(mean + (standardDeviation * stdDev))
      lower.push(mean - (standardDeviation * stdDev))
    }

    return { upper, middle, lower }
  }

  static macd(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const fastEMA = this.ema(data, fastPeriod)
    const slowEMA = this.ema(data, slowPeriod)
    const macd: number[] = []
    
    const minLength = Math.min(fastEMA.length, slowEMA.length)
    for (let i = 0; i < minLength; i++) {
      macd.push(fastEMA[i] - slowEMA[i])
    }

    const signal = this.ema(macd, signalPeriod)
    const histogram: number[] = []
    
    for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
      histogram.push(macd[i] - signal[i])
    }

    return { macd, signal, histogram }
  }
}

// Custom Candlestick Component
const CustomCandlestick = ({ payload, x, y, width, height }: any) => {
  if (!payload) return null
  
  const { open, high, low, close } = payload
  const isRed = close < open
  const color = isRed ? '#ef4444' : '#10b981'
  const fillColor = isRed ? '#ef4444' : '#10b981'
  
  const bodyHeight = Math.abs(close - open)
  const bodyY = Math.min(open, close)
  
  return (
    <g>
      {/* Wick */}
      <line
        x1={x + width / 2}
        y1={y}
        x2={x + width / 2}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={x + 1}
        y={bodyY}
        width={width - 2}
        height={bodyHeight || 1}
        fill={fillColor}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  )
}

export function TradingCharts() {
  // State Management
  const [chartData, setChartData] = useState<CandleData[]>([])
  const [indicators, setIndicators] = useState<IndicatorData[]>([])
  const [signals, setSignals] = useState<TradingSignalOverlay[]>([])
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([])
  const [config, setConfig] = useState<ChartConfig>({
    symbol: 'BTC',
    timeframe: '1h',
    indicators: {
      sma: true,
      ema: false,
      rsi: true,
      macd: false,
      bollinger: false,
      volume: true
    },
    overlays: {
      signals: true,
      levels: true,
      positions: false
    },
    style: 'candlestick'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [availableSymbols, setAvailableSymbols] = useState<string[]>(['BTC', 'ETH', 'ADA', 'DOT', 'LINK'])

  // AG-UI Event Subscriptions
  useEffect(() => {
    // Subscribe to trading signals
    const signalSub = subscribe('trade.signal_generated', (event) => {
      const signal = event.data
      const newSignal: TradingSignalOverlay = {
        timestamp: signal.timestamp || Date.now(),
        type: signal.action as 'buy' | 'sell',
        price: signal.price || 0,
        strategy: signal.strategy || 'Unknown',
        confidence: signal.confidence,
        id: `signal-${Date.now()}`
      }
      setSignals(prev => [newSignal, ...prev.slice(0, 19)]) // Keep last 20 signals
    })

    // Subscribe to price updates for real-time chart updates
    const priceSub = subscribe('market_data.price_update', (event) => {
      const priceData = event.data
      if (priceData.symbol === config.symbol) {
        setLastUpdate(new Date())
        // Update latest candle or add new one based on timeframe
        updateLatestCandle(priceData)
      }
    })

    return () => {
      signalSub.unsubscribe()
      priceSub.unsubscribe()
    }
  }, [config.symbol])

  // Data Fetching
  const fetchChartData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Fetch OHLCV data
      const response = await fetch(`/api/market/ohlcv/${config.symbol}?timeframe=${config.timeframe}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        const processedData = data.ohlcv.map((candle: any) => ({
          ...candle,
          date: new Date(candle.timestamp).toLocaleDateString(),
          time: new Date(candle.timestamp).toLocaleTimeString()
        }))
        
        setChartData(processedData)
        calculateIndicators(processedData)
      }

      // Fetch recent signals
      const signalsResponse = await fetch(`/api/trading/signals?symbol=${config.symbol}&limit=20`)
      if (signalsResponse.ok) {
        const signalsData = await signalsResponse.json()
        setSignals(signalsData.signals || [])
      }

      // Fetch price levels (support/resistance)
      const levelsResponse = await fetch(`/api/market/levels/${config.symbol}`)
      if (levelsResponse.ok) {
        const levelsData = await levelsResponse.json()
        setPriceLevels(levelsData.levels || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [config.symbol, config.timeframe])

  // Calculate Technical Indicators
  const calculateIndicators = useCallback((data: CandleData[]) => {
    const closes = data.map(d => d.close)
    const volumes = data.map(d => d.volume)
    
    const calculatedIndicators: IndicatorData[] = []
    
    // Calculate all indicators
    const sma20 = TechnicalIndicators.sma(closes, 20)
    const sma50 = TechnicalIndicators.sma(closes, 50)
    const ema12 = TechnicalIndicators.ema(closes, 12)
    const ema26 = TechnicalIndicators.ema(closes, 26)
    const rsi = TechnicalIndicators.rsi(closes)
    const bollinger = TechnicalIndicators.bollinger(closes)
    const macdData = TechnicalIndicators.macd(closes)
    
    // Combine all indicators for each data point
    for (let i = 0; i < data.length; i++) {
      const indicators: IndicatorData = {
        volume: volumes[i]
      }
      
      // Add SMA values (offset for warmup period)
      if (i >= 19) {
        indicators.sma20 = sma20[i - 19]
      }
      if (i >= 49) {
        indicators.sma50 = sma50[i - 49]
      }
      
      // Add EMA values
      if (i < ema12.length) {
        indicators.ema12 = ema12[i]
      }
      if (i < ema26.length) {
        indicators.ema26 = ema26[i]
      }
      
      // Add RSI (offset for warmup period)
      if (i >= 14 && rsi[i - 14] !== undefined) {
        indicators.rsi = rsi[i - 14]
      }
      
      // Add Bollinger Bands
      if (i >= 19 && bollinger.middle[i - 19] !== undefined) {
        indicators.bollingerUpper = bollinger.upper[i - 19]
        indicators.bollingerMiddle = bollinger.middle[i - 19]
        indicators.bollingerLower = bollinger.lower[i - 19]
      }
      
      // Add MACD
      if (i < macdData.macd.length) {
        indicators.macd = macdData.macd[i]
        if (i < macdData.signal.length) {
          indicators.macdSignal = macdData.signal[i]
        }
        if (i < macdData.histogram.length) {
          indicators.macdHistogram = macdData.histogram[i]
        }
      }
      
      calculatedIndicators.push(indicators)
    }
    
    setIndicators(calculatedIndicators)
  }, [])

  // Update latest candle with real-time price
  const updateLatestCandle = useCallback((priceData: any) => {
    setChartData(prev => {
      if (prev.length === 0) return prev
      
      const updated = [...prev]
      const latest = updated[updated.length - 1]
      
      // Update the latest candle's close price and high/low if necessary
      updated[updated.length - 1] = {
        ...latest,
        close: priceData.price,
        high: Math.max(latest.high, priceData.price),
        low: Math.min(latest.low, priceData.price),
        volume: latest.volume + (priceData.volume || 0)
      }
      
      return updated
    })
  }, [])

  // Effects
  useEffect(() => {
    fetchChartData()
    const interval = setInterval(fetchChartData, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [fetchChartData])

  // Memoized chart data with indicators
  const enrichedChartData = useMemo(() => {
    return chartData.map((candle, index) => ({
      ...candle,
      ...(indicators[index] || {})
    }))
  }, [chartData, indicators])

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{new Date(label).toLocaleString()}</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between space-x-4">
            <span>Open:</span>
            <span className="font-mono">${data.open?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span>High:</span>
            <span className="font-mono text-green-600">${data.high?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span>Low:</span>
            <span className="font-mono text-red-600">${data.low?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span>Close:</span>
            <span className="font-mono">${data.close?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between space-x-4">
            <span>Volume:</span>
            <span className="font-mono">{data.volume?.toLocaleString()}</span>
          </div>
          {data.rsi && (
            <div className="flex justify-between space-x-4">
              <span>RSI:</span>
              <span className="font-mono">{data.rsi.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Signal overlay dots
  const SignalDots = () => {
    if (!config.overlays.signals) return null
    
    return (
      <>
        {signals.map((signal) => {
          const dataPoint = chartData.find(d => 
            Math.abs(d.timestamp - signal.timestamp) < 60000 // Within 1 minute
          )
          if (!dataPoint) return null
          
          return (
            <circle
              key={signal.id}
              cx={dataPoint.timestamp}
              cy={signal.price}
              r={4}
              fill={signal.type === 'buy' ? '#10b981' : '#ef4444'}
              stroke="#ffffff"
              strokeWidth={2}
              opacity={signal.confidence}
            />
          )
        })}
      </>
    )
  }

  // Render price level lines
  const PriceLevelLines = () => {
    if (!config.overlays.levels) return null
    
    return (
      <>
        {priceLevels.map((level, index) => (
          <ReferenceLine
            key={index}
            y={level.price}
            stroke={level.color}
            strokeDasharray="5 5"
            label={{ value: level.label, position: "top" }}
          />
        ))}
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trading Charts & Analytics</h2>
          <p className="text-muted-foreground">Professional trading charts with technical analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchChartData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Chart Configuration</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{config.symbol}</Badge>
              <Badge variant="outline">{config.timeframe}</Badge>
              <Badge variant="outline">{config.style}</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Symbol Selection */}
            <div className="space-y-2">
              <Label>Symbol</Label>
              <Select
                value={config.symbol}
                onValueChange={(value) => setConfig(prev => ({ ...prev, symbol: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map(symbol => (
                    <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timeframe Selection */}
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select
                value={config.timeframe}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, timeframe: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1m">1 Minute</SelectItem>
                  <SelectItem value="5m">5 Minutes</SelectItem>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chart Style */}
            <div className="space-y-2">
              <Label>Chart Style</Label>
              <Select
                value={config.style}
                onValueChange={(value: any) => setConfig(prev => ({ ...prev, style: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Indicators Toggle */}
            <div className="space-y-2">
              <Label>Quick Indicators</Label>
              <div className="flex space-x-2">
                <Button
                  variant={config.indicators.sma ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    indicators: { ...prev.indicators, sma: !prev.indicators.sma }
                  }))}
                >
                  SMA
                </Button>
                <Button
                  variant={config.indicators.rsi ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    indicators: { ...prev.indicators, rsi: !prev.indicators.rsi }
                  }))}
                >
                  RSI
                </Button>
                <Button
                  variant={config.indicators.bollinger ? "default" : "outline"}
                  size="sm"
                  onClick={() => setConfig(prev => ({ 
                    ...prev, 
                    indicators: { ...prev.indicators, bollinger: !prev.indicators.bollinger }
                  }))}
                >
                  BB
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{config.symbol} Price Chart</span>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {config.style === 'candlestick' ? (
                <LineChart data={enrichedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} />
                  <Tooltip content={<CustomTooltip />} />
                  
                  {/* Price Levels */}
                  <PriceLevelLines />
                  
                  {/* Candlestick representation using Lines */}
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                  
                  {/* Moving Averages */}
                  {config.indicators.sma && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="sma20"
                        stroke="#ff7300"
                        strokeWidth={1}
                        dot={false}
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="sma50"
                        stroke="#387908"
                        strokeWidth={1}
                        dot={false}
                        strokeDasharray="3 3"
                      />
                    </>
                  )}
                  
                  {/* Bollinger Bands */}
                  {config.indicators.bollinger && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="bollingerUpper"
                        stroke="#82ca9d"
                        strokeWidth={1}
                        dot={false}
                        strokeOpacity={0.6}
                      />
                      <Line
                        type="monotone"
                        dataKey="bollingerLower"
                        stroke="#82ca9d"
                        strokeWidth={1}
                        dot={false}
                        strokeOpacity={0.6}
                      />
                    </>
                  )}
                  
                  <Brush dataKey="timestamp" height={30} />
                  <Legend />
                </LineChart>
              ) : config.style === 'line' ? (
                <LineChart data={enrichedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#8884d8"
                    strokeWidth={2}
                  />
                  <Brush dataKey="timestamp" height={30} />
                </LineChart>
              ) : (
                <AreaChart data={enrichedChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                  <Brush dataKey="timestamp" height={30} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Technical Indicators */}
      <Tabs defaultValue="rsi" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rsi">RSI</TabsTrigger>
          <TabsTrigger value="macd">MACD</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="rsi" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relative Strength Index (RSI)</CardTitle>
              <CardDescription>Momentum oscillator measuring price change velocity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrichedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => [(value as number)?.toFixed(2), 'RSI']}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label="Overbought" />
                    <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label="Oversold" />
                    <Line
                      type="monotone"
                      dataKey="rsi"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MACD (Moving Average Convergence Divergence)</CardTitle>
              <CardDescription>Trend-following momentum indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrichedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [(value as number)?.toFixed(4), name]}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <ReferenceLine y={0} stroke="#666" strokeDasharray="1 1" />
                    <Line
                      type="monotone"
                      dataKey="macd"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={false}
                      name="MACD"
                    />
                    <Line
                      type="monotone"
                      dataKey="macdSignal"
                      stroke="#ff7300"
                      strokeWidth={2}
                      dot={false}
                      name="Signal"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Volume</CardTitle>
              <CardDescription>Volume analysis and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrichedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value?.toLocaleString(), 'Volume']}
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                    />
                    <Bar
                      dataKey="volume"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Signals</CardTitle>
              <CardDescription>Recent AI-generated trading signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {signals.map((signal) => (
                  <div key={signal.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={signal.type === 'buy' ? 'default' : 'destructive'}>
                            {signal.type.toUpperCase()}
                          </Badge>
                          <span className="font-medium">{config.symbol}</span>
                          <Badge variant="outline">{signal.strategy}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Price: ${signal.price.toFixed(4)} • 
                          Confidence: {(signal.confidence * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(signal.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {signal.type === 'buy' ? '🟢' : '🔴'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {signals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent signals for {config.symbol}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TradingCharts