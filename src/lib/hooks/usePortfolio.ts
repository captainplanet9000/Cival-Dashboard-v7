'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

export interface PortfolioHolding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

export interface StrategyPerformance {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped';
  totalReturn: number;
  trades: number;
  winRate: number;
  allocation: number;
  avgHoldTime: string;
  lastTrade: string;
}

export interface SystemComponent {
  name: string;
  status: 'online' | 'warning' | 'error';
  uptime: string;
  lastCheck: string;
}

export interface PortfolioMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  volatility: number;
  sortino: number;
  beta: number;
}

export interface PortfolioData {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  lastUpdated: string;
  metrics: PortfolioMetrics;
  holdings: PortfolioHolding[];
  strategies: StrategyPerformance[];
  systemHealth: {
    overall: string;
    components: SystemComponent[];
  };
}

export interface PortfolioState {
  data: PortfolioData | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

export interface UsePortfolioReturn extends PortfolioState {
  refresh: () => Promise<void>;
  updatePortfolio: (action: string, symbol: string, quantity: number, price: number) => Promise<boolean>;
  isStale: boolean;
}

const PORTFOLIO_API_BASE = '/api/portfolio';
const REFRESH_INTERVAL = 30000; // 30 seconds
const STALE_THRESHOLD = 60000; // 1 minute

export function usePortfolio(autoRefresh: boolean = true): UsePortfolioReturn {
  const [state, setState] = useState<PortfolioState>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
  });

  const fetchPortfolioData = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(PORTFOLIO_API_BASE, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio data: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch portfolio data');
      }

      setState(prev => ({
        ...prev,
        data: result.data,
        loading: false,
        error: null,
        lastFetch: new Date(),
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Portfolio fetch error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      toast.error(`Failed to load portfolio data: ${errorMessage}`);
    }
  }, []);

  const updatePortfolio = useCallback(async (
    action: string,
    symbol: string,
    quantity: number,
    price: number
  ): Promise<boolean> => {
    try {
      const response = await fetch(PORTFOLIO_API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, symbol, quantity, price }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update portfolio: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update portfolio');
      }

      toast.success(result.message || 'Portfolio updated successfully');
      
      // Refresh data after update
      await fetchPortfolioData();
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Portfolio update error:', errorMessage);
      toast.error(`Failed to update portfolio: ${errorMessage}`);
      return false;
    }
  }, [fetchPortfolioData]);

  // Check if data is stale
  const isStale = useCallback((): boolean => {
    if (!state.lastFetch) return true;
    return Date.now() - state.lastFetch.getTime() > STALE_THRESHOLD;
  }, [state.lastFetch]);

  // Initial fetch
  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Only fetch if data is stale and not currently loading
      if (isStale() && !state.loading) {
        fetchPortfolioData();
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchPortfolioData, isStale, state.loading]);

  // Focus/visibility change handler for immediate refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isStale() && !state.loading) {
        fetchPortfolioData();
      }
    };

    const handleFocus = () => {
      if (isStale() && !state.loading) {
        fetchPortfolioData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchPortfolioData, isStale, state.loading]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastFetch: state.lastFetch,
    refresh: fetchPortfolioData,
    updatePortfolio,
    isStale: isStale(),
  };
}

export default usePortfolio; 