'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'

export interface CandlestickData {
  x: number
  y: [number, number, number, number] // [open, high, low, close]
}

export interface VolumeData {
  x: number
  y: number
}

export interface ChartDataState {
  candlestickData: CandlestickData[]
  volumeData: VolumeData[]
  loading: boolean
  error: string | null
  lastUpdate: Date | null
}

export interface UseCryptoChartOptions {
  symbol: string
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
  historicalPeriod?: number // number of candles to fetch
}

export function useCryptoChart({
  symbol,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  historicalPeriod = 100
}: UseCryptoChartOptions) {
  const { chartState } = useAppStore()
  const { publishEvent, subscribeToEvent } = useAGUIProtocol()
  
  const [chartData, setChartData] = useState<ChartDataState>({
    candlestickData: [],
    volumeData: [],
    loading: true,
    error: null,
    lastUpdate: null
  })
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Get timeframe in milliseconds
  const getTimeframeMs = useCallback((timeframe: string): number => {
    const timeframes: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }
    return timeframes[timeframe] || timeframes['1h']
  }, [])

  // Generate mock data for development/fallback
  const generateMockData = useCallback((): ChartDataState => {
    const now = Date.now()
    const timeframeMs = getTimeframeMs(chartState.timeframe)
    const mockCandlesticks: CandlestickData[] = []
    const mockVolume: VolumeData[] = []
    
    // Base price depends on symbol
    let basePrice = 45000 // Default BTC price
    if (symbol.includes('ETH')) basePrice = 3000
    else if (symbol.includes('BNB')) basePrice = 300
    else if (symbol.includes('ADA')) basePrice = 0.5
    else if (symbol.includes('XRP')) basePrice = 0.6
    else if (symbol.includes('SOL')) basePrice = 100
    else if (symbol.includes('DOGE')) basePrice = 0.08
    
    for (let i = historicalPeriod; i >= 0; i--) {
      const timestamp = now - (i * timeframeMs)
      const volatility = 0.02 // 2% volatility
      
      const open = basePrice
      const change = (Math.random() - 0.5) * volatility * basePrice
      const close = open + change
      const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5
      const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5
      const volume = Math.random() * 1000 + 100
      
      mockCandlesticks.push({
        x: timestamp,
        y: [open, high, low, close]
      })
      
      mockVolume.push({
        x: timestamp,
        y: volume
      })
      
      basePrice = close
    }
    
    return {
      candlestickData: mockCandlesticks,
      volumeData: mockVolume,
      loading: false,
      error: 'Using mock data - backend unavailable',
      lastUpdate: new Date()
    }
  }, [symbol, chartState.timeframe, historicalPeriod, getTimeframeMs])

  // Fetch chart data from backend
  const fetchChartData = useCallback(async (silent = false): Promise<void> => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      
      if (!silent) {
        setChartData(prev => ({ ...prev, loading: true, error: null }))
      }
      
      const timeframeMs = getTimeframeMs(chartState.timeframe)
      const startTime = new Date(Date.now() - historicalPeriod * timeframeMs).toISOString()
      const endTime = new Date().toISOString()
      
      const response = await backendApi.getMarketData(symbol)

      if (response.error) {
        throw new Error(response.error)
      }

      const { ohlcv_data } = response.data
      
      if (ohlcv_data && ohlcv_data.length > 0) {
        const candlesticks: CandlestickData[] = ohlcv_data.map((candle: any) => ({
          x: new Date(candle.timestamp).getTime(),
          y: [candle.open, candle.high, candle.low, candle.close]
        }))
        
        const volumes: VolumeData[] = ohlcv_data.map((candle: any) => ({
          x: new Date(candle.timestamp).getTime(),
          y: candle.volume
        }))

        setChartData({
          candlestickData: candlesticks,
          volumeData: volumes,
          loading: false,
          error: null,
          lastUpdate: new Date()
        })
        
        // Publish update event
        publishEvent('chart.data_updated', {
          symbol,
          timeframe: chartState.timeframe,
          dataPoints: candlesticks.length,
          timestamp: Date.now(),
          lastPrice: candlesticks[candlesticks.length - 1]?.y[3]
        })
      } else {
        throw new Error('No data received from backend')
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
      
      // Use mock data as fallback
      const mockData = generateMockData()
      setChartData(mockData)
      
      // Publish error event
      publishEvent('chart.data_error', {
        symbol,
        error: err instanceof Error ? err.message : 'Unknown error',
        usingMockData: true
      })
    }
  }, [symbol, chartState.timeframe, historicalPeriod, getTimeframeMs, generateMockData, publishEvent])

  // Add new candle data (for real-time updates)
  const addCandleData = useCallback((newCandle: CandlestickData, newVolume?: VolumeData) => {
    setChartData(prev => {
      const updatedCandlesticks = [...prev.candlestickData]
      const updatedVolumes = [...prev.volumeData]
      
      // Check if we should update the last candle or add a new one
      const lastCandle = updatedCandlesticks[updatedCandlesticks.length - 1]
      const timeframeMs = getTimeframeMs(chartState.timeframe)
      
      if (lastCandle && (newCandle.x - lastCandle.x) < timeframeMs) {
        // Update the last candle
        updatedCandlesticks[updatedCandlesticks.length - 1] = newCandle
        if (newVolume) {
          updatedVolumes[updatedVolumes.length - 1] = newVolume
        }
      } else {
        // Add new candle
        updatedCandlesticks.push(newCandle)
        if (newVolume) {
          updatedVolumes.push(newVolume)
        }
        
        // Keep only the last N candles
        if (updatedCandlesticks.length > historicalPeriod) {
          updatedCandlesticks.shift()
          updatedVolumes.shift()
        }
      }
      
      return {
        ...prev,
        candlestickData: updatedCandlesticks,
        volumeData: updatedVolumes,
        lastUpdate: new Date()
      }
    })
  }, [chartState.timeframe, getTimeframeMs, historicalPeriod])

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchChartData(true) // Silent refresh
      }, refreshInterval)
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, fetchChartData])

  // Initial data fetch and refetch when dependencies change
  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  // Subscribe to real-time market data events
  useEffect(() => {
    const subscription = subscribeToEvent('market_data.price_update', (data) => {
      if (data.symbol === symbol) {
        // Update with real-time price data
        const now = Date.now()
        const newCandle: CandlestickData = {
          x: now,
          y: [data.price, data.price, data.price, data.price] // All same for real-time tick
        }
        
        const newVolume: VolumeData = {
          x: now,
          y: data.volume || 0
        }
        
        addCandleData(newCandle, newVolume)
      }
    })
    
    return subscription.unsubscribe
  }, [symbol, addCandleData, subscribeToEvent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...chartData,
    refetch: () => fetchChartData(false),
    addCandleData,
    isRealTime: autoRefresh,
    symbolPair: symbol,
    timeframe: chartState.timeframe
  }
}