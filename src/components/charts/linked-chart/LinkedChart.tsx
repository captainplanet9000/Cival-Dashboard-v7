'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CryptoChart } from '../crypto-charts/CryptoChart'
// DataTable component inline to avoid import issues
import { useAppStore } from '@/lib/stores/app-store'
import { useAGUIProtocol } from '@/lib/ag-ui-protocol-v2'
import { useCryptoChart } from '../crypto-charts/hooks/useCryptoChart'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Table, 
  Maximize2, 
  Minimize2,
  RefreshCw,
  Download,
  Settings
} from 'lucide-react'
// Types inline to avoid import issues
type CrosshairData = any
type TimeFrame = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface LinkedChartProps {
  symbols?: string[]
  defaultSymbol?: string
  height?: number
  showTable?: boolean
  showControls?: boolean
  className?: string
  onDataSelect?: (data: any) => void
}

export interface TableRow {
  id: string
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  marketCap?: number
  lastUpdate: Date
}

export function LinkedChart({
  symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT'],
  defaultSymbol = 'BTCUSDT',
  height = 400,
  showTable = true,
  showControls = true,
  className,
  onDataSelect
}: LinkedChartProps) {
  const { chartState, updateChartState } = useAppStore()
  const { publishEvent, subscribeToEvent } = useAGUIProtocol()
  
  const [activeSymbol, setActiveSymbol] = useState(defaultSymbol)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<string | null>(null)
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(null)
  const [tableData, setTableData] = useState<TableRow[]>([])
  const [viewMode, setViewMode] = useState<'split' | 'chart' | 'table'>('split')
  
  // Use crypto chart hook for the active symbol
  const chartHook = useCryptoChart({
    symbol: activeSymbol,
    autoRefresh: true,
    refreshInterval: 30000
  })

  // Generate table data from symbols
  const generateTableData = useCallback((): TableRow[] => {
    return symbols.map((symbol, index) => {
      // Mock data for now - in production, this would come from real market data
      const basePrice = symbol.includes('BTC') ? 45000 
        : symbol.includes('ETH') ? 3000
        : symbol.includes('BNB') ? 300
        : symbol.includes('ADA') ? 0.5
        : symbol.includes('XRP') ? 0.6
        : symbol.includes('SOL') ? 100
        : 50

      const change = (Math.random() - 0.5) * basePrice * 0.1
      const price = basePrice + change
      const changePercent = (change / basePrice) * 100
      const volume = Math.random() * 1000000 + 100000

      return {
        id: `${symbol}-${index}`,
        symbol,
        price,
        change,
        changePercent,
        volume,
        marketCap: price * volume * 10, // Mock market cap
        lastUpdate: new Date()
      }
    })
  }, [symbols])

  // Handle symbol selection from table
  const handleRowSelect = useCallback((row: TableRow) => {
    setActiveSymbol(row.symbol)
    setSelectedRow(row.id)
    updateChartState({ activeSymbol: row.symbol })
    
    // Publish selection event
    publishEvent('linked_chart.symbol_selected', {
      symbol: row.symbol,
      price: row.price,
      source: 'table'
    })
    
    onDataSelect?.(row)
  }, [updateChartState, publishEvent, onDataSelect])

  // Handle crosshair data from chart
  const handleCrosshairMove = useCallback((data: CrosshairData) => {
    setCrosshairData(data)
    
    // Publish crosshair event
    publishEvent('linked_chart.crosshair_move', {
      symbol: activeSymbol,
      ...data
    })
  }, [activeSymbol, publishEvent])

  // Update table data periodically
  useEffect(() => {
    const updateData = () => {
      setTableData(generateTableData())
    }
    
    updateData() // Initial load
    const interval = setInterval(updateData, 30000) // Update every 30 seconds
    
    return () => clearInterval(interval)
  }, [generateTableData])

  // Subscribe to AG-UI events
  useEffect(() => {
    const unsubscribes = [
      subscribeToEvent('chart.symbol_changed', (data) => {
        if (symbols.includes(data.newSymbol)) {
          setActiveSymbol(data.newSymbol)
          setSelectedRow(`${data.newSymbol}-${symbols.indexOf(data.newSymbol)}`)
        }
      }),
      
      subscribeToEvent('market_data.price_update', (data) => {
        if (symbols.includes(data.symbol)) {
          // Update table data with real-time price
          setTableData(prev => prev.map(row => 
            row.symbol === data.symbol 
              ? { ...row, price: data.price, lastUpdate: new Date() }
              : row
          ))
        }
      })
    ]
    
    return () => unsubscribes.forEach(unsub => unsub.unsubscribe())
  }, [symbols, subscribeToEvent])

  // Table columns configuration
  const tableColumns = [
    {
      key: 'symbol',
      label: 'Symbol',
      sortable: true,
      render: (row: TableRow) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.symbol}</span>
          {row.symbol === activeSymbol && (
            <Badge variant="default" className="text-xs">Active</Badge>
          )}
        </div>
      )
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      render: (row: TableRow) => (
        <span className="font-mono">${row.price.toFixed(2)}</span>
      )
    },
    {
      key: 'change',
      label: '24h Change',
      sortable: true,
      render: (row: TableRow) => (
        <div className={cn(
          "flex flex-col",
          row.change >= 0 ? "text-green-500" : "text-red-500"
        )}>
          <span className="font-mono">
            {row.change >= 0 ? '+' : ''}${row.change.toFixed(2)}
          </span>
          <span className="text-xs">
            {row.changePercent >= 0 ? '+' : ''}{row.changePercent.toFixed(2)}%
          </span>
        </div>
      )
    },
    {
      key: 'volume',
      label: 'Volume',
      sortable: true,
      render: (row: TableRow) => (
        <span className="font-mono text-sm">
          {(row.volume / 1000000).toFixed(2)}M
        </span>
      )
    },
    {
      key: 'marketCap',
      label: 'Market Cap',
      sortable: true,
      render: (row: TableRow) => (
        <span className="font-mono text-sm">
          ${row.marketCap ? (row.marketCap / 1000000000).toFixed(2) + 'B' : 'N/A'}
        </span>
      )
    }
  ]

  const handleRefresh = () => {
    chartHook.refetch()
    setTableData(generateTableData())
    publishEvent('linked_chart.data_refreshed', { symbols, activeSymbol })
  }

  const handleExport = () => {
    const csvData = tableData.map(row => ({
      Symbol: row.symbol,
      Price: row.price,
      Change: row.change,
      'Change %': row.changePercent,
      Volume: row.volume,
      'Market Cap': row.marketCap,
      'Last Update': row.lastUpdate.toISOString()
    }))
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `crypto-data-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={cn("w-full", isFullscreen && "fixed inset-0 z-50", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Linked Chart & Data Table
            {chartHook.error && <Badge variant="outline">Mock Data</Badge>}
          </CardTitle>
          
          {showControls && (
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border bg-background">
                <Button
                  variant={viewMode === 'split' ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none first:rounded-l-lg"
                  onClick={() => setViewMode('split')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'chart' ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setViewMode('chart')}
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none last:rounded-r-lg"
                  onClick={() => setViewMode('table')}
                >
                  <Table className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
            {/* Chart Section */}
            <div className="space-y-4">
              <CryptoChart
                symbol={activeSymbol}
                height={height}
                showControls={true}
                showVolume={true}
                onCrosshairMove={handleCrosshairMove}
              />
              
              {/* Crosshair Data Display */}
              {crosshairData && (
                <Card className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Open: ${crosshairData.open.toFixed(2)}</div>
                    <div>High: ${crosshairData.high.toFixed(2)}</div>
                    <div>Low: ${crosshairData.low.toFixed(2)}</div>
                    <div>Close: ${crosshairData.close.toFixed(2)}</div>
                    <div className="col-span-2">
                      Volume: {crosshairData.volume?.toFixed(0) || 'N/A'}
                    </div>
                    <div className={cn(
                      "col-span-2",
                      crosshairData.change >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      Change: {crosshairData.change >= 0 ? '+' : ''}{crosshairData.change.toFixed(2)} 
                      ({crosshairData.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </Card>
              )}
            </div>
            
            {/* Table Section */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <p className="text-muted-foreground">Data table placeholder</p>
              </div>
            </div>
          </div>
        )}
        
        {viewMode === 'chart' && (
          <div className="p-6">
            <CryptoChart
              symbol={activeSymbol}
              height={isFullscreen ? window.innerHeight - 200 : height * 1.5}
              showControls={true}
              showVolume={true}
              onCrosshairMove={handleCrosshairMove}
            />
          </div>
        )}
        
        {viewMode === 'table' && showTable && (
          <div className="p-6">
            <div className="border rounded-lg p-4">
              <p className="text-muted-foreground">Data table placeholder</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}