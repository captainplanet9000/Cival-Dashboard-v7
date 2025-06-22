'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { backendApi } from '@/lib/api/backend-client'
// ChartControls component inline to avoid import issues
import { cn } from '@/lib/utils'
import type { ApexOptions } from 'apexcharts'

// Dynamic import to avoid SSR issues
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false })

export interface CryptoChartProps {
  symbol?: string
  height?: number
  showControls?: boolean
  showVolume?: boolean
  className?: string
  onCrosshairMove?: (data: any) => void
}

export interface CandlestickData {
  x: number
  y: [number, number, number, number] // [open, high, low, close]
}

export interface VolumeData {
  x: number
  y: number
}

export function CryptoChart({
  symbol = 'BTCUSDT',
  height = 400,
  showControls = true,
  showVolume = true,
  className,
  onCrosshairMove
}: CryptoChartProps) {
  const { chartState, updateChartState } = useAppStore()
  const { publishEvent, subscribeToEvent } = useAGUIProtocol()
  
  const [candlestickData, setCandlestickData] = useState<CandlestickData[]>([])
  const [volumeData, setVolumeData] = useState<VolumeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<any>(null)

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      setLoading(true)
      setError(null)
      
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

        setCandlestickData(candlesticks)
        setVolumeData(volumes)
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load chart data')
      
      // Generate mock data for development
      generateMockData()
    } finally {
      setLoading(false)
    }
  }

  // Generate mock data for development/fallback
  const generateMockData = () => {
    const now = Date.now()
    const timeframeMs = getTimeframeMs(chartState.timeframe)
    const mockData: CandlestickData[] = []
    const mockVolume: VolumeData[] = []
    
    let basePrice = 45000 // Starting BTC price
    
    for (let i = 100; i >= 0; i--) {
      const timestamp = now - (i * timeframeMs)
      const volatility = 0.02 // 2% volatility
      
      const open = basePrice
      const change = (Math.random() - 0.5) * volatility * basePrice
      const close = open + change
      const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5
      const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5
      const volume = Math.random() * 1000 + 100
      
      mockData.push({
        x: timestamp,
        y: [open, high, low, close]
      })
      
      mockVolume.push({
        x: timestamp,
        y: volume
      })
      
      basePrice = close
    }
    
    setCandlestickData(mockData)
    setVolumeData(mockVolume)
  }

  // Get timeframe in milliseconds
  const getTimeframeMs = (timeframe: string): number => {
    const timeframes: Record<string, number> = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }
    return timeframes[timeframe] || timeframes['1h']
  }

  // Chart options
  const chartOptions: ApexOptions = {
    chart: {
      type: 'candlestick',
      height: height,
      animations: {
        enabled: true,
        speed: 800
      },
      zoom: {
        enabled: true,
        type: 'x'
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      events: {
        mouseMove: (event, chartContext, config) => {
          if (config.dataPointIndex >= 0) {
            const data = candlestickData[config.dataPointIndex]
            if (data && onCrosshairMove) {
              onCrosshairMove({
                timestamp: data.x,
                open: data.y[0],
                high: data.y[1],
                low: data.y[2],
                close: data.y[3],
                volume: volumeData[config.dataPointIndex]?.y
              })
            }
            
            // Publish crosshair event
            publishEvent('chart.crosshair_move', {
              symbol,
              price: data.y[3], // close price
              time: data.x,
              volume: volumeData[config.dataPointIndex]?.y
            })
          }
        }
      }
    },
    title: {
      text: `${symbol} - ${chartState.timeframe}`,
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: '600'
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM \'yy',
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      }
    },
    yaxis: {
      tooltip: {
        enabled: true
      },
      labels: {
        formatter: (value) => `$${value.toFixed(2)}`
      }
    },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#10b981', // green
          downward: '#ef4444' // red
        },
        wick: {
          useFillColor: true
        }
      }
    },
    tooltip: {
      custom: ({ seriesIndex, dataPointIndex, w }) => {
        const data = candlestickData[dataPointIndex]
        if (!data) return ''
        
        const [open, high, low, close] = data.y
        const volume = volumeData[dataPointIndex]?.y || 0
        const change = close - open
        const changePercent = ((change / open) * 100).toFixed(2)
        
        return `
          <div class="p-3 bg-background border rounded-lg shadow-lg">
            <div class="font-semibold mb-2">${symbol}</div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>Open: $${open.toFixed(2)}</div>
              <div>High: $${high.toFixed(2)}</div>
              <div>Low: $${low.toFixed(2)}</div>
              <div>Close: $${close.toFixed(2)}</div>
              <div class="col-span-2">Volume: ${volume.toFixed(0)}</div>
              <div class="col-span-2 ${change >= 0 ? 'text-green-500' : 'text-red-500'}">
                Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent}%)
              </div>
            </div>
          </div>
        `
      }
    },
    theme: {
      mode: 'dark'
    },
    grid: {
      show: true,
      borderColor: '#374151',
      strokeDashArray: 1
    }
  }

  // Volume chart options
  const volumeOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 100,
      brush: {
        enabled: true,
        target: 'candlestick-chart'
      },
      selection: {
        enabled: true,
        xaxis: {
          min: candlestickData.length > 0 ? candlestickData[0].x : undefined,
          max: candlestickData.length > 0 ? candlestickData[candlestickData.length - 1].x : undefined
        }
      }
    },
    colors: ['#6366f1'],
    plotOptions: {
      bar: {
        columnWidth: '80%'
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      type: 'datetime',
      axisBorder: {
        offsetX: 13
      }
    },
    yaxis: {
      labels: {
        show: false
      }
    },
    tooltip: {
      enabled: false
    }
  }

  // Update chart when symbol or timeframe changes
  useEffect(() => {
    if (chartState.activeSymbol !== symbol) {
      updateChartState({ activeSymbol: symbol })
    }
    fetchChartData()
  }, [symbol, chartState.timeframe])

  // Subscribe to chart events
  useEffect(() => {
    const subscription = subscribeToEvent('chart.indicator_change', (data) => {
      if (data.symbol === symbol) {
        // Handle indicator changes
        console.log('Indicator changed:', data)
      }
    })
    
    return subscription.unsubscribe
  }, [symbol, subscribeToEvent])

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>Loading Chart...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {symbol}
            {error && <Badge variant="destructive">Mock Data</Badge>}
          </CardTitle>
          {showControls && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{symbol}</Badge>
              <Badge variant="secondary">{chartState.timeframe}</Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Candlestick Chart */}
          <div className="w-full">
            <Chart
              ref={chartRef}
              options={chartOptions}
              series={[{
                name: 'Price',
                data: candlestickData
              }]}
              type="candlestick"
              height={height}
            />
          </div>
          
          {/* Volume Chart */}
          {showVolume && volumeData.length > 0 && (
            <div className="w-full">
              <Chart
                options={volumeOptions}
                series={[{
                  name: 'Volume',
                  data: volumeData
                }]}
                type="bar"
                height={100}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}