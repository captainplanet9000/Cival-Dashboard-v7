import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  StrategyInstance,
  Position,
  Order,
  MarketData,
  TradingSignal,
  RiskMetrics,
  PaperTradingAccount,
  TradeExecution,
  PerformanceMetrics,
  StrategyConfig
} from '../types/trading';
import type { ApiResponse, ApiError, PaginatedResponse, FilterOptions, TimeRange } from '../types/common';

interface OrderRequest {
  account_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'bracket' | 'oco' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stop_price?: number;
  strategy_id?: string;
  time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok';
}

interface StrategyRequest {
  name: string;
  strategy_type: 'darvas_box' | 'williams_alligator' | 'renko' | 'heikin_ashi' | 'elliott_wave' | 'composite';
  allocated_capital: number;
  config: StrategyConfig;
  risk_parameters: any;
}

class TradingClient {
  private client: AxiosInstance;
  private baseURL: string;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  constructor(baseURL: string = 'http://localhost:8001') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const authToken = localStorage.getItem('trading-auth-token');
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      (error) => {
        const apiError: ApiError = {
          code: error.response?.status?.toString() || 'NETWORK_ERROR',
          message: error.response?.data?.message || error.message || 'Network error occurred',
          details: error.response?.data?.details || {},
        };
        
        if (process.env.NODE_ENV === 'development') {
          apiError.stack = error.stack;
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  // Paper Trading Account Management
  async getPaperTradingAccounts(): Promise<PaperTradingAccount[]> {
    const response = await this.client.get<ApiResponse<PaperTradingAccount[]>>('/api/accounts');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async createPaperTradingAccount(name: string, initialBalance: number): Promise<PaperTradingAccount> {
    const response = await this.client.post<ApiResponse<PaperTradingAccount>>('/api/accounts', {
      name,
      initial_balance: initialBalance
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async getPaperTradingAccount(accountId: string): Promise<PaperTradingAccount> {
    const response = await this.client.get<ApiResponse<PaperTradingAccount>>(`/api/accounts/${accountId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async resetPaperTradingAccount(accountId: string): Promise<PaperTradingAccount> {
    const response = await this.client.post<ApiResponse<PaperTradingAccount>>(`/api/accounts/${accountId}/reset`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Strategy Management
  async getStrategies(): Promise<StrategyInstance[]> {
    const response = await this.client.get<ApiResponse<StrategyInstance[]>>('/api/strategies');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async getStrategy(strategyId: string): Promise<StrategyInstance> {
    const response = await this.client.get<ApiResponse<StrategyInstance>>(`/api/strategies/${strategyId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async createStrategy(request: StrategyRequest): Promise<StrategyInstance> {
    const response = await this.client.post<ApiResponse<StrategyInstance>>('/api/strategies', request);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async updateStrategy(strategyId: string, updates: Partial<StrategyRequest>): Promise<StrategyInstance> {
    const response = await this.client.patch<ApiResponse<StrategyInstance>>(`/api/strategies/${strategyId}`, updates);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async startStrategy(strategyId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/strategies/${strategyId}/start`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async pauseStrategy(strategyId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/strategies/${strategyId}/pause`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async stopStrategy(strategyId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/strategies/${strategyId}/stop`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async deleteStrategy(strategyId: string): Promise<boolean> {
    const response = await this.client.delete<ApiResponse<boolean>>(`/api/strategies/${strategyId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async getStrategyPerformance(strategyId: string, timeRange?: TimeRange): Promise<PerformanceMetrics> {
    const params = new URLSearchParams();
    if (timeRange) {
      params.append('start_date', timeRange.start.toISOString());
      params.append('end_date', timeRange.end.toISOString());
    }

    const response = await this.client.get<ApiResponse<PerformanceMetrics>>(
      `/api/strategies/${strategyId}/performance?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Order Management
  async getOrders(filters?: FilterOptions): Promise<PaginatedResponse<Order>> {
    const params = new URLSearchParams();
    
    if (filters?.status?.length) {
      filters.status.forEach(status => params.append('status', status));
    }
    
    if (filters?.symbols?.length) {
      filters.symbols.forEach(symbol => params.append('symbol', symbol));
    }
    
    if (filters?.strategies?.length) {
      filters.strategies.forEach(strategy => params.append('strategy_id', strategy));
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Order>>>(
      `/api/orders?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async createOrder(request: OrderRequest): Promise<Order> {
    const response = await this.client.post<ApiResponse<Order>>('/api/orders', request);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.client.get<ApiResponse<Order>>(`/api/orders/${orderId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const response = await this.client.delete<ApiResponse<boolean>>(`/api/orders/${orderId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async modifyOrder(orderId: string, updates: Partial<OrderRequest>): Promise<Order> {
    const response = await this.client.patch<ApiResponse<Order>>(`/api/orders/${orderId}`, updates);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Position Management
  async getPositions(accountId?: string): Promise<Position[]> {
    const params = accountId ? `?account_id=${accountId}` : '';
    const response = await this.client.get<ApiResponse<Position[]>>(`/api/positions${params}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async getPosition(positionId: string): Promise<Position> {
    const response = await this.client.get<ApiResponse<Position>>(`/api/positions/${positionId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async closePosition(positionId: string, quantity?: number): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/positions/${positionId}/close`, {
      quantity
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async updatePositionStopLoss(positionId: string, stopLoss: number): Promise<Position> {
    const response = await this.client.patch<ApiResponse<Position>>(`/api/positions/${positionId}`, {
      stop_loss: stopLoss
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async updatePositionTakeProfit(positionId: string, takeProfit: number): Promise<Position> {
    const response = await this.client.patch<ApiResponse<Position>>(`/api/positions/${positionId}`, {
      take_profit: takeProfit
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Market Data
  async getMarketData(symbols: string[]): Promise<Record<string, MarketData>> {
    const response = await this.client.post<ApiResponse<Record<string, MarketData>>>('/api/market-data', {
      symbols
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || {};
  }

  async getMarketDataHistory(symbol: string, timeRange: TimeRange, interval: string = '1m'): Promise<MarketData[]> {
    const params = new URLSearchParams({
      start_date: timeRange.start.toISOString(),
      end_date: timeRange.end.toISOString(),
      interval
    });

    const response = await this.client.get<ApiResponse<MarketData[]>>(
      `/api/market-data/${symbol}/history?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  // Trading Signals
  async getTradingSignals(filters?: { strategy_id?: string; symbol?: string }): Promise<TradingSignal[]> {
    const params = new URLSearchParams();
    if (filters?.strategy_id) params.append('strategy_id', filters.strategy_id);
    if (filters?.symbol) params.append('symbol', filters.symbol);

    const response = await this.client.get<ApiResponse<TradingSignal[]>>(
      `/api/signals?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async generateTradingSignal(strategyId: string, symbol: string): Promise<TradingSignal> {
    const response = await this.client.post<ApiResponse<TradingSignal>>('/api/signals/generate', {
      strategy_id: strategyId,
      symbol
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Risk Management
  async getRiskMetrics(accountId?: string): Promise<RiskMetrics> {
    const params = accountId ? `?account_id=${accountId}` : '';
    const response = await this.client.get<ApiResponse<RiskMetrics>>(`/api/risk/metrics${params}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async calculatePositionSize(request: {
    account_id: string;
    symbol: string;
    entry_price: number;
    stop_loss: number;
    risk_percentage: number;
  }): Promise<{ quantity: number; risk_amount: number }> {
    const response = await this.client.post<ApiResponse<{ quantity: number; risk_amount: number }>>(
      '/api/risk/position-size',
      request
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // Trade Executions
  async getTradeExecutions(filters?: FilterOptions): Promise<PaginatedResponse<TradeExecution>> {
    const params = new URLSearchParams();
    
    if (filters?.date_range) {
      params.append('start_date', filters.date_range.start.toISOString());
      params.append('end_date', filters.date_range.end.toISOString());
    }
    
    if (filters?.symbols?.length) {
      filters.symbols.forEach(symbol => params.append('symbol', symbol));
    }
    
    if (filters?.strategies?.length) {
      filters.strategies.forEach(strategy => params.append('strategy_id', strategy));
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<TradeExecution>>>(
      `/api/executions?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // WebSocket Connection for Real-time Updates
  connectWebSocket(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsURL = this.baseURL.replace(/^http/, 'ws') + '/ws/trading';
    this.wsConnection = new WebSocket(wsURL);

    this.wsConnection.onopen = () => {
      console.log('Trading WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to trading events
      this.sendWebSocketMessage({
        type: 'subscribe',
        topics: ['orders', 'positions', 'executions', 'market_data', 'signals']
      });
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Error parsing Trading WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('Trading WebSocket error:', error);
      onError?.(error);
    };

    this.wsConnection.onclose = () => {
      console.log('Trading WebSocket disconnected');
      this.attemptReconnect(onMessage, onError);
    };
  }

  private attemptReconnect(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect Trading WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket(onMessage, onError);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached for Trading WebSocket');
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  sendWebSocketMessage(message: any): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    } else {
      console.warn('Trading WebSocket not connected, cannot send message');
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string }>>('/api/health');
      return response.data.success && response.data.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Configuration
  setAuthToken(token: string): void {
    localStorage.setItem('trading-auth-token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('trading-auth-token');
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.wsConnection) {
      return 'disconnected';
    }

    switch (this.wsConnection.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

// Create and export singleton instance
export const tradingClient = new TradingClient(
  process.env.NEXT_PUBLIC_TRADING_API_URL || 'http://localhost:8001'
);

export default TradingClient; 