'use client';

import React, { useState, useEffect } from 'react';
import { useDashboardData, useBackendConnection } from "@/hooks/useBackendApi";
import { useRealTimeData } from "@/hooks/useWebSocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Globe,
  ArrowUpDown,
  PlusCircle,
  Settings,
  Target
} from 'lucide-react';
import { formatPrice, formatPercentage } from "@/lib/utils";
import useTradingData from '@/lib/hooks/useTradingData';
import { toast } from 'react-hot-toast';

export default function TradingPage() {
  // Real-time API integration
  const { portfolioSummary, portfolioPositions, tradingSignals, isLoading } = useDashboardData();
  const { isConnected } = useBackendConnection();
  const { 
    portfolio: realtimePortfolio, 
    signals: realtimeSignals, 
    market: realtimeMarket,
    isConnected: wsConnected 
  } = useRealTimeData();

  // Use real-time data when available, fallback to API data
  const currentPortfolio = realtimePortfolio || portfolioSummary;
  const currentSignals = realtimeSignals || tradingSignals;

  const {
    portfolio,
    portfolioLoading,
    portfolioError,
    marketData,
    marketDataLoading,
    exchanges,
    strategies,
    arbitrageOpportunities,
    healthStatus,
    refreshPortfolio,
    refreshMarketData,
    findArbitrageOpportunities,
    placeOrder,
    cancelOrder,
    addStrategy,
    updateStrategy,
    lastFetch,
    isStale
  } = useTradingData();

  // Order form state
  const [orderForm, setOrderForm] = useState({
    symbol: 'BTC',
    side: 'buy' as 'buy' | 'sell',
    type: 'limit' as 'market' | 'limit',
    quantity: '',
    price: '',
    exchange: 'hyperliquid'
  });

  // Strategy form state
  const [strategyForm, setStrategyForm] = useState({
    name: '',
    type: 'momentum' as any,
    symbols: 'BTC,ETH',
    allocation: '10',
    exchanges: 'hyperliquid'
  });

  const [selectedSymbol, setSelectedSymbol] = useState('BTC');

  // Load arbitrage opportunities for selected symbol
  useEffect(() => {
    if (selectedSymbol) {
      findArbitrageOpportunities(selectedSymbol);
    }
  }, [selectedSymbol, findArbitrageOpportunities]);

  const handlePlaceOrder = async () => {
    if (!orderForm.quantity || (!orderForm.price && orderForm.type === 'limit')) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const trade = {
        symbol: orderForm.symbol,
        side: orderForm.side,
        type: orderForm.type,
        quantity: parseFloat(orderForm.quantity),
        price: orderForm.type === 'limit' ? parseFloat(orderForm.price) : undefined,
      };

      await placeOrder(trade, orderForm.exchange);
      
      // Reset form
      setOrderForm(prev => ({ ...prev, quantity: '', price: '' }));
    } catch (error) {
      console.error('Order placement failed:', error);
    }
  };

  const handleAddStrategy = async () => {
    if (!strategyForm.name || !strategyForm.symbols) {
      toast.error('Please fill in strategy name and symbols');
      return;
    }

    try {
      const strategy = {
        id: `strategy-${Date.now()}`,
        name: strategyForm.name,
        type: strategyForm.type,
        status: 'active' as any,
        parameters: {},
        targetSymbols: strategyForm.symbols.split(',').map(s => s.trim()),
        exchanges: [strategyForm.exchanges],
        allocation: parseFloat(strategyForm.allocation),
        performanceMetrics: {
          totalReturn: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0,
          totalTrades: 0
        }
      };

      await addStrategy(strategy);
      
      // Reset form
      setStrategyForm({
        name: '',
        type: 'momentum',
        symbols: 'BTC,ETH',
        allocation: '10',
        exchanges: 'hyperliquid'
      });
    } catch (error) {
      console.error('Strategy addition failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Trading Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time trading across multiple exchanges with advanced strategy management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-xs text-muted-foreground">
              Last update: {lastFetch.toLocaleTimeString()}
              {isStale && <span className="text-yellow-600 ml-1">(stale)</span>}
            </span>
          )}
          <Button variant="outline" onClick={refreshPortfolio} disabled={portfolioLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${portfolioLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Exchange Connection Status */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 dark:text-blue-100">Exchange Connections</CardTitle>
            </div>
            {healthStatus && (
              <Badge variant={healthStatus.connectedExchanges?.length > 0 ? "default" : "destructive"}>
                {healthStatus.connectedExchanges?.length || 0} Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {exchanges.map((exchange) => {
              const isConnected = healthStatus?.connectedExchanges?.includes(exchange.name.toLowerCase());
              return (
                <div key={exchange.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                    <div className={`${getStatusColor(isConnected ? 'online' : 'error')}`}>
                      {getStatusIcon(isConnected ? 'online' : 'error')}
                    </div>
                    <div>
                      <p className="font-medium">{exchange.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{exchange.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? 'Connected' : 'Offline'}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exchange.symbols.length} markets
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trading" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trading">Live Trading</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
        </TabsList>

        <TabsContent value="trading" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Market Data */}
            <Card>
              <CardHeader>
                <CardTitle>Live Market Data</CardTitle>
                <CardDescription>Real-time prices from connected exchanges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(marketData).map(([symbol, data]) => (
                    <div key={symbol} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <div className="font-medium">{symbol}</div>
                        {data.exchanges && (
                          <div className="flex space-x-1">
                            {data.exchanges.map(exchange => (
                              <Badge key={exchange} variant="outline" className="text-xs">
                                {exchange}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(data.price)}</div>
                        <div className={`text-sm ${data.changePercent24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {data.changePercent24h >= 0 ? '+' : ''}{data.changePercent24h.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(marketData).length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No market data available. Check exchange connections.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Placement */}
            <Card>
              <CardHeader>
                <CardTitle>Place Order</CardTitle>
                <CardDescription>Execute trades across connected exchanges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Select value={orderForm.symbol} onValueChange={(value) => setOrderForm(prev => ({ ...prev, symbol: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(marketData).map(symbol => (
                          <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                        ))}
                        {Object.keys(marketData).length === 0 && (
                          <>
                            <SelectItem value="BTC">BTC</SelectItem>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="SOL">SOL</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="exchange">Exchange</Label>
                    <Select value={orderForm.exchange} onValueChange={(value) => setOrderForm(prev => ({ ...prev, exchange: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange.name} value={exchange.name.toLowerCase()}>
                            {exchange.name}
                          </SelectItem>
                        ))}
                        {exchanges.length === 0 && (
                          <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="side">Side</Label>
                    <Select value={orderForm.side} onValueChange={(value) => setOrderForm(prev => ({ ...prev, side: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={orderForm.type} onValueChange={(value) => setOrderForm(prev => ({ ...prev, type: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="0.001"
                      value={orderForm.quantity}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm(prev => ({ ...prev, quantity: e.target.value }))}
                    />
                  </div>
                  
                  {orderForm.type === 'limit' && (
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="50000"
                        value={orderForm.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderForm(prev => ({ ...prev, price: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <Button onClick={handlePlaceOrder} className="w-full" disabled={!orderForm.quantity}>
                  <Zap className="mr-2 h-4 w-4" />
                  Place {orderForm.side.charAt(0).toUpperCase() + orderForm.side.slice(1)} Order
                </Button>

                <p className="text-xs text-muted-foreground">
                  ⚠️ This will place a real order on the selected exchange. Make sure all parameters are correct.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          {portfolioError ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <p className="text-red-800">Error loading portfolio: {portfolioError}</p>
              </CardContent>
            </Card>
          ) : portfolio ? (
            <>
              {/* Portfolio Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPrice(portfolio.totalValue)}</div>
                    <p className={`text-xs ${portfolio.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {portfolio.totalPnL >= 0 ? '+' : ''}{formatPrice(portfolio.totalPnL)} ({formatPercentage(portfolio.totalPnLPercent / 100)})
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolio.activeOrders.length}</div>
                    <p className="text-xs text-muted-foreground">
                      Across {portfolio.connectedExchanges.length} exchanges
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Strategies</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{portfolio.strategies.filter(s => s.status === 'active').length}</div>
                    <p className="text-xs text-muted-foreground">
                      {portfolio.strategies.length} total strategies
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Balances by Exchange */}
              <Card>
                <CardHeader>
                  <CardTitle>Balances by Exchange</CardTitle>
                  <CardDescription>Your account balances across all connected exchanges</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(portfolio.balancesByExchange).map(([exchange, balances]) => (
                      <div key={exchange} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3 capitalize">{exchange}</h3>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {balances.map((balance) => (
                            <div key={balance.asset} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="font-medium">{balance.asset}</span>
                              <div className="text-right">
                                <div className="font-semibold">{balance.total.toFixed(4)}</div>
                                {balance.usdValue && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatPrice(balance.usdValue)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading portfolio data...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Strategy List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Strategies</CardTitle>
                <CardDescription>Your automated trading strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategies.map((strategy) => (
                    <div key={strategy.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{strategy.name}</h3>
                        <Badge variant={strategy.status === 'active' ? "default" : "secondary"}>
                          {strategy.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span> {strategy.type}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Allocation:</span> {strategy.allocation}%
                        </div>
                        <div>
                          <span className="text-muted-foreground">Return:</span>
                          <span className={strategy.performanceMetrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {strategy.performanceMetrics.totalReturn.toFixed(2)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Trades:</span> {strategy.performanceMetrics.totalTrades}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={() => updateStrategy(strategy.id, { status: strategy.status === 'active' ? 'paused' : 'active' })}>
                          {strategy.status === 'active' ? 'Pause' : 'Resume'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {strategies.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No strategies configured yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Strategy */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Strategy</CardTitle>
                <CardDescription>Create an automated trading strategy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="strategy-name">Strategy Name</Label>
                  <Input
                    id="strategy-name"
                    placeholder="My Momentum Strategy"
                    value={strategyForm.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrategyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="strategy-type">Strategy Type</Label>
                  <Select value={strategyForm.type} onValueChange={(value) => setStrategyForm(prev => ({ ...prev, type: value as any }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="momentum">Momentum</SelectItem>
                      <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                      <SelectItem value="arbitrage">Arbitrage</SelectItem>
                      <SelectItem value="grid">Grid Trading</SelectItem>
                      <SelectItem value="dca">DCA (Dollar Cost Average)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="strategy-symbols">Symbols (comma-separated)</Label>
                  <Input
                    id="strategy-symbols"
                    placeholder="BTC,ETH,SOL"
                    value={strategyForm.symbols}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrategyForm(prev => ({ ...prev, symbols: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="strategy-allocation">Allocation (%)</Label>
                    <Input
                      id="strategy-allocation"
                      type="number"
                      placeholder="10"
                      value={strategyForm.allocation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStrategyForm(prev => ({ ...prev, allocation: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="strategy-exchange">Exchange</Label>
                    <Select value={strategyForm.exchanges} onValueChange={(value) => setStrategyForm(prev => ({ ...prev, exchanges: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map(exchange => (
                          <SelectItem key={exchange.name} value={exchange.name.toLowerCase()}>
                            {exchange.name}
                          </SelectItem>
                        ))}
                        {exchanges.length === 0 && (
                          <SelectItem value="hyperliquid">Hyperliquid</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleAddStrategy} className="w-full" disabled={!strategyForm.name}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Strategy
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="arbitrage" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Arbitrage Opportunities</CardTitle>
                  <CardDescription>Price differences across exchanges</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(marketData).map(symbol => (
                        <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                      ))}
                      {Object.keys(marketData).length === 0 && (
                        <>
                          <SelectItem value="BTC">BTC</SelectItem>
                          <SelectItem value="ETH">ETH</SelectItem>
                          <SelectItem value="SOL">SOL</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => findArbitrageOpportunities(selectedSymbol)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {arbitrageOpportunities.map((opportunity, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{opportunity.symbol} Arbitrage</h3>
                      <Badge variant="default" className="bg-green-500">
                        +{opportunity.profitPercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Buy on:</span>
                        <div className="font-medium">{opportunity.buyExchange}</div>
                        <div className="text-green-600">{formatPrice(opportunity.buyPrice)}</div>
                      </div>
                      <div className="text-center">
                        <ArrowUpDown className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <div className="font-medium">Profit</div>
                        <div className="text-green-600 font-semibold">{formatPrice(opportunity.profit)}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground">Sell on:</span>
                        <div className="font-medium">{opportunity.sellExchange}</div>
                        <div className="text-red-600">{formatPrice(opportunity.sellPrice)}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      Execute Arbitrage
                    </Button>
                  </div>
                ))}
                
                {arbitrageOpportunities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No arbitrage opportunities found for {selectedSymbol}</p>
                    <p className="text-xs mt-1">This could mean markets are efficient or exchanges aren't connected.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 