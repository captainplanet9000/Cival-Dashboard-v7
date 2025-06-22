/**
 * React Hooks for Backend API Integration
 * Provides easy-to-use hooks for connecting React components to the backend
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  backendApi, 
  ApiResponse, 
  PortfolioSummary, 
  Position, 
  TradingSignal, 
  AgentStatus, 
  MarketOverview, 
  PerformanceMetrics,
  HealthCheck 
} from '@/lib/api/backend-client';

// Generic hook for API calls with loading and error states
export function useApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  options: {
    immediate?: boolean;
    refreshInterval?: number;
    retryOnError?: boolean;
    maxRetries?: number;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const maxRetries = options.maxRetries || 3;
  const retryOnError = options.retryOnError !== false;

  const fetchData = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
        setError(null);
      }
      
      const response = await apiCall();
      
      if (response.error) {
        if (retryOnError && retryCount < maxRetries && !isRetry) {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setRetryCount(prev => prev + 1);
          
          retryTimeoutRef.current = setTimeout(() => {
            fetchData(true);
          }, delay);
          
          setError(`${response.error} (retrying in ${delay/1000}s...)`);
        } else {
          setError(response.error);
          setData(null);
          setRetryCount(0);
        }
      } else {
        setData(response.data || null);
        setLastUpdated(new Date());
        setError(null);
        setRetryCount(0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (retryOnError && retryCount < maxRetries && !isRetry) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setRetryCount(prev => prev + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(true);
        }, delay);
        
        setError(`${errorMessage} (retrying in ${delay/1000}s...)`);
      } else {
        setError(errorMessage);
        setData(null);
        setRetryCount(0);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  }, [apiCall, retryOnError, retryCount, maxRetries]);

  const refresh = useCallback(() => {
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (options.immediate !== false) {
      fetchData();
    }
    
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, dependencies);

  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      intervalRef.current = setInterval(() => fetchData(), options.refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData, options.refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refresh,
    lastUpdated,
    retryCount,
    isRetrying: retryCount > 0
  };
}

// Health and System hooks
export function useBackendHealth() {
  return useApiCall(
    () => backendApi.getHealth(),
    [],
    { refreshInterval: 30000 } // Check health every 30 seconds
  );
}

export function useBackendConnection() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [backendUrl, setBackendUrl] = useState(backendApi.getBackendUrl());

  const testConnection = useCallback(async () => {
    const connected = await backendApi.testConnection();
    setIsConnected(connected);
    return connected;
  }, []);

  useEffect(() => {
    testConnection();
    // Test connection every minute
    const interval = setInterval(testConnection, 60000);
    return () => clearInterval(interval);
  }, [testConnection]);

  return {
    isConnected,
    backendUrl,
    testConnection,
    setBackendUrl: (url: string) => {
      backendApi.setBackendUrl(url);
      setBackendUrl(url);
      testConnection();
    }
  };
}

// Portfolio hooks
export function usePortfolioSummary(refreshInterval = 10000) {
  return useApiCall(
    () => backendApi.getPortfolioSummary(),
    [],
    { refreshInterval }
  );
}

export function usePortfolioPositions(refreshInterval = 15000) {
  return useApiCall(
    () => backendApi.getPortfolioPositions(),
    [],
    { refreshInterval }
  );
}

// Market data hooks
export function useMarketOverview(refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getMarketOverview(),
    [],
    { refreshInterval }
  );
}

export function useMarketData(symbol: string, refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getMarketData(symbol),
    [symbol],
    { refreshInterval }
  );
}

// Trading hooks
export function useTradingSignals(refreshInterval = 60000) {
  return useApiCall(
    () => backendApi.getTradingSignals(),
    [],
    { refreshInterval }
  );
}

// Agent hooks
export function useAgentsStatus(refreshInterval = 30000) {
  return useApiCall(
    () => backendApi.getAgentsStatus(),
    [],
    { refreshInterval }
  );
}

// Performance hooks
export function usePerformanceMetrics(refreshInterval = 60000) {
  return useApiCall(
    () => backendApi.getPerformanceMetrics(),
    [],
    { refreshInterval }
  );
}

// Combined dashboard hook for loading all data at once
export function useDashboardData() {
  const portfolioSummary = usePortfolioSummary();
  const portfolioPositions = usePortfolioPositions();
  const marketOverview = useMarketOverview();
  const tradingSignals = useTradingSignals();
  const agentsStatus = useAgentsStatus();
  const performanceMetrics = usePerformanceMetrics();
  const health = useBackendHealth();

  const isLoading = [
    portfolioSummary.loading,
    portfolioPositions.loading,
    marketOverview.loading,
    tradingSignals.loading,
    agentsStatus.loading,
    performanceMetrics.loading
  ].some(loading => loading);

  const hasErrors = [
    portfolioSummary.error,
    portfolioPositions.error,
    marketOverview.error,
    tradingSignals.error,
    agentsStatus.error,
    performanceMetrics.error
  ].some(error => error !== null);

  const refreshAll = useCallback(() => {
    portfolioSummary.refresh();
    portfolioPositions.refresh();
    marketOverview.refresh();
    tradingSignals.refresh();
    agentsStatus.refresh();
    performanceMetrics.refresh();
    health.refresh();
  }, [
    portfolioSummary.refresh,
    portfolioPositions.refresh,
    marketOverview.refresh,
    tradingSignals.refresh,
    agentsStatus.refresh,
    performanceMetrics.refresh,
    health.refresh
  ]);

  return {
    portfolioSummary: portfolioSummary.data,
    portfolioPositions: portfolioPositions.data,
    marketOverview: marketOverview.data,
    tradingSignals: tradingSignals.data,
    agentsStatus: agentsStatus.data,
    performanceMetrics: performanceMetrics.data,
    health: health.data,
    isLoading,
    hasErrors,
    refreshAll,
    errors: {
      portfolioSummary: portfolioSummary.error,
      portfolioPositions: portfolioPositions.error,
      marketOverview: marketOverview.error,
      tradingSignals: tradingSignals.error,
      agentsStatus: agentsStatus.error,
      performanceMetrics: performanceMetrics.error,
      health: health.error
    },
    lastUpdated: {
      portfolioSummary: portfolioSummary.lastUpdated,
      portfolioPositions: portfolioPositions.lastUpdated,
      marketOverview: marketOverview.lastUpdated,
      tradingSignals: tradingSignals.lastUpdated,
      agentsStatus: agentsStatus.lastUpdated,
      performanceMetrics: performanceMetrics.lastUpdated,
      health: health.lastUpdated
    }
  };
}