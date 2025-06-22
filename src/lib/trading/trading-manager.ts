import { EventEmitter } from 'events';
import { 
  BaseExchangeConnector, 
  ExchangeCredentials,
  MarketData, 
  OrderBook, 
  Balance, 
  Position, 
  Order, 
  Trade,
  ExchangeInfo
} from './exchange-connectors/base-connector';
import HyperliquidConnector from './exchange-connectors/hyperliquid-connector';
import UniswapConnector from './exchange-connectors/uniswap-connector';

export interface TradingManagerConfig {
  exchanges: {
    [name: string]: {
      type: 'hyperliquid' | 'uniswap' | 'vertex' | 'bluefin' | 'bybit';
      credentials: ExchangeCredentials;
      enabled: boolean;
      priority: number;
    };
  };
  defaultExchange: string;
  realTimeDataEnabled: boolean;
  aggregateOrderBooks: boolean;
  riskManagement: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercentage: number;
    takeProfitPercentage: number;
  };
}

export interface AggregatedMarketData extends MarketData {
  exchanges: string[];
  bestBid: { price: number; exchange: string };
  bestAsk: { price: number; exchange: string };
  totalVolume: number;
}

export interface AggregatedOrderBook {
  symbol: string;
  bids: Array<{ price: number; size: number; exchange: string }>;
  asks: Array<{ price: number; size: number; exchange: string }>;
  timestamp: number;
  depth: number;
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

export interface PortfolioSummary {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  balancesByExchange: Record<string, Balance[]>;
  positionsByExchange: Record<string, Position[]>;
  activeOrders: Order[];
  strategies: TradingStrategy[];
}

export class TradingManager extends EventEmitter {
  private connectors: Map<string, BaseExchangeConnector> = new Map();
  private config: TradingManagerConfig;
  private marketDataCache: Map<string, Map<string, MarketData>> = new Map(); // symbol -> exchange -> data
  private orderBookCache: Map<string, Map<string, OrderBook>> = new Map();
  private isInitialized = false;
  private dataUpdateInterval: NodeJS.Timeout | null = null;
  private strategies: Map<string, TradingStrategy> = new Map();

  constructor(config: TradingManagerConfig) {
    super();
    this.config = config;
    this.initializeExchanges();
  }

  private initializeExchanges(): void {
    for (const [name, exchangeConfig] of Object.entries(this.config.exchanges)) {
      if (!exchangeConfig.enabled) continue;

      let connector: BaseExchangeConnector;

      switch (exchangeConfig.type) {
        case 'hyperliquid':
          connector = new HyperliquidConnector(exchangeConfig.credentials);
          break;
        case 'uniswap':
          connector = new UniswapConnector(exchangeConfig.credentials);
          break;
        case 'vertex':
          // TODO: Implement Vertex connector
          console.warn(`Vertex connector not implemented yet`);
          continue;
        case 'bluefin':
          // TODO: Implement Bluefin connector
          console.warn(`Bluefin connector not implemented yet`);
          continue;
        case 'bybit':
          // TODO: Implement Bybit connector
          console.warn(`Bybit connector not implemented yet`);
          continue;
        default:
          console.error(`Unknown exchange type: ${exchangeConfig.type}`);
          continue;
      }

      // Set up event handlers
      connector.onMarketDataUpdate = (data: MarketData) => {
        this.handleMarketDataUpdate(name, data);
      };

      connector.onOrderBookUpdate = (data: OrderBook) => {
        this.handleOrderBookUpdate(name, data);
      };

      connector.onOrderUpdate = (data: Order) => {
        this.handleOrderUpdate(name, data);
      };

      connector.onPositionUpdate = (data: Position) => {
        this.handlePositionUpdate(name, data);
      };

      connector.onError = (error: Error) => {
        this.emit('exchangeError', { exchange: name, error });
      };

      this.connectors.set(name, connector);
    }
  }

  async initialize(): Promise<void> {
    try {
      // Connect to all exchanges
      const connectionPromises = Array.from(this.connectors.entries()).map(
        async ([name, connector]) => {
          try {
            const connected = await connector.connect();
            if (connected) {
              console.log(`Connected to ${name}`);
              this.emit('exchangeConnected', { exchange: name });
            } else {
              console.error(`Failed to connect to ${name}`);
              this.emit('exchangeError', { exchange: name, error: new Error('Connection failed') });
            }
          } catch (error) {
            console.error(`Error connecting to ${name}:`, error);
            this.emit('exchangeError', { exchange: name, error });
          }
        }
      );

      await Promise.allSettled(connectionPromises);

      // Start real-time data feeds if enabled
      if (this.config.realTimeDataEnabled) {
        await this.startRealTimeData();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async startRealTimeData(): Promise<void> {
    // Start data update interval
    this.dataUpdateInterval = setInterval(() => {
      this.updateMarketData();
    }, 5000); // Update every 5 seconds

    // Connect WebSockets for real-time data
    for (const [name, connector] of this.connectors) {
      try {
        await connector.connectWebSocket({
          url: '', // Will be set by each connector
          subscriptions: [],
        });

        // Subscribe to market data for popular symbols
        const popularSymbols = ['BTC', 'ETH', 'SOL', 'USDC'];
        await connector.subscribeToMarketData(popularSymbols);
        await connector.subscribeToOrderBook(popularSymbols);
        
        // Subscribe to user data if authenticated
        if (connector.getConnectionStatus()) {
          await connector.subscribeToOrders();
          await connector.subscribeToPositions();
        }
      } catch (error) {
        console.warn(`Failed to setup real-time data for ${name}:`, error);
      }
    }
  }

  private async updateMarketData(): Promise<void> {
    const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT'];
    
    for (const symbol of symbols) {
      const exchangeData: Record<string, MarketData> = {};
      
      for (const [name, connector] of this.connectors) {
        try {
          const data = await connector.getMarketData(symbol);
          exchangeData[name] = data;
          
          // Cache the data
          if (!this.marketDataCache.has(symbol)) {
            this.marketDataCache.set(symbol, new Map());
          }
          this.marketDataCache.get(symbol)!.set(name, data);
        } catch (error) {
          // Silently ignore errors for individual exchanges
        }
      }

      // Emit aggregated market data
      if (Object.keys(exchangeData).length > 0) {
        const aggregated = this.aggregateMarketData(symbol, exchangeData);
        this.emit('marketDataUpdate', aggregated);
      }
    }
  }

  private aggregateMarketData(symbol: string, exchangeData: Record<string, MarketData>): AggregatedMarketData {
    const exchanges = Object.keys(exchangeData);
    const prices = Object.values(exchangeData).map(d => d.price);
    const volumes = Object.values(exchangeData).map(d => d.volume);
    const bids = Object.entries(exchangeData).map(([ex, data]) => ({ price: data.bid, exchange: ex }));
    const asks = Object.entries(exchangeData).map(([ex, data]) => ({ price: data.ask, exchange: ex }));

    const bestBid = bids.reduce((max, current) => current.price > max.price ? current : max);
    const bestAsk = asks.reduce((min, current) => current.price < min.price ? current : min);

    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);

    return {
      symbol,
      price: avgPrice,
      volume: totalVolume,
      high24h: Math.max(...Object.values(exchangeData).map(d => d.high24h)),
      low24h: Math.min(...Object.values(exchangeData).map(d => d.low24h)),
      change24h: Object.values(exchangeData)[0]?.change24h || 0,
      changePercent24h: Object.values(exchangeData)[0]?.changePercent24h || 0,
      timestamp: Date.now(),
      bid: bestBid.price,
      ask: bestAsk.price,
      spread: bestAsk.price - bestBid.price,
      exchanges,
      bestBid,
      bestAsk,
      totalVolume,
    };
  }

  private handleMarketDataUpdate(exchange: string, data: MarketData): void {
    // Cache the data
    if (!this.marketDataCache.has(data.symbol)) {
      this.marketDataCache.set(data.symbol, new Map());
    }
    this.marketDataCache.get(data.symbol)!.set(exchange, data);

    // Emit individual exchange update
    this.emit('exchangeMarketData', { exchange, data });

    // Create aggregated data if we have multiple exchanges
    const exchangeData: Record<string, MarketData> = {};
    const symbolCache = this.marketDataCache.get(data.symbol)!;
    
    for (const [ex, marketData] of symbolCache) {
      exchangeData[ex] = marketData;
    }

    if (Object.keys(exchangeData).length > 1) {
      const aggregated = this.aggregateMarketData(data.symbol, exchangeData);
      this.emit('marketDataUpdate', aggregated);
    }
  }

  private handleOrderBookUpdate(exchange: string, data: OrderBook): void {
    // Cache the data
    if (!this.orderBookCache.has(data.symbol)) {
      this.orderBookCache.set(data.symbol, new Map());
    }
    this.orderBookCache.get(data.symbol)!.set(exchange, data);

    this.emit('orderBookUpdate', { exchange, data });
  }

  private handleOrderUpdate(exchange: string, data: Order): void {
    this.emit('orderUpdate', { exchange, data });
  }

  private handlePositionUpdate(exchange: string, data: Position): void {
    this.emit('positionUpdate', { exchange, data });
  }

  // Public API methods
  async getExchangeInfo(exchange?: string): Promise<ExchangeInfo[]> {
    const results: ExchangeInfo[] = [];
    const targets = exchange ? [exchange] : Array.from(this.connectors.keys());

    for (const name of targets) {
      const connector = this.connectors.get(name);
      if (connector) {
        try {
          const info = await connector.getExchangeInfo();
          results.push(info);
        } catch (error) {
          console.error(`Failed to get exchange info for ${name}:`, error);
        }
      }
    }

    return results;
  }

  async getMarketData(symbol: string, exchange?: string): Promise<MarketData | AggregatedMarketData> {
    if (exchange) {
      const connector = this.connectors.get(exchange);
      if (!connector) {
        throw new Error(`Exchange ${exchange} not found`);
      }
      return await connector.getMarketData(symbol);
    }

    // Return aggregated data
    const exchangeData: Record<string, MarketData> = {};
    
    for (const [name, connector] of this.connectors) {
      try {
        const data = await connector.getMarketData(symbol);
        exchangeData[name] = data;
      } catch (error) {
        // Continue with other exchanges
      }
    }

    if (Object.keys(exchangeData).length === 0) {
      throw new Error(`No market data available for ${symbol}`);
    }

    return this.aggregateMarketData(symbol, exchangeData);
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const balancesByExchange: Record<string, Balance[]> = {};
    const positionsByExchange: Record<string, Position[]> = {};
    const allOrders: Order[] = [];

    // Collect data from all exchanges
    for (const [name, connector] of this.connectors) {
      try {
        const [balances, positions, orders] = await Promise.all([
          connector.getBalances(),
          connector.getPositions(),
          connector.getOrders(),
        ]);

        balancesByExchange[name] = balances;
        positionsByExchange[name] = positions;
        allOrders.push(...orders.map(order => ({ ...order, exchange: name } as any)));
      } catch (error) {
        console.error(`Failed to get portfolio data from ${name}:`, error);
      }
    }

    // Calculate total portfolio value
    let totalValue = 0;
    let totalPnL = 0;

    for (const balances of Object.values(balancesByExchange)) {
      for (const balance of balances) {
        totalValue += balance.usdValue || 0;
      }
    }

    for (const positions of Object.values(positionsByExchange)) {
      for (const position of positions) {
        totalPnL += position.unrealizedPnl + position.realizedPnl;
      }
    }

    const totalPnLPercent = totalValue > 0 ? (totalPnL / totalValue) * 100 : 0;

    return {
      totalValue,
      totalPnL,
      totalPnLPercent,
      balancesByExchange,
      positionsByExchange,
      activeOrders: allOrders.filter(order => order.status === 'open' || order.status === 'pending'),
      strategies: Array.from(this.strategies.values()),
    };
  }

  async placeOrder(trade: Trade, exchange?: string): Promise<Order> {
    const targetExchange = exchange || this.config.defaultExchange;
    const connector = this.connectors.get(targetExchange);
    
    if (!connector) {
      throw new Error(`Exchange ${targetExchange} not found`);
    }

    // Apply risk management checks
    await this.validateTrade(trade, targetExchange);

    try {
      const order = await connector.placeOrder(trade);
      this.emit('orderPlaced', { exchange: targetExchange, order });
      return order;
    } catch (error) {
      this.emit('orderError', { exchange: targetExchange, trade, error });
      throw error;
    }
  }

  private async validateTrade(trade: Trade, exchange: string): Promise<void> {
    const { riskManagement } = this.config;
    
    // Check position size limits
    const positions = await this.connectors.get(exchange)!.getPositions();
    const existingPosition = positions.find(p => p.symbol === trade.symbol);
    const newSize = (existingPosition?.size || 0) + trade.quantity;
    
    if (newSize > riskManagement.maxPositionSize) {
      throw new Error(`Position size ${newSize} exceeds maximum allowed ${riskManagement.maxPositionSize}`);
    }

    // Check daily loss limits
    const summary = await this.getPortfolioSummary();
    if (summary.totalPnL < -riskManagement.maxDailyLoss) {
      throw new Error(`Daily loss limit exceeded: ${summary.totalPnL}`);
    }

    // Additional risk checks can be added here
  }

  async cancelOrder(orderId: string, symbol: string, exchange: string): Promise<boolean> {
    const connector = this.connectors.get(exchange);
    if (!connector) {
      throw new Error(`Exchange ${exchange} not found`);
    }

    try {
      const result = await connector.cancelOrder(orderId, symbol);
      if (result) {
        this.emit('orderCancelled', { exchange, orderId, symbol });
      }
      return result;
    } catch (error) {
      this.emit('orderError', { exchange, orderId, symbol, error });
      throw error;
    }
  }

  // Strategy management
  addStrategy(strategy: TradingStrategy): void {
    this.strategies.set(strategy.id, strategy);
    this.emit('strategyAdded', strategy);
  }

  removeStrategy(strategyId: string): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      this.strategies.delete(strategyId);
      this.emit('strategyRemoved', strategy);
    }
  }

  updateStrategy(strategyId: string, updates: Partial<TradingStrategy>): void {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      Object.assign(strategy, updates);
      this.emit('strategyUpdated', strategy);
    }
  }

  getStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  // Arbitrage opportunities
  async findArbitrageOpportunities(symbol: string): Promise<Array<{
    symbol: string;
    buyExchange: string;
    sellExchange: string;
    buyPrice: number;
    sellPrice: number;
    profit: number;
    profitPercent: number;
  }>> {
    const opportunities: any[] = [];
    const symbolCache = this.marketDataCache.get(symbol);
    
    if (!symbolCache || symbolCache.size < 2) {
      return opportunities;
    }

    const exchanges = Array.from(symbolCache.entries());
    
    for (let i = 0; i < exchanges.length; i++) {
      for (let j = i + 1; j < exchanges.length; j++) {
        const [exchange1, data1] = exchanges[i];
        const [exchange2, data2] = exchanges[j];
        
        const spread1to2 = data2.bid - data1.ask;
        const spread2to1 = data1.bid - data2.ask;
        
        if (spread1to2 > 0) {
          const profitPercent = (spread1to2 / data1.ask) * 100;
          if (profitPercent > 0.1) { // Minimum 0.1% profit
            opportunities.push({
              symbol,
              buyExchange: exchange1,
              sellExchange: exchange2,
              buyPrice: data1.ask,
              sellPrice: data2.bid,
              profit: spread1to2,
              profitPercent,
            });
          }
        }
        
        if (spread2to1 > 0) {
          const profitPercent = (spread2to1 / data2.ask) * 100;
          if (profitPercent > 0.1) { // Minimum 0.1% profit
            opportunities.push({
              symbol,
              buyExchange: exchange2,
              sellExchange: exchange1,
              buyPrice: data2.ask,
              sellPrice: data1.bid,
              profit: spread2to1,
              profitPercent,
            });
          }
        }
      }
    }
    
    return opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
  }

  async shutdown(): Promise<void> {
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }

    // Disconnect all exchanges
    const disconnectPromises = Array.from(this.connectors.values()).map(
      connector => connector.disconnect()
    );

    await Promise.allSettled(disconnectPromises);
    this.emit('shutdown');
  }

  // Utility methods
  getConnectedExchanges(): string[] {
    return Array.from(this.connectors.entries())
      .filter(([, connector]) => connector.getConnectionStatus())
      .map(([name]) => name);
  }

  isExchangeConnected(exchange: string): boolean {
    const connector = this.connectors.get(exchange);
    return connector ? connector.getConnectionStatus() : false;
  }

  getMarketDataCache(): Map<string, Map<string, MarketData>> {
    return this.marketDataCache;
  }
}

export default TradingManager; 