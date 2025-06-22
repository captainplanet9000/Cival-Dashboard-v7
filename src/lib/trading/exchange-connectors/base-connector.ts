export interface MarketData {
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
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, size]
  asks: [number, number][]; // [price, size]
  timestamp: number;
}

export interface Trade {
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
}

export interface Order extends Trade {
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  filledQuantity: number;
  averagePrice?: number;
  fees: number;
  timestamp: number;
  updateTime: number;
}

export interface Position {
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

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
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

export interface WebSocketConfig {
  url: string;
  subscriptions: string[];
  reconnectInterval?: number;
  maxReconnects?: number;
  heartbeatInterval?: number;
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  sandbox?: boolean;
  testnet?: boolean;
  privateKey?: string; // For Ethereum-based exchanges
}

export abstract class BaseExchangeConnector {
  protected credentials: ExchangeCredentials;
  protected isConnected = false;
  protected websocket?: WebSocket;
  protected reconnectAttempts = 0;
  protected readonly maxReconnects = 5;
  protected heartbeatInterval?: NodeJS.Timeout;

  constructor(credentials: ExchangeCredentials) {
    this.credentials = credentials;
  }

  // Abstract methods that must be implemented by each exchange
  abstract getExchangeInfo(): Promise<ExchangeInfo>;
  abstract getMarketData(symbol: string): Promise<MarketData>;
  abstract getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
  abstract getBalances(): Promise<Balance[]>;
  abstract getPositions(): Promise<Position[]>;
  abstract getOrders(symbol?: string): Promise<Order[]>;
  abstract placeOrder(trade: Trade): Promise<Order>;
  abstract cancelOrder(orderId: string, symbol: string): Promise<boolean>;
  abstract cancelAllOrders(symbol?: string): Promise<boolean>;

  // WebSocket methods
  abstract connectWebSocket(config: WebSocketConfig): Promise<void>;
  abstract subscribeToMarketData(symbols: string[]): Promise<void>;
  abstract subscribeToOrderBook(symbols: string[]): Promise<void>;
  abstract subscribeToTrades(symbols: string[]): Promise<void>;
  abstract subscribeToOrders(): Promise<void>;
  abstract subscribeToPositions(): Promise<void>;

  // Event handlers (can be overridden)
  onMarketDataUpdate?(data: MarketData): void;
  onOrderBookUpdate?(data: OrderBook): void;
  onTradeUpdate?(data: Trade): void;
  onOrderUpdate?(data: Order): void;
  onPositionUpdate?(data: Position): void;
  onError?(error: Error): void;
  onConnect?(): void;
  onDisconnect?(): void;

  // Common utility methods
  protected formatSymbol(symbol: string): string {
    // Override in specific implementations
    return symbol;
  }

  protected validateCredentials(): boolean {
    return !!(this.credentials.apiKey && this.credentials.apiSecret);
  }

  protected async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    params?: any,
    body?: any
  ): Promise<any> {
    // Override in specific implementations for authentication
    throw new Error('makeRequest must be implemented by specific exchange connector');
  }

  protected createSignature(
    timestamp: string,
    method: string,
    endpoint: string,
    body?: string
  ): string {
    // Override in specific implementations
    throw new Error('createSignature must be implemented by specific exchange connector');
  }

  // Connection management
  async connect(): Promise<boolean> {
    try {
      if (!this.validateCredentials()) {
        throw new Error('Invalid credentials provided');
      }

      // Test connection with a simple API call
      await this.getExchangeInfo();
      this.isConnected = true;
      this.onConnect?.();
      return true;
    } catch (error) {
      this.onError?.(error as Error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    this.onDisconnect?.();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Helper methods for standardizing data formats
  protected standardizeMarketData(rawData: any): MarketData {
    // Override in specific implementations
    throw new Error('standardizeMarketData must be implemented by specific exchange connector');
  }

  protected standardizeOrderBook(rawData: any): OrderBook {
    // Override in specific implementations
    throw new Error('standardizeOrderBook must be implemented by specific exchange connector');
  }

  protected standardizeOrder(rawData: any): Order {
    // Override in specific implementations
    throw new Error('standardizeOrder must be implemented by specific exchange connector');
  }

  protected standardizePosition(rawData: any): Position {
    // Override in specific implementations
    throw new Error('standardizePosition must be implemented by specific exchange connector');
  }

  protected standardizeBalance(rawData: any): Balance {
    // Override in specific implementations
    throw new Error('standardizeBalance must be implemented by specific exchange connector');
  }
}

export default BaseExchangeConnector; 