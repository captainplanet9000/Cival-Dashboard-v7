/**
 * Advanced Trading Interface Component
 * Order placement, management, and execution with AG-UI integration
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  Calculator
} from 'lucide-react'

// AG-UI Protocol integration - Mock implementation
import { subscribe, emit, type TradingEvents } from '@/lib/ag-ui-protocol-v2'

// Trading Types
interface TradingPair {
  symbol: string
  baseAsset: string
  quoteAsset: string
  currentPrice: number
  change24h: number
  volume24h: number
  minOrderSize: number
  maxOrderSize: number
  tickSize: number
  stepSize: number
  exchange: string
}

interface OrderBook {
  symbol: string
  bids: [number, number][] // [price, quantity]
  asks: [number, number][]
  timestamp: number
  source: string
}

interface Order {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  quantity: number
  price?: number
  stopPrice?: number
  status: 'pending' | 'filled' | 'cancelled' | 'rejected' | 'partial'
  fillPrice?: number
  fillQuantity?: number
  exchange: string
  timeInForce: 'GTC' | 'IOC' | 'FOK'
  timestamp: number
  fees?: number
}

interface MarketData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  high24h: number
  low24h: number
  timestamp: number
  source: string
}

interface PortfolioBalance {
  asset: string
  free: number
  locked: number
  total: number
  usdValue: number
}

export function TradingInterface() {
  // State Management
  const [selectedPair, setSelectedPair] = useState<TradingPair | null>(null)
  const [tradingPairs, setTradingPairs] = useState<TradingPair[]>([])
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [marketData, setMarketData] = useState<MarketData | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [balances, setBalances] = useState<PortfolioBalance[]>([])
  
  // Order Form State
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop' | 'stop_limit'>('limit')
  const [quantity, setQuantity] = useState('')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK'>('GTC')
  const [usePercentage, setUsePercentage] = useState(false)
  const [percentageAmount, setPercentageAmount] = useState([25])
  const [selectedExchange, setSelectedExchange] = useState('auto')
  
  // UI State
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // AG-UI Event Subscriptions
  useEffect(() => {
    // Subscribe to order updates
    const orderSub = subscribe('trade.order_placed', (event) => {
      const orderData = event.data
      const newOrder: Order = {
        id: orderData.order_id,
        symbol: orderData.symbol,
        side: orderData.side as 'buy' | 'sell',
        type: 'market' as const,
        quantity: 0, // Will be updated when filled
        status: 'pending' as const,
        price: 0, // Will be updated when filled
        exchange: 'default',
        timeInForce: 'GTC' as const,
        timestamp: Date.now()
      }
      setOrders(prev => [newOrder, ...prev])
      setOrderError(null)
    })

    const orderFillSub = subscribe('trade.order_filled', (event) => {
      const { order_id, fill_price, quantity, fees } = event.data
      setOrders(prev => prev.map(order => 
        order.id === order_id ? {
          ...order,
          status: 'filled',
          fillPrice: fill_price,
          fillQuantity: quantity,
          fees: fees
        } : order
      ))
    })

    const orderCancelSub = subscribe('trade.order_cancelled', (event) => {
      const { order_id, reason } = event.data
      setOrders(prev => prev.map(order => 
        order.id === order_id ? { ...order, status: 'cancelled' } : order
      ))
    })

    // Subscribe to market data updates
    const marketSub = subscribe('market_data.price_update', (event) => {
      const priceData = event.data as MarketData
      if (selectedPair && priceData.symbol === selectedPair.symbol) {
        setMarketData(priceData)
        setSelectedPair(prev => prev ? {
          ...prev,
          currentPrice: priceData.price,
          change24h: priceData.changePercent24h
        } : null)
      }
    })

    return () => {
      orderSub.unsubscribe()
      orderFillSub.unsubscribe()
      orderCancelSub.unsubscribe()
      marketSub.unsubscribe()
    }
  }, [selectedPair])

  // Data Fetching
  const fetchTradingData = useCallback(async () => {
    try {
      // Fetch trading pairs
      const pairsResponse = await fetch('/api/trading/pairs')
      if (pairsResponse.ok) {
        const pairsData = await pairsResponse.json()
        setTradingPairs(pairsData.pairs || [])
        if (!selectedPair && pairsData.pairs.length > 0) {
          setSelectedPair(pairsData.pairs[0])
        }
      }

      // Fetch active orders
      const ordersResponse = await fetch('/api/trading/orders/active')
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json()
        setOrders(ordersData.orders || [])
      }

      // Fetch balances
      const balancesResponse = await fetch('/api/portfolio/balances')
      if (balancesResponse.ok) {
        const balancesData = await balancesResponse.json()
        setBalances(balancesData.balances || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch trading data:', error)
    }
  }, [selectedPair])

  // Fetch specific symbol data
  const fetchSymbolData = useCallback(async (symbol: string) => {
    try {
      // Fetch order book
      const orderBookResponse = await fetch(`/api/market/orderbook/${symbol}`)
      if (orderBookResponse.ok) {
        const orderBookData = await orderBookResponse.json()
        setOrderBook(orderBookData)
      }

      // Fetch market data
      const marketResponse = await fetch(`/api/market/data/${symbol}`)
      if (marketResponse.ok) {
        const marketDataResponse = await marketResponse.json()
        setMarketData(marketDataResponse)
      }
    } catch (error) {
      console.error('Failed to fetch symbol data:', error)
    }
  }, [])

  // Effects
  useEffect(() => {
    fetchTradingData()
    const interval = setInterval(fetchTradingData, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [fetchTradingData])

  useEffect(() => {
    if (selectedPair) {
      fetchSymbolData(selectedPair.symbol)
      const interval = setInterval(() => fetchSymbolData(selectedPair.symbol), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedPair, fetchSymbolData])

  // Order Management Functions
  const calculateOrderValue = useCallback(() => {
    if (!selectedPair || !quantity) return 0
    const qty = parseFloat(quantity)
    const orderPrice = orderType === 'market' ? selectedPair.currentPrice : parseFloat(price || '0')
    return qty * orderPrice
  }, [selectedPair, quantity, price, orderType])

  const calculateMaxQuantity = useCallback(() => {
    if (!selectedPair || !balances.length) return 0
    
    const relevantBalance = orderSide === 'buy' 
      ? balances.find(b => b.asset === selectedPair.quoteAsset)
      : balances.find(b => b.asset === selectedPair.baseAsset)
    
    if (!relevantBalance) return 0
    
    if (orderSide === 'buy') {
      const orderPrice = orderType === 'market' ? selectedPair.currentPrice : parseFloat(price || '0')
      return orderPrice > 0 ? relevantBalance.free / orderPrice : 0
    } else {
      return relevantBalance.free
    }
  }, [selectedPair, balances, orderSide, orderType, price])

  const handlePercentageChange = useCallback((percentage: number) => {
    const maxQty = calculateMaxQuantity()
    const newQuantity = (maxQty * percentage / 100).toString()
    setQuantity(newQuantity)
  }, [calculateMaxQuantity])

  const validateOrder = useCallback(() => {
    if (!selectedPair) return 'No trading pair selected'
    if (!quantity || parseFloat(quantity) <= 0) return 'Invalid quantity'
    
    const qty = parseFloat(quantity)
    if (qty < selectedPair.minOrderSize) return `Minimum order size: ${selectedPair.minOrderSize}`
    if (qty > selectedPair.maxOrderSize) return `Maximum order size: ${selectedPair.maxOrderSize}`
    
    if (orderType !== 'market' && (!price || parseFloat(price) <= 0)) {
      return 'Invalid price'
    }
    
    if ((orderType === 'stop' || orderType === 'stop_limit') && (!stopPrice || parseFloat(stopPrice) <= 0)) {
      return 'Invalid stop price'
    }
    
    const orderValue = calculateOrderValue()
    const maxValue = calculateMaxQuantity() * (orderType === 'market' ? selectedPair.currentPrice : parseFloat(price || '0'))
    
    if (orderValue > maxValue) return 'Insufficient balance'
    
    return null
  }, [selectedPair, quantity, price, stopPrice, orderType, calculateOrderValue, calculateMaxQuantity])

  const handlePlaceOrder = async () => {
    const validationError = validateOrder()
    if (validationError) {
      setOrderError(validationError)
      return
    }

    setIsPlacingOrder(true)
    setOrderError(null)

    try {
      const orderData = {
        symbol: selectedPair!.symbol,
        side: orderSide,
        type: orderType,
        quantity: parseFloat(quantity),
        ...(orderType !== 'market' && { price: parseFloat(price) }),
        ...(orderType === 'stop' || orderType === 'stop_limit') && { stopPrice: parseFloat(stopPrice) },
        timeInForce,
        exchange: selectedExchange === 'auto' ? undefined : selectedExchange
      }

      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          // Emit order placed event
          emit('trade.order_placed', {
            order_id: result.orderId,
            symbol: orderData.symbol,
            side: orderData.side,
            quantity: orderData.quantity,
            price: orderData.price || selectedPair!.currentPrice
          })
          
          // Clear form
          setQuantity('')
          setPrice('')
          setStopPrice('')
          
          // Refresh data
          await fetchTradingData()
        } else {
          setOrderError(result.message || 'Failed to place order')
        }
      } else {
        setOrderError('Failed to communicate with trading service')
      }
    } catch (error) {
      console.error('Order placement error:', error)
      setOrderError('An unexpected error occurred')
    } finally {
      setIsPlacingOrder(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/trading/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        emit('trade.order_cancelled', { order_id: orderId, reason: 'User cancellation' })
        await fetchTradingData()
      }
    } catch (error) {
      console.error('Order cancellation error:', error)
    }
  }

  // Helper Functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(value)
  }

  const formatNumber = (value: number, decimals: number = 6) => {
    return value.toFixed(decimals).replace(/\.?0+$/, '')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'default'
      case 'pending': case 'partial': return 'secondary'
      case 'cancelled': return 'outline'
      case 'rejected': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'filled': return <CheckCircle className="h-4 w-4" />
      case 'pending': case 'partial': return <Clock className="h-4 w-4" />
      case 'cancelled': case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Trading Interface</h2>
          <p className="text-muted-foreground">Professional trading tools and order management</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchTradingData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Placement Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Place Order</CardTitle>
              <CardDescription>
                {selectedPair ? `${selectedPair.symbol} • ${formatCurrency(selectedPair.currentPrice)}` : 'Select a trading pair'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trading Pair Selection */}
              <div className="space-y-2">
                <Label>Trading Pair</Label>
                <Select
                  value={selectedPair?.symbol || ''}
                  onValueChange={(value) => {
                    const pair = tradingPairs.find(p => p.symbol === value)
                    setSelectedPair(pair || null)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingPairs.map(pair => (
                      <SelectItem key={pair.symbol} value={pair.symbol}>
                        {pair.symbol} • {formatCurrency(pair.currentPrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Side Selection */}
              <div className="flex space-x-2">
                <Button
                  variant={orderSide === 'buy' ? 'default' : 'outline'}
                  onClick={() => setOrderSide('buy')}
                  className="flex-1"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Buy
                </Button>
                <Button
                  variant={orderSide === 'sell' ? 'destructive' : 'outline'}
                  onClick={() => setOrderSide('sell')}
                  className="flex-1"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Sell
                </Button>
              </div>

              {/* Order Type */}
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select value={orderType} onValueChange={(value: any) => setOrderType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                    <SelectItem value="stop_limit">Stop Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Input */}
              {orderType !== 'market' && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="pr-12"
                    />
                    <DollarSign className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Stop Price Input */}
              {(orderType === 'stop' || orderType === 'stop_limit') && (
                <div className="space-y-2">
                  <Label>Stop Price</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={stopPrice}
                      onChange={(e) => setStopPrice(e.target.value)}
                      placeholder="0.00"
                      className="pr-12"
                    />
                    <Target className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}

              {/* Quantity Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Quantity</Label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Use %</span>
                    <Switch
                      checked={usePercentage}
                      onCheckedChange={setUsePercentage}
                    />
                  </div>
                </div>
                
                {usePercentage ? (
                  <div className="space-y-3">
                    <Slider
                      value={percentageAmount}
                      onValueChange={(value) => {
                        setPercentageAmount(value)
                        handlePercentageChange(value[0])
                      }}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>0%</span>
                      <span>{percentageAmount[0]}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                ) : null}
                
                <div className="relative">
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    className="pr-12"
                  />
                  <Calculator className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
                
                {selectedPair && (
                  <div className="text-sm text-muted-foreground">
                    Max: {formatNumber(calculateMaxQuantity())} {selectedPair.baseAsset}
                  </div>
                )}
              </div>

              {/* Order Value */}
              <div className="p-3 bg-muted rounded">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Order Value:</span>
                  <span className="font-bold">{formatCurrency(calculateOrderValue())}</span>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-2">
                <Label>Time in Force</Label>
                <Select value={timeInForce} onValueChange={(value: any) => setTimeInForce(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTC">Good Till Cancelled (GTC)</SelectItem>
                    <SelectItem value="IOC">Immediate or Cancel (IOC)</SelectItem>
                    <SelectItem value="FOK">Fill or Kill (FOK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exchange</Label>
                <Select value={selectedExchange} onValueChange={setSelectedExchange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto Route</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                    <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Error Display */}
              {orderError && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{orderError}</AlertDescription>
                </Alert>
              )}

              {/* Place Order Button */}
              <Button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !selectedPair}
                className="w-full"
                variant={orderSide === 'buy' ? 'default' : 'destructive'}
              >
                {isPlacingOrder ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isPlacingOrder ? 'Placing...' : `${orderSide.toUpperCase()} ${selectedPair?.baseAsset || ''}`}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Market Data and Order Management */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs defaultValue="market" className="space-y-4">
            <TabsList>
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="orders">Open Orders</TabsTrigger>
              <TabsTrigger value="history">Order History</TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Market Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {marketData ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-bold">{formatCurrency(marketData.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h Change:</span>
                          <span className={marketData.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {marketData.changePercent24h >= 0 ? '+' : ''}{marketData.changePercent24h.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h High:</span>
                          <span>{formatCurrency(marketData.high24h)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h Low:</span>
                          <span>{formatCurrency(marketData.low24h)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>24h Volume:</span>
                          <span>{formatNumber(marketData.volume24h, 0)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Select a trading pair to view market data
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Book */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Book</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {orderBook ? (
                      <div className="space-y-4">
                        {/* Asks */}
                        <div>
                          <div className="text-sm font-medium text-red-600 mb-2">Asks</div>
                          <div className="space-y-1">
                            {orderBook.asks.slice(0, 5).map(([price, quantity], index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-red-600">{formatCurrency(price)}</span>
                                <span>{formatNumber(quantity, 4)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bids */}
                        <div>
                          <div className="text-sm font-medium text-green-600 mb-2">Bids</div>
                          <div className="space-y-1">
                            {orderBook.bids.slice(0, 5).map(([price, quantity], index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span className="text-green-600">{formatCurrency(price)}</span>
                                <span>{formatNumber(quantity, 4)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Loading order book...
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Open Orders</CardTitle>
                  <CardDescription>Currently active orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orders.filter(order => order.status === 'pending' || order.status === 'partial').map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                                {order.side.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{order.symbol}</span>
                              <Badge variant="outline">{order.type}</Badge>
                              <Badge variant={getStatusColor(order.status)}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1">{order.status}</span>
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {formatNumber(order.quantity)} • 
                              {order.price && ` Price: ${formatCurrency(order.price)} • `}
                              Exchange: {order.exchange}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {orders.filter(order => order.status === 'pending' || order.status === 'partial').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No open orders
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>Recent order activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {orders.filter(order => order.status === 'filled' || order.status === 'cancelled' || order.status === 'rejected').slice(0, 10).map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant={order.side === 'buy' ? 'default' : 'destructive'}>
                                {order.side.toUpperCase()}
                              </Badge>
                              <span className="font-medium">{order.symbol}</span>
                              <Badge variant="outline">{order.type}</Badge>
                              <Badge variant={getStatusColor(order.status)}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1">{order.status}</span>
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {formatNumber(order.quantity)} • 
                              {order.fillPrice ? ` Fill Price: ${formatCurrency(order.fillPrice)} • ` : (order.price ? ` Price: ${formatCurrency(order.price)} • ` : '')}
                              Exchange: {order.exchange}
                            </div>
                            {order.fees && (
                              <div className="text-sm text-muted-foreground">
                                Fees: {formatCurrency(order.fees)}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {orders.filter(order => order.status === 'filled' || order.status === 'cancelled' || order.status === 'rejected').length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No order history
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default TradingInterface