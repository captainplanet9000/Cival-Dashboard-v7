import crypto from 'crypto';
import { 
  BaseExchangeConnector, 
  ExchangeCredentials, 
  ExchangeInfo, 
  MarketData, 
  OrderBook, 
  Balance, 
  Position, 
  Order, 
  Trade,
  WebSocketConfig 
} from './base-connector';

interface HyperliquidConfig extends ExchangeCredentials {
  baseUrl?: string;
  wsUrl?: string;
}

interface HyperliquidMarketData {
  coin: string;
  px: string;
  sz: string;
  time: number;
  // Add other Hyperliquid specific fields
}

interface HyperliquidL2Book {
  coin: string;
  levels: Array<{
    px: string;
    sz: string;
    n: number;
  }>;
  time: number;
}

interface HyperliquidPosition {
  coin: string;
  entryPx?: string;
  leverageUsed: string;
  liquidationPx?: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  szi: string; // size
}

interface HyperliquidBalance {
  coin: string;
  hold: string;
  total: string;
}

interface HyperliquidOrder {
  coin: string;
  side: string;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  orderType: string;
  filled: string;
  // Add other order fields
}

export class HyperliquidConnector extends BaseExchangeConnector {
  private baseUrl: string;
  private wsUrl: string;
  private nonce: number = Date.now();

  constructor(config: HyperliquidConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.hyperliquid.xyz';
    this.wsUrl = config.wsUrl || 'wss://api.hyperliquid.xyz/ws';
  }

  protected formatSymbol(symbol: string): string {
    // Hyperliquid uses simple coin names like "ETH", "BTC"
    return symbol.replace('USDT', '').replace('USD', '').replace('-PERP', '');
  }

  protected createSignature(timestamp: string, method: string, endpoint: string, body?: string): string {
    const message = timestamp + method + endpoint + (body || '');
    return crypto.createHmac('sha256', this.credentials.apiSecret).update(message).digest('hex');
  }

  protected async makeRequest(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    params?: any,
    body?: any
  ): Promise<any> {
    const timestamp = Date.now().toString();
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if credentials are provided
    if (this.credentials.apiKey) {
      const bodyString = body ? JSON.stringify(body) : '';
      const signature = this.createSignature(timestamp, method, endpoint, bodyString);
      
      headers['HX-ACCESS-KEY'] = this.credentials.apiKey;
      headers['HX-ACCESS-SIGN'] = signature;
      headers['HX-ACCESS-TIMESTAMP'] = timestamp;
    }

    const requestInit: RequestInit = {
      method,
      headers,
    };

    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    if (method === 'GET' && params) {
      const searchParams = new URLSearchParams(params);
      const fullUrl = `${url}?${searchParams.toString()}`;
      const response = await fetch(fullUrl, requestInit);
      return await response.json();
    }

    const response = await fetch(url, requestInit);
    
    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      const meta = await this.makeRequest('POST', '/info', {}, { type: 'meta' });
      const universe = meta.universe || [];
      
      const symbols = universe.map((asset: any) => asset.name);
      const minOrderSizes: Record<string, number> = {};
      const tickSizes: Record<string, number> = {};
      const maxOrderSize: Record<string, number> = {};

      universe.forEach((asset: any) => {
        const symbol = asset.name;
        minOrderSizes[symbol] = parseFloat(asset.szDecimals) || 0.001;
        tickSizes[symbol] = parseFloat(asset.pxDecimals) || 0.01;
        maxOrderSize[symbol] = parseFloat(asset.maxLeverage) * 1000000 || 1000000;
      });

      return {
        name: 'Hyperliquid',
        type: 'futures',
        symbols,
        minOrderSizes,
        tickSizes,
        fees: {
          maker: 0.0002, // 0.02%
          taker: 0.0005, // 0.05%
        },
        limits: {
          maxOrderSize,
          maxPositions: 100,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get exchange info: ${error}`);
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest('POST', '/info', {}, { 
        type: 'allMids' 
      });

      const marketData = response.find((item: any) => item.coin === coin);
      if (!marketData) {
        throw new Error(`Market data not found for ${symbol}`);
      }

      // Get 24h stats
      const stats = await this.makeRequest('POST', '/info', {}, {
        type: 'spotMeta',
        tokens: [coin]
      });

      const price = parseFloat(marketData.px);
      const volume = parseFloat(marketData.sz);
      
      return {
        symbol: coin,
        price,
        volume,
        high24h: stats.dayHigh ? parseFloat(stats.dayHigh) : price * 1.05,
        low24h: stats.dayLow ? parseFloat(stats.dayLow) : price * 0.95,
        change24h: stats.change24h ? parseFloat(stats.change24h) : 0,
        changePercent24h: stats.changePercent24h ? parseFloat(stats.changePercent24h) : 0,
        timestamp: marketData.time || Date.now(),
        bid: price * 0.9995, // Approximate based on spread
        ask: price * 1.0005,
        spread: price * 0.001,
      };
    } catch (error) {
      throw new Error(`Failed to get market data for ${symbol}: ${error}`);
    }
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    try {
      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest('POST', '/info', {}, {
        type: 'l2Book',
        coin,
      });

      const levels = response.levels || [];
      const bids: [number, number][] = [];
      const asks: [number, number][] = [];

      levels.forEach((level: any) => {
        const price = parseFloat(level.px);
        const size = parseFloat(level.sz);
        
        if (level.side === 'B') {
          bids.push([price, size]);
        } else {
          asks.push([price, size]);
        }
      });

      // Sort and limit
      bids.sort((a, b) => b[0] - a[0]).splice(limit);
      asks.sort((a, b) => a[0] - b[0]).splice(limit);

      return {
        symbol: coin,
        bids,
        asks,
        timestamp: response.time || Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to get order book for ${symbol}: ${error}`);
    }
  }

  async getBalances(): Promise<Balance[]> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for balance information');
      }

      const response = await this.makeRequest('POST', '/info', {}, {
        type: 'clearinghouseState',
        user: this.credentials.apiKey,
      });

      const balances: Balance[] = [];
      
      if (response.marginSummary) {
        const { accountValue, totalMarginUsed } = response.marginSummary;
        
        balances.push({
          asset: 'USD',
          free: parseFloat(accountValue) - parseFloat(totalMarginUsed),
          locked: parseFloat(totalMarginUsed),
          total: parseFloat(accountValue),
          usdValue: parseFloat(accountValue),
        });
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to get balances: ${error}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for position information');
      }

      const response = await this.makeRequest('POST', '/info', {}, {
        type: 'clearinghouseState',
        user: this.credentials.apiKey,
      });

      const positions: Position[] = [];

      if (response.assetPositions) {
        response.assetPositions.forEach((pos: HyperliquidPosition) => {
          const size = parseFloat(pos.szi);
          if (size === 0) return; // Skip empty positions

          const avgPrice = parseFloat(pos.entryPx || '0');
          const unrealizedPnl = parseFloat(pos.unrealizedPnl);
          const markPrice = avgPrice + (unrealizedPnl / size); // Approximate mark price

          positions.push({
            symbol: pos.coin,
            side: size > 0 ? 'long' : 'short',
            size: Math.abs(size),
            averagePrice: avgPrice,
            markPrice,
            unrealizedPnl,
            realizedPnl: 0, // Not provided in this endpoint
            percentage: parseFloat(pos.returnOnEquity),
            marginUsed: parseFloat(pos.positionValue) / parseFloat(pos.leverageUsed),
            liquidationPrice: pos.liquidationPx ? parseFloat(pos.liquidationPx) : undefined,
            timestamp: Date.now(),
          });
        });
      }

      return positions;
    } catch (error) {
      throw new Error(`Failed to get positions: ${error}`);
    }
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for order information');
      }

      const response = await this.makeRequest('POST', '/info', {}, {
        type: 'openOrders',
        user: this.credentials.apiKey,
      });

      const orders: Order[] = [];

      if (response.orders) {
        response.orders.forEach((order: HyperliquidOrder) => {
          if (symbol && this.formatSymbol(symbol) !== order.coin) return;

          const quantity = parseFloat(order.sz);
          const filledQuantity = parseFloat(order.filled || '0');

          orders.push({
            id: order.oid.toString(),
            symbol: order.coin,
            side: order.side.toLowerCase() as 'buy' | 'sell',
            type: order.orderType.toLowerCase() as any,
            quantity,
            price: parseFloat(order.limitPx),
            status: filledQuantity === quantity ? 'filled' : filledQuantity > 0 ? 'open' : 'open',
            filledQuantity,
            averagePrice: filledQuantity > 0 ? parseFloat(order.limitPx) : undefined,
            fees: 0, // Calculate based on filled amount and fee rate
            timestamp: order.timestamp,
            updateTime: order.timestamp,
          });
        });
      }

      return orders;
    } catch (error) {
      throw new Error(`Failed to get orders: ${error}`);
    }
  }

  async placeOrder(trade: Trade): Promise<Order> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for placing orders');
      }

      const coin = this.formatSymbol(trade.symbol);
      const orderType = trade.type === 'market' ? { trigger: { triggerPx: null, tpsl: 'tp', isMarket: true } } : { limit: { tif: trade.timeInForce || 'Gtc' } };

      const orderRequest = {
        coin,
        is_buy: trade.side === 'buy',
        sz: trade.quantity,
        limit_px: trade.price || null,
        order_type: orderType,
        reduce_only: trade.reduceOnly || false,
      };

      const response = await this.makeRequest('POST', '/exchange', {}, {
        action: {
          type: 'order',
          orders: [orderRequest],
        },
        nonce: this.nonce++,
        signature: '', // Will be calculated in makeRequest
      });

      if (response.response?.type === 'error') {
        throw new Error(response.response.payload);
      }

      const orderId = response.response?.data?.statuses?.[0]?.resting?.oid?.toString();

      return {
        ...trade,
        id: orderId || `temp_${Date.now()}`,
        status: 'pending',
        filledQuantity: 0,
        fees: 0,
        timestamp: Date.now(),
        updateTime: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to place order: ${error}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for canceling orders');
      }

      const coin = this.formatSymbol(symbol);
      const response = await this.makeRequest('POST', '/exchange', {}, {
        action: {
          type: 'cancel',
          cancels: [{
            coin,
            oid: parseInt(orderId),
          }],
        },
        nonce: this.nonce++,
        signature: '',
      });

      return response.response?.type === 'ok';
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error}`);
    }
  }

  async cancelAllOrders(symbol?: string): Promise<boolean> {
    try {
      if (!this.credentials.apiKey) {
        throw new Error('API key required for canceling orders');
      }

      const coin = symbol ? this.formatSymbol(symbol) : null;
      const response = await this.makeRequest('POST', '/exchange', {}, {
        action: {
          type: 'cancelByCloid',
          cancels: coin ? [{ coin }] : [],
        },
        nonce: this.nonce++,
        signature: '',
      });

      return response.response?.type === 'ok';
    } catch (error) {
      throw new Error(`Failed to cancel all orders: ${error}`);
    }
  }

  // WebSocket implementation
  async connectWebSocket(config: WebSocketConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.wsUrl);

        this.websocket.onopen = () => {
          console.log('Hyperliquid WebSocket connected');
          this.onConnect?.();
          resolve();
        };

        this.websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.websocket.onerror = (error) => {
          console.error('Hyperliquid WebSocket error:', error);
          this.onError?.(new Error('WebSocket connection error'));
          reject(error);
        };

        this.websocket.onclose = () => {
          console.log('Hyperliquid WebSocket disconnected');
          this.onDisconnect?.();
          this.handleWebSocketReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(data: any): void {
    if (data.channel === 'allMids') {
      // Handle market data updates
      const marketData = this.standardizeMarketData(data.data);
      this.onMarketDataUpdate?.(marketData);
    } else if (data.channel === 'l2Book') {
      // Handle order book updates
      const orderBook = this.standardizeOrderBook(data.data);
      this.onOrderBookUpdate?.(orderBook);
    } else if (data.channel === 'trades') {
      // Handle trade updates
      data.data.forEach((trade: any) => {
        this.onTradeUpdate?.(this.standardizeOrder(trade));
      });
    } else if (data.channel === 'user') {
      // Handle user-specific updates (orders, positions)
      if (data.data.orders) {
        data.data.orders.forEach((order: any) => {
          this.onOrderUpdate?.(this.standardizeOrder(order));
        });
      }
      if (data.data.positions) {
        data.data.positions.forEach((position: any) => {
          this.onPositionUpdate?.(this.standardizePosition(position));
        });
      }
    }
  }

  private handleWebSocketReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnects) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connectWebSocket({ url: this.wsUrl, subscriptions: [] });
      }, 1000 * Math.pow(2, this.reconnectAttempts));
    }
  }

  async subscribeToMarketData(symbols: string[]): Promise<void> {
    if (!this.websocket) {
      throw new Error('WebSocket not connected');
    }

    const subscription = {
      method: 'subscribe',
      subscription: {
        type: 'allMids',
      },
    };

    this.websocket.send(JSON.stringify(subscription));
  }

  async subscribeToOrderBook(symbols: string[]): Promise<void> {
    if (!this.websocket) {
      throw new Error('WebSocket not connected');
    }

    symbols.forEach(symbol => {
      const coin = this.formatSymbol(symbol);
      const subscription = {
        method: 'subscribe',
        subscription: {
          type: 'l2Book',
          coin,
        },
      };
      this.websocket!.send(JSON.stringify(subscription));
    });
  }

  async subscribeToTrades(symbols: string[]): Promise<void> {
    if (!this.websocket) {
      throw new Error('WebSocket not connected');
    }

    symbols.forEach(symbol => {
      const coin = this.formatSymbol(symbol);
      const subscription = {
        method: 'subscribe',
        subscription: {
          type: 'trades',
          coin,
        },
      };
      this.websocket!.send(JSON.stringify(subscription));
    });
  }

  async subscribeToOrders(): Promise<void> {
    if (!this.websocket || !this.credentials.apiKey) {
      throw new Error('WebSocket not connected or API key not provided');
    }

    const subscription = {
      method: 'subscribe',
      subscription: {
        type: 'user',
        user: this.credentials.apiKey,
      },
    };

    this.websocket.send(JSON.stringify(subscription));
  }

  async subscribeToPositions(): Promise<void> {
    // Positions are included in user subscription
    await this.subscribeToOrders();
  }

  // Standardization methods
  protected standardizeMarketData(rawData: any): MarketData {
    return {
      symbol: rawData.coin,
      price: parseFloat(rawData.px),
      volume: parseFloat(rawData.sz || '0'),
      high24h: 0, // Not provided in real-time feed
      low24h: 0, // Not provided in real-time feed
      change24h: 0, // Not provided in real-time feed
      changePercent24h: 0, // Not provided in real-time feed
      timestamp: rawData.time || Date.now(),
      bid: parseFloat(rawData.px) * 0.9995,
      ask: parseFloat(rawData.px) * 1.0005,
      spread: parseFloat(rawData.px) * 0.001,
    };
  }

  protected standardizeOrderBook(rawData: any): OrderBook {
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];

    rawData.levels?.forEach((level: any) => {
      const price = parseFloat(level.px);
      const size = parseFloat(level.sz);
      
      if (level.side === 'B') {
        bids.push([price, size]);
      } else {
        asks.push([price, size]);
      }
    });

    return {
      symbol: rawData.coin,
      bids: bids.sort((a, b) => b[0] - a[0]),
      asks: asks.sort((a, b) => a[0] - b[0]),
      timestamp: rawData.time || Date.now(),
    };
  }

  protected standardizeOrder(rawData: any): Order {
    return {
      id: rawData.oid?.toString() || rawData.id?.toString(),
      symbol: rawData.coin,
      side: rawData.side?.toLowerCase() === 'b' ? 'buy' : 'sell',
      type: 'limit', // Default to limit
      quantity: parseFloat(rawData.sz),
      price: parseFloat(rawData.limitPx || rawData.px),
      status: rawData.filled === rawData.sz ? 'filled' : 'open',
      filledQuantity: parseFloat(rawData.filled || '0'),
      averagePrice: parseFloat(rawData.avgPx || rawData.limitPx || '0'),
      fees: parseFloat(rawData.fee || '0'),
      timestamp: rawData.timestamp || Date.now(),
      updateTime: rawData.timestamp || Date.now(),
    };
  }

  protected standardizePosition(rawData: any): Position {
    const size = parseFloat(rawData.szi || rawData.size);
    return {
      symbol: rawData.coin,
      side: size > 0 ? 'long' : 'short',
      size: Math.abs(size),
      averagePrice: parseFloat(rawData.entryPx || '0'),
      markPrice: parseFloat(rawData.markPx || rawData.entryPx || '0'),
      unrealizedPnl: parseFloat(rawData.unrealizedPnl || '0'),
      realizedPnl: parseFloat(rawData.realizedPnl || '0'),
      percentage: parseFloat(rawData.returnOnEquity || '0'),
      marginUsed: parseFloat(rawData.marginUsed || '0'),
      liquidationPrice: rawData.liquidationPx ? parseFloat(rawData.liquidationPx) : undefined,
      timestamp: Date.now(),
    };
  }

  protected standardizeBalance(rawData: any): Balance {
    return {
      asset: rawData.coin || 'USD',
      free: parseFloat(rawData.hold || '0'),
      locked: 0,
      total: parseFloat(rawData.total || '0'),
      usdValue: parseFloat(rawData.total || '0'),
    };
  }
}

export default HyperliquidConnector; 