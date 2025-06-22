import { MarketData, TradingSignal, Position, Order, StrategyInstance, PaperTradingAccount, BacktestResult, TradingAlert, RiskMetrics, PerformanceMetrics } from '@/types/trading';
import { APIResponse } from '@/types/common';
import redisService from '@/lib/services/redis-service';

export class TradingClient {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(baseUrl: string = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
  }

  // WebSocket connection for real-time data
  async connectMarketData(): Promise<void> {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/market-data';
    
    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('Trading WebSocket connected');
        this.emit('connection', { status: 'connected' });
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMarketDataMessage(data);
        } catch (error) {
          console.error('Error parsing market data message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('Trading WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
      };

      this.wsConnection.onerror = (error) => {
        console.error('Trading WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect trading WebSocket:', error);
      throw error;
    }
  }

  private handleMarketDataMessage(data: any): void {
    switch (data.type) {
      case 'market_data':
        this.emit('market_data', data.payload);
        break;
      case 'trade_signal':
        this.emit('trade_signal', data.payload);
        break;
      case 'position_update':
        this.emit('position_update', data.payload);
        break;
      case 'order_update':
        this.emit('order_update', data.payload);
        break;
      case 'alert':
        this.emit('alert', data.payload);
        break;
      default:
        console.log('Unknown market data message type:', data.type);
    }
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Event handling
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // API methods
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TRADING_API_KEY}`,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Trading API request failed');
      }

      return data;
    } catch (error) {
      console.error(`Trading API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Market Data
  async getMarketData(symbol: string, timeframe: string = '1h', limit: number = 100): Promise<MarketData[]> {
    const response = await this.request<MarketData[]>(
      `/api/market-data/${symbol}?timeframe=${timeframe}&limit=${limit}`
    );
    return response.data || [];
  }

  async getMultipleMarketData(symbols: string[], timeframe: string = '1h'): Promise<Record<string, MarketData[]>> {
    const response = await this.request<Record<string, MarketData[]>>(
      `/api/market-data/multiple?symbols=${symbols.join(',')}&timeframe=${timeframe}`
    );
    return response.data || {};
  }

  async subscribeToSymbol(symbol: string): Promise<boolean> {
    try {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          type: 'subscribe',
          symbol
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to subscribe to ${symbol}:`, error);
      return false;
    }
  }

  async unsubscribeFromSymbol(symbol: string): Promise<boolean> {
    try {
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({
          type: 'unsubscribe',
          symbol
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to unsubscribe from ${symbol}:`, error);
      return false;
    }
  }

  // Paper Trading Accounts
  async getPaperAccounts(): Promise<PaperTradingAccount[]> {
    const response = await this.request<PaperTradingAccount[]>('/api/paper-trading/accounts');
    return response.data || [];
  }

  async createPaperAccount(name: string, initialBalance: number): Promise<PaperTradingAccount | null> {
    try {
      const response = await this.request<PaperTradingAccount>('/api/paper-trading/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          initial_balance: initialBalance
        })
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to create paper account:', error);
      return null;
    }
  }

  async getPaperAccount(accountId: string): Promise<PaperTradingAccount | null> {
    try {
      const response = await this.request<PaperTradingAccount>(`/api/paper-trading/accounts/${accountId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get paper account ${accountId}:`, error);
      return null;
    }
  }

  async updatePaperAccount(accountId: string, updates: Partial<PaperTradingAccount>): Promise<boolean> {
    try {
      await this.request(`/api/paper-trading/accounts/${accountId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return true;
    } catch (error) {
      console.error(`Failed to update paper account ${accountId}:`, error);
      return false;
    }
  }

  // Orders
  async placeOrder(accountId: string, order: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status' | 'filled_quantity' | 'average_fill_price'>): Promise<Order | null> {
    try {
      const response = await this.request<Order>(`/api/paper-trading/accounts/${accountId}/orders`, {
        method: 'POST',
        body: JSON.stringify(order)
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to place order:', error);
      return null;
    }
  }

  async getOrders(accountId: string, status?: string): Promise<Order[]> {
    const endpoint = status 
      ? `/api/paper-trading/accounts/${accountId}/orders?status=${status}`
      : `/api/paper-trading/accounts/${accountId}/orders`;
    
    const response = await this.request<Order[]>(endpoint);
    return response.data || [];
  }

  async getOrder(accountId: string, orderId: string): Promise<Order | null> {
    try {
      const response = await this.request<Order>(`/api/paper-trading/accounts/${accountId}/orders/${orderId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get order ${orderId}:`, error);
      return null;
    }
  }

  async cancelOrder(accountId: string, orderId: string): Promise<boolean> {
    try {
      await this.request(`/api/paper-trading/accounts/${accountId}/orders/${orderId}/cancel`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }

  async modifyOrder(accountId: string, orderId: string, updates: Partial<Order>): Promise<boolean> {
    try {
      await this.request(`/api/paper-trading/accounts/${accountId}/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return true;
    } catch (error) {
      console.error(`Failed to modify order ${orderId}:`, error);
      return false;
    }
  }

  // Positions
  async getPositions(accountId: string): Promise<Position[]> {
    const response = await this.request<Position[]>(`/api/paper-trading/accounts/${accountId}/positions`);
    return response.data || [];
  }

  async getPosition(accountId: string, symbol: string): Promise<Position | null> {
    try {
      const response = await this.request<Position>(`/api/paper-trading/accounts/${accountId}/positions/${symbol}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get position for ${symbol}:`, error);
      return null;
    }
  }

  async closePosition(accountId: string, positionId: string, quantity?: number): Promise<boolean> {
    try {
      await this.request(`/api/paper-trading/accounts/${accountId}/positions/${positionId}/close`, {
        method: 'POST',
        body: JSON.stringify({ quantity })
      });
      return true;
    } catch (error) {
      console.error(`Failed to close position ${positionId}:`, error);
      return false;
    }
  }

  // Strategies
  async getStrategies(): Promise<StrategyInstance[]> {
    const response = await this.request<StrategyInstance[]>('/api/strategies');
    return response.data || [];
  }

  async createStrategy(strategy: Omit<StrategyInstance, 'id' | 'created_at' | 'updated_at'>): Promise<StrategyInstance | null> {
    try {
      const response = await this.request<StrategyInstance>('/api/strategies', {
        method: 'POST',
        body: JSON.stringify(strategy)
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to create strategy:', error);
      return null;
    }
  }

  async getStrategy(strategyId: string): Promise<StrategyInstance | null> {
    try {
      const response = await this.request<StrategyInstance>(`/api/strategies/${strategyId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get strategy ${strategyId}:`, error);
      return null;
    }
  }

  async updateStrategy(strategyId: string, updates: Partial<StrategyInstance>): Promise<boolean> {
    try {
      await this.request(`/api/strategies/${strategyId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      return true;
    } catch (error) {
      console.error(`Failed to update strategy ${strategyId}:`, error);
      return false;
    }
  }

  async startStrategy(strategyId: string): Promise<boolean> {
    try {
      await this.request(`/api/strategies/${strategyId}/start`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error(`Failed to start strategy ${strategyId}:`, error);
      return false;
    }
  }

  async stopStrategy(strategyId: string): Promise<boolean> {
    try {
      await this.request(`/api/strategies/${strategyId}/stop`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error(`Failed to stop strategy ${strategyId}:`, error);
      return false;
    }
  }

  async deleteStrategy(strategyId: string): Promise<boolean> {
    try {
      await this.request(`/api/strategies/${strategyId}`, {
        method: 'DELETE'
      });
      return true;
    } catch (error) {
      console.error(`Failed to delete strategy ${strategyId}:`, error);
      return false;
    }
  }

  // Signals
  async getSignals(strategyId?: string, limit: number = 100): Promise<TradingSignal[]> {
    const endpoint = strategyId 
      ? `/api/signals?strategy=${strategyId}&limit=${limit}`
      : `/api/signals?limit=${limit}`;
    
    const response = await this.request<TradingSignal[]>(endpoint);
    return response.data || [];
  }

  async createSignal(signal: Omit<TradingSignal, 'id' | 'timestamp'>): Promise<TradingSignal | null> {
    try {
      const response = await this.request<TradingSignal>('/api/signals', {
        method: 'POST',
        body: JSON.stringify(signal)
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to create signal:', error);
      return null;
    }
  }

  // Backtesting
  async runBacktest(config: any): Promise<BacktestResult | null> {
    try {
      const response = await this.request<BacktestResult>('/api/backtest', {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to run backtest:', error);
      return null;
    }
  }

  async getBacktestResults(limit: number = 50): Promise<BacktestResult[]> {
    const response = await this.request<BacktestResult[]>(`/api/backtest/results?limit=${limit}`);
    return response.data || [];
  }

  async getBacktestResult(resultId: string): Promise<BacktestResult | null> {
    try {
      const response = await this.request<BacktestResult>(`/api/backtest/results/${resultId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get backtest result ${resultId}:`, error);
      return null;
    }
  }

  // Risk Management
  async getRiskMetrics(accountId: string): Promise<RiskMetrics | null> {
    try {
      const response = await this.request<RiskMetrics>(`/api/risk/metrics/${accountId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get risk metrics for ${accountId}:`, error);
      return null;
    }
  }

  async getPerformanceMetrics(accountId: string): Promise<PerformanceMetrics | null> {
    try {
      const response = await this.request<PerformanceMetrics>(`/api/performance/metrics/${accountId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get performance metrics for ${accountId}:`, error);
      return null;
    }
  }

  // Alerts
  async getAlerts(accountId?: string): Promise<TradingAlert[]> {
    const endpoint = accountId ? `/api/alerts?account=${accountId}` : '/api/alerts';
    const response = await this.request<TradingAlert[]>(endpoint);
    return response.data || [];
  }

  async createAlert(alert: Omit<TradingAlert, 'id' | 'triggered_at' | 'acknowledged' | 'acknowledged_at'>): Promise<TradingAlert | null> {
    try {
      const response = await this.request<TradingAlert>('/api/alerts', {
        method: 'POST',
        body: JSON.stringify(alert)
      });
      return response.data || null;
    } catch (error) {
      console.error('Failed to create alert:', error);
      return null;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      await this.request(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      return true;
    } catch (error) {
      console.error(`Failed to acknowledge alert ${alertId}:`, error);
      return false;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('/api/health');
      return response.success;
    } catch (error) {
      console.error('Trading API health check failed:', error);
      return false;
    }
  }

  // Caching helpers
  async cacheMarketData(symbol: string, timeframe: string, data: MarketData[]): Promise<void> {
    const key = `market_data:${symbol}:${timeframe}`;
    await redisService.cache(key, data, 300); // 5 minutes TTL
  }

  async getCachedMarketData(symbol: string, timeframe: string): Promise<MarketData[] | null> {
    const key = `market_data:${symbol}:${timeframe}`;
    return await redisService.getCached<MarketData[]>(key);
  }

  async cachePosition(accountId: string, position: Position): Promise<void> {
    const key = `position:${accountId}:${position.symbol}`;
    await redisService.cache(key, position, 60); // 1 minute TTL
  }

  async getCachedPosition(accountId: string, symbol: string): Promise<Position | null> {
    const key = `position:${accountId}:${symbol}`;
    return await redisService.getCached<Position>(key);
  }
}

// Singleton instance
export const tradingClient = new TradingClient();
export default tradingClient; 