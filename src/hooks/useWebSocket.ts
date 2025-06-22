/**
 * React Hooks for WebSocket Integration
 * Provides easy-to-use hooks for real-time data in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TradingWebSocketClient, 
  WebSocketMessage, 
  createWebSocketClient,
  getDefaultWebSocketClient 
} from '@/lib/websocket/websocket-client';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const clientRef = useRef<TradingWebSocketClient | null>(null);
  const {
    autoConnect = true,
    reconnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options;

  // Initialize client
  useEffect(() => {
    clientRef.current = getDefaultWebSocketClient();
    
    const client = clientRef.current;
    
    // Set up event handlers
    const unsubscribeConnect = client.onConnect(() => {
      setIsConnected(true);
      setConnectionState(client.connectionState);
      setError(null);
      onConnect?.();
    });

    const unsubscribeDisconnect = client.onDisconnect(() => {
      setIsConnected(false);
      setConnectionState(client.connectionState);
      onDisconnect?.();
    });

    const unsubscribeError = client.onError((errorEvent) => {
      setError('WebSocket connection error');
      onError?.(errorEvent);
    });

    const unsubscribeMessages = client.on('*', (message) => {
      setLastMessage(message);
      onMessage?.(message);
    });

    // Auto-connect if enabled
    if (autoConnect && !client.isConnected) {
      client.connect().catch(err => {
        setError(err.message || 'Failed to connect');
      });
    }

    // Cleanup on unmount
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      unsubscribeMessages();
    };
  }, [autoConnect, onMessage, onConnect, onDisconnect, onError]);

  // Update connection state
  useEffect(() => {
    const interval = setInterval(() => {
      if (clientRef.current) {
        setConnectionState(clientRef.current.connectionState);
        setIsConnected(clientRef.current.isConnected);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback(async () => {
    if (clientRef.current && !clientRef.current.isConnected) {
      try {
        await clientRef.current.connect();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  const sendMessage = useCallback((type: string, data: any = {}) => {
    if (clientRef.current) {
      return clientRef.current.send(type, data);
    }
    return false;
  }, []);

  return {
    isConnected,
    connectionState,
    error,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    client: clientRef.current
  };
}

// Hook for portfolio real-time updates
export function usePortfolioWebSocket() {
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected, error, sendMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'portfolio_update') {
        setPortfolioData(message.data);
        setLastUpdate(new Date());
      }
    }
  });

  const subscribeToPortfolio = useCallback(() => {
    sendMessage('subscribe', { channels: ['portfolio'] });
  }, [sendMessage]);

  useEffect(() => {
    if (isConnected) {
      subscribeToPortfolio();
    }
  }, [isConnected, subscribeToPortfolio]);

  return {
    portfolioData,
    lastUpdate,
    isConnected,
    error,
    refresh: subscribeToPortfolio
  };
}

// Hook for agent status real-time updates
export function useAgentsWebSocket() {
  const [agentsData, setAgentsData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected, error, sendMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'agents_update' || message.type === 'agent_update') {
        setAgentsData(message.data);
        setLastUpdate(new Date());
      }
    }
  });

  const subscribeToAgents = useCallback(() => {
    sendMessage('subscribe', { channels: ['agents'] });
  }, [sendMessage]);

  useEffect(() => {
    if (isConnected) {
      subscribeToAgents();
    }
  }, [isConnected, subscribeToAgents]);

  return {
    agentsData,
    lastUpdate,
    isConnected,
    error,
    refresh: subscribeToAgents
  };
}

// Hook for market data real-time updates
export function useMarketWebSocket() {
  const [marketData, setMarketData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected, error, sendMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'market_update') {
        setMarketData(message.data);
        setLastUpdate(new Date());
      }
    }
  });

  const subscribeToMarket = useCallback(() => {
    sendMessage('subscribe', { channels: ['market'] });
  }, [sendMessage]);

  useEffect(() => {
    if (isConnected) {
      subscribeToMarket();
    }
  }, [isConnected, subscribeToMarket]);

  return {
    marketData,
    lastUpdate,
    isConnected,
    error,
    refresh: subscribeToMarket
  };
}

// Hook for trading signals real-time updates
export function useTradingSignalsWebSocket() {
  const [signals, setSignals] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { isConnected, error, sendMessage } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'trading_signal') {
        setSignals(prev => [message.data, ...prev.slice(0, 9)]); // Keep last 10 signals
        setLastUpdate(new Date());
      }
    }
  });

  const subscribeToSignals = useCallback(() => {
    sendMessage('subscribe', { channels: ['signals'] });
  }, [sendMessage]);

  useEffect(() => {
    if (isConnected) {
      subscribeToSignals();
    }
  }, [isConnected, subscribeToSignals]);

  return {
    signals,
    lastUpdate,
    isConnected,
    error,
    refresh: subscribeToSignals
  };
}

// Combined hook for all real-time data
export function useRealTimeData() {
  const portfolio = usePortfolioWebSocket();
  const agents = useAgentsWebSocket();
  const market = useMarketWebSocket();
  const signals = useTradingSignalsWebSocket();

  const { isConnected, connectionState, error, connect, disconnect } = useWebSocket();

  return {
    portfolio: portfolio.portfolioData,
    agents: agents.agentsData,
    market: market.marketData,
    signals: signals.signals,
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    lastUpdated: {
      portfolio: portfolio.lastUpdate,
      agents: agents.lastUpdate,
      market: market.lastUpdate,
      signals: signals.lastUpdate
    }
  };
}