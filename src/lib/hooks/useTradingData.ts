'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface TradingMarketData {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
  changePercent24h: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
  exchanges?: string[];
  bestBid?: { price: number; exchange: string };
  bestAsk?: { price: number; exchange: string };
  totalVolume?: number;
}

export interface TradingBalance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
}

export interface TradingPosition {
  symbol: string;
  side: 'long' | 'short' | 'none';
  size: number;
  averagePrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  percentage: number;
  marginUsed: number;
  liquidationPrice?: number;
  timestamp: number;
}

export interface TradingOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  reduceOnly?: boolean;
  postOnly?: boolean;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  averagePrice?: number;
  fees: number;
  timestamp: number;
  updateTime: number;
  exchange?: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  type: 'momentum' | 'mean_reversion' | 'arbitrage' | 'grid' | 'dca';
  status: 'active' | 'paused' | 'stopped';
  parameters: Record<string, any>;
  targetSymbols: string[];
  exchanges: string[];
  allocation: number;
  performanceMetrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
}

export interface ExchangeInfo {
  name: string;
  type: 'spot' | 'futures' | 'dex';
  symbols: string[];
  minOrderSizes: Record<string, number>;
  tickSizes: Record<string, number>;
  fees: {
    maker: number;
    taker: number;
  };
  limits: {
    maxOrderSize: Record<string, number>;
    maxPositions: number;
  };
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercent: number;
}

export interface TradingPortfolio {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  balancesByExchange: Record<string, TradingBalance[]>;
  positionsByExchange: Record<string, TradingPosition[]>;
  activeOrders: TradingOrder[];
  strategies: TradingStrategy[];
  connectedExchanges: string[];
  lastUpdated: string;
}

export interface UseTradingDataReturn {
  // Portfolio data
  portfolio: TradingPortfolio | null;
  portfolioLoading: boolean;
  portfolioError: string | null;
  
  // Market data
  marketData: Record<string, TradingMarketData>;
  marketDataLoading: boolean;
  marketDataError: string | null;
  
  // Exchange info
  exchanges: ExchangeInfo[];
  exchangesLoading: boolean;
  exchangesError: string | null;
  
  // Strategies
  strategies: TradingStrategy[];
  strategiesLoading: boolean;
  strategiesError: string | null;
  
  // Arbitrage opportunities
  arbitrageOpportunities: ArbitrageOpportunity[];
  arbitrageLoading: boolean;
  arbitrageError: string | null;
  
  // Methods
  refreshPortfolio: () => Promise<void>;
  refreshMarketData: (symbol: string, exchange?: string) => Promise<void>;
  refreshExchanges: () => Promise<void>;
  refreshStrategies: () => Promise<void>;
  findArbitrageOpportunities: (symbol: string) => Promise<void>;
  
  // Trading operations
  placeOrder: (trade: Omit<TradingOrder, 'id' | 'status' | 'filledQuantity' | 'fees' | 'timestamp' | 'updateTime'>, exchange?: string) => Promise<TradingOrder>;
  cancelOrder: (orderId: string, symbol: string, exchange: string) => Promise<boolean>;
  
  // Strategy management
  addStrategy: (strategy: TradingStrategy) => Promise<void>;
  updateStrategy: (strategyId: string, updates: Partial<TradingStrategy>) => Promise<void>;
  removeStrategy: (strategyId: string) => Promise<void>;
  
  // Health status
  healthStatus: {
    status: string;
    connectedExchanges: string[];
    cachedSymbols: string[];
    uptime: number;
  } | null;
  
  lastFetch: Date | null;
  isStale: boolean;
}

const TRADING_API_BASE = '/api/trading';
const REFRESH_INTERVAL = 10000; // 10 seconds
const STALE_THRESHOLD = 30000; // 30 seconds

export function useTradingData(autoRefresh: boolean = true): UseTradingDataReturn {
  // Portfolio state
  const [portfolio, setPortfolio] = useState<TradingPortfolio | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Market data state
  const [marketData, setMarketData] = useState<Record<string, TradingMarketData>>({});
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);

  // Exchange info state
  const [exchanges, setExchanges] = useState<ExchangeInfo[]>([]);
  const [exchangesLoading, setExchangesLoading] = useState(false);
  const [exchangesError, setExchangesError] = useState<string | null>(null);

  // Strategies state
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);
  const [strategiesError, setStrategiesError] = useState<string | null>(null);

  // Arbitrage state
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [arbitrageLoading, setArbitrageLoading] = useState(false);
  const [arbitrageError, setArbitrageError] = useState<string | null>(null);

  // Health status
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Generic API request function
  const makeRequest = useCallback(async (endpoint: string, params?: URLSearchParams): Promise<any> => {
    const url = params ? `${TRADING_API_BASE}?${params.toString()}` : TRADING_API_BASE;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    return result.data;
  }, []);

  // POST request function
  const makePostRequest = useCallback(async (action: string, params: any): Promise<any> => {
    const response = await fetch(TRADING_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'API request failed');
    }

    return result.data;
  }, []);

  // Portfolio methods
  const refreshPortfolio = useCallback(async (): Promise<void> => {
    setPortfolioLoading(true);
    setPortfolioError(null);

    try {
      const params = new URLSearchParams({ endpoint: 'portfolio' });
      const data = await makeRequest(TRADING_API_BASE, params);
      setPortfolio(data);
      setLastFetch(new Date());
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setPortfolioError(errorMessage);
      toast.error(`Failed to load portfolio: ${errorMessage}`);
    } finally {
      setPortfolioLoading(false);
    }
  }, [makeRequest]);

  // Market data methods
  const refreshMarketData = useCallback(async (symbol: string, exchange?: string): Promise<void> => {
    setMarketDataLoading(true);
    setMarketDataError(null);

    try {
      const params = new URLSearchParams({ 
        endpoint: 'market-data',
        symbol 
      });
      
      if (exchange) {
        params.set('exchange', exchange);
      }

      const data = await makeRequest(TRADING_API_BASE, params);
      setMarketData(prev => ({ ...prev, [symbol]: data }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMarketDataError(errorMessage);
      console.error(`Failed to load market data for ${symbol}:`, errorMessage);
    } finally {
      setMarketDataLoading(false);
    }
  }, [makeRequest]);

  // Exchange methods
  const refreshExchanges = useCallback(async (): Promise<void> => {
    setExchangesLoading(true);
    setExchangesError(null);

    try {
      const params = new URLSearchParams({ endpoint: 'exchanges' });
      const data = await makeRequest(TRADING_API_BASE, params);
      setExchanges(data.exchanges || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setExchangesError(errorMessage);
      console.error('Failed to load exchanges:', errorMessage);
    } finally {
      setExchangesLoading(false);
    }
  }, [makeRequest]);

  // Strategy methods
  const refreshStrategies = useCallback(async (): Promise<void> => {
    setStrategiesLoading(true);
    setStrategiesError(null);

    try {
      const params = new URLSearchParams({ endpoint: 'strategies' });
      const data = await makeRequest(TRADING_API_BASE, params);
      setStrategies(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setStrategiesError(errorMessage);
      console.error('Failed to load strategies:', errorMessage);
    } finally {
      setStrategiesLoading(false);
    }
  }, [makeRequest]);

  // Arbitrage methods
  const findArbitrageOpportunities = useCallback(async (symbol: string): Promise<void> => {
    setArbitrageLoading(true);
    setArbitrageError(null);

    try {
      const params = new URLSearchParams({ 
        endpoint: 'arbitrage',
        symbol 
      });
      const data = await makeRequest(TRADING_API_BASE, params);
      setArbitrageOpportunities(data || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setArbitrageError(errorMessage);
      console.error(`Failed to find arbitrage opportunities for ${symbol}:`, errorMessage);
    } finally {
      setArbitrageLoading(false);
    }
  }, [makeRequest]);

  // Trading operations
  const placeOrder = useCallback(async (
    trade: Omit<TradingOrder, 'id' | 'status' | 'filledQuantity' | 'fees' | 'timestamp' | 'updateTime'>,
    exchange?: string
  ): Promise<TradingOrder> => {
    try {
      const result = await makePostRequest('place-order', { trade, exchange });
      toast.success('Order placed successfully');
      
      // Refresh portfolio after placing order
      await refreshPortfolio();
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to place order: ${errorMessage}`);
      throw error;
    }
  }, [makePostRequest, refreshPortfolio]);

  const cancelOrder = useCallback(async (orderId: string, symbol: string, exchange: string): Promise<boolean> => {
    try {
      const result = await makePostRequest('cancel-order', { orderId, symbol, exchange });
      toast.success('Order cancelled successfully');
      
      // Refresh portfolio after cancelling order
      await refreshPortfolio();
      
      return result.cancelled;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to cancel order: ${errorMessage}`);
      throw error;
    }
  }, [makePostRequest, refreshPortfolio]);

  // Strategy management
  const addStrategy = useCallback(async (strategy: TradingStrategy): Promise<void> => {
    try {
      await makePostRequest('add-strategy', { strategy });
      toast.success('Strategy added successfully');
      await refreshStrategies();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to add strategy: ${errorMessage}`);
      throw error;
    }
  }, [makePostRequest, refreshStrategies]);

  const updateStrategy = useCallback(async (strategyId: string, updates: Partial<TradingStrategy>): Promise<void> => {
    try {
      await makePostRequest('update-strategy', { strategyId, updates });
      toast.success('Strategy updated successfully');
      await refreshStrategies();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to update strategy: ${errorMessage}`);
      throw error;
    }
  }, [makePostRequest, refreshStrategies]);

  const removeStrategy = useCallback(async (strategyId: string): Promise<void> => {
    try {
      await makePostRequest('remove-strategy', { strategyId });
      toast.success('Strategy removed successfully');
      await refreshStrategies();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to remove strategy: ${errorMessage}`);
      throw error;
    }
  }, [makePostRequest, refreshStrategies]);

  // Health check
  const checkHealth = useCallback(async (): Promise<void> => {
    try {
      const params = new URLSearchParams({ endpoint: 'health' });
      const data = await makeRequest(TRADING_API_BASE, params);
      setHealthStatus(data);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }, [makeRequest]);

  // Check if data is stale
  const isStale = lastFetch ? Date.now() - lastFetch.getTime() > STALE_THRESHOLD : true;

  // Initial load
  useEffect(() => {
    refreshPortfolio();
    refreshExchanges();
    refreshStrategies();
    checkHealth();
    
    // Load market data for popular symbols
    const popularSymbols = ['BTC', 'ETH', 'SOL', 'USDC'];
    popularSymbols.forEach(symbol => {
      refreshMarketData(symbol);
    });
  }, [refreshPortfolio, refreshExchanges, refreshStrategies, checkHealth, refreshMarketData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshPortfolio();
      checkHealth();
      
      // Refresh market data for cached symbols
      Object.keys(marketData).forEach(symbol => {
        refreshMarketData(symbol);
      });
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshPortfolio, checkHealth, marketData, refreshMarketData]);

  // Focus/visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isStale) {
        refreshPortfolio();
        checkHealth();
      }
    };

    const handleFocus = () => {
      if (isStale) {
        refreshPortfolio();
        checkHealth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isStale, refreshPortfolio, checkHealth]);

  return {
    // Portfolio data
    portfolio,
    portfolioLoading,
    portfolioError,
    
    // Market data
    marketData,
    marketDataLoading,
    marketDataError,
    
    // Exchange info
    exchanges,
    exchangesLoading,
    exchangesError,
    
    // Strategies
    strategies,
    strategiesLoading,
    strategiesError,
    
    // Arbitrage opportunities
    arbitrageOpportunities,
    arbitrageLoading,
    arbitrageError,
    
    // Methods
    refreshPortfolio,
    refreshMarketData,
    refreshExchanges,
    refreshStrategies,
    findArbitrageOpportunities,
    
    // Trading operations
    placeOrder,
    cancelOrder,
    
    // Strategy management
    addStrategy,
    updateStrategy,
    removeStrategy,
    
    // Health status
    healthStatus,
    lastFetch,
    isStale,
  };
}

export default useTradingData; 