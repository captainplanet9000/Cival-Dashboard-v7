/**
 * Real-time WebSocket Client for Trading Dashboard
 * Handles live market data, portfolio updates, and agent communications
 */

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
  bid: number;
  ask: number;
  spread: number;
}

export interface PortfolioUpdate {
  totalValue: number;
  cash: number;
  unrealizedPnL: number;
  realizedPnL: number;
  positions: Position[];
  timestamp: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  marketValue: number;
}

export interface AgentUpdate {
  agentId: string;
  status: 'active' | 'paused' | 'error';
  lastAction: string;
  timestamp: number;
  performance: {
    tradesExecuted: number;
    successRate: number;
    pnl: number;
  };
}

export interface TradingSignal {
  id: string;
  agentId: string;
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  price: number;
  quantity: number;
  reasoning: string[];
  timestamp: number;
}

export interface RiskAlert {
  id: string;
  type: 'position_limit' | 'loss_limit' | 'volatility' | 'correlation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  agentId?: string;
  symbol?: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
}

export type WebSocketMessage = 
  | { type: 'market_data'; data: MarketData }
  | { type: 'portfolio_update'; data: PortfolioUpdate }
  | { type: 'agent_update'; data: AgentUpdate }
  | { type: 'trading_signal'; data: TradingSignal }
  | { type: 'risk_alert'; data: RiskAlert }
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'error'; message: string };

export class TradingWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnected = false;
  private subscriptions = new Set<string>();
  
  // Event handlers
  private handlers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url: string = 'ws://localhost:8001/ws/trading') {
    this.url = url;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Initialize handler sets for each message type
    const messageTypes = [
      'market_data', 'portfolio_update', 'agent_update', 
      'trading_signal', 'risk_alert', 'connect', 'disconnect', 'error'
    ];
    
    messageTypes.forEach(type => {
      this.handlers.set(type, new Set());
    });
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected to trading server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit('connect', { timestamp: Date.now() });
          
          // Re-subscribe to previous subscriptions
          this.subscriptions.forEach(subscription => {
            this.send({ type: 'subscribe', channel: subscription });
          });
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket connection closed');
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnect', { timestamp: Date.now() });
          
          // Attempt reconnection
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { message: 'WebSocket connection error' });
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    
    this.ws = null;
    this.isConnected = false;
  }

  /**
   * Subscribe to real-time data channel
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    
    if (this.isConnected) {
      this.send({ type: 'subscribe', channel });
    }
  }

  /**
   * Unsubscribe from data channel
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (this.isConnected) {
      this.send({ type: 'unsubscribe', channel });
    }
  }

  /**
   * Add event listener
   */
  on(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  off(event: string, handler: (data: any) => void): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get connection status
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get subscription list
   */
  get activeSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  // Private methods

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'market_data':
        this.emit('market_data', message.data);
        break;
      case 'portfolio_update':
        this.emit('portfolio_update', message.data);
        break;
      case 'agent_update':
        this.emit('agent_update', message.data);
        break;
      case 'trading_signal':
        this.emit('trading_signal', message.data);
        break;
      case 'risk_alert':
        this.emit('risk_alert', message.data);
        break;
      case 'heartbeat':
        // Heartbeat received, connection is alive
        break;
      case 'error':
        this.emit('error', { message: message.message });
        break;
      default:
        console.warn('Unknown message type:', message);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${event}:`, error);
        }
      });
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent:', data);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: Date.now() });
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        console.error('WebSocket reconnect failed:', error);
      });
    }, delay);
  }
}

// Singleton instance for the dashboard
let wsClient: TradingWebSocketClient | null = null;

export function getWebSocketClient(): TradingWebSocketClient {
  if (!wsClient) {
    wsClient = new TradingWebSocketClient();
  }
  return wsClient;
}

export function disconnectWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}

// React hook for using WebSocket in components
import { useEffect, useState } from 'react';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [client] = useState(() => getWebSocketClient());

  useEffect(() => {
    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    client.on('connect', handleConnect);
    client.on('disconnect', handleDisconnect);

    // Connect if not already connected
    if (!client.connected) {
      client.connect().catch(error => {
        console.error('Failed to connect WebSocket:', error);
      });
    } else {
      setIsConnected(true);
    }

    return () => {
      client.off('connect', handleConnect);
      client.off('disconnect', handleDisconnect);
    };
  }, [client]);

  return {
    client,
    isConnected,
    subscribe: (channel: string) => client.subscribe(channel),
    unsubscribe: (channel: string) => client.unsubscribe(channel),
    on: (event: string, handler: (data: any) => void) => client.on(event, handler),
    off: (event: string, handler: (data: any) => void) => client.off(event, handler)
  };
}

// Market data hooks
export function useMarketData(symbols: string[]) {
  const { client, isConnected } = useWebSocket();
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());

  useEffect(() => {
    if (!isConnected) return;

    const handleMarketData = (data: MarketData) => {
      setMarketData(prev => new Map(prev.set(data.symbol, data)));
    };

    client.on('market_data', handleMarketData);

    // Subscribe to symbols
    symbols.forEach(symbol => {
      client.subscribe(`market_data:${symbol}`);
    });

    return () => {
      client.off('market_data', handleMarketData);
      symbols.forEach(symbol => {
        client.unsubscribe(`market_data:${symbol}`);
      });
    };
  }, [client, isConnected, symbols]);

  return marketData;
}

// Portfolio updates hook
export function usePortfolioUpdates() {
  const { client, isConnected } = useWebSocket();
  const [portfolio, setPortfolio] = useState<PortfolioUpdate | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const handlePortfolioUpdate = (data: PortfolioUpdate) => {
      setPortfolio(data);
    };

    client.on('portfolio_update', handlePortfolioUpdate);
    client.subscribe('portfolio_updates');

    return () => {
      client.off('portfolio_update', handlePortfolioUpdate);
      client.unsubscribe('portfolio_updates');
    };
  }, [client, isConnected]);

  return portfolio;
}

// Trading signals hook
export function useTradingSignals() {
  const { client, isConnected } = useWebSocket();
  const [signals, setSignals] = useState<TradingSignal[]>([]);

  useEffect(() => {
    if (!isConnected) return;

    const handleTradingSignal = (data: TradingSignal) => {
      setSignals(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 signals
    };

    client.on('trading_signal', handleTradingSignal);
    client.subscribe('trading_signals');

    return () => {
      client.off('trading_signal', handleTradingSignal);
      client.unsubscribe('trading_signals');
    };
  }, [client, isConnected]);

  return signals;
}

// Risk alerts hook
export function useRiskAlerts() {
  const { client, isConnected } = useWebSocket();
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);

  useEffect(() => {
    if (!isConnected) return;

    const handleRiskAlert = (data: RiskAlert) => {
      setAlerts(prev => [data, ...prev.slice(0, 19)]); // Keep last 20 alerts
    };

    client.on('risk_alert', handleRiskAlert);
    client.subscribe('risk_alerts');

    return () => {
      client.off('risk_alert', handleRiskAlert);
      client.unsubscribe('risk_alerts');
    };
  }, [client, isConnected]);

  return alerts;
}