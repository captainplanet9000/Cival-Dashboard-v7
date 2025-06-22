import { TradingManager } from './trading-manager';
import { io, Socket } from 'socket.io-client';

export interface AgentTrade {
  agentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit';
  price?: number;
  strategy?: string;
  reasoning?: string;
  confidence?: number;
  exchange?: string;
}

export interface AgentPermissions {
  maxTradeSize: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  allowedSymbols: string[];
  allowedStrategies: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
}

export class TradingAgentBridge {
  private socket: Socket | null = null;
  private agentId: string;
  private permissions: AgentPermissions | null = null;
  private tradingManager: TradingManager;

  constructor(agentId: string) {
    this.agentId = agentId;
    
    // Initialize trading manager with mock config
    const tradingManagerConfig = {
      exchanges: {
        hyperliquid: {
          type: 'hyperliquid' as const,
          credentials: { apiKey: 'demo', apiSecret: 'demo' },
          enabled: true,
          priority: 1
        }
      },
      defaultExchange: 'hyperliquid',
      realTimeDataEnabled: false,
      aggregateOrderBooks: false,
      riskManagement: {
        maxPositionSize: 10000,
        maxDailyLoss: 1000,
        stopLossPercentage: 5,
        takeProfitPercentage: 10
      }
    };
    
    this.tradingManager = new TradingManager(tradingManagerConfig);
  }

  async connect(wsUrl?: string) {
    const url = wsUrl || process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log(`Agent ${this.agentId} connected to trading system`);
      this.socket?.emit('agent:register', this.agentId);
    });

    this.socket.on('market:update', (data) => {
      this.handleMarketUpdate(data);
    });

    this.socket.on('trade:executed', (trade) => {
      this.handleTradeExecuted(trade);
    });

    this.socket.on('risk:alert', (alert) => {
      this.handleRiskAlert(alert);
    });
  }

  async registerAgent(permissions: AgentPermissions) {
    const response = await fetch('/api/agents/trading/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        ...permissions
      })
    });

    if (!response.ok) {
      throw new Error('Failed to register agent');
    }

    const data = await response.json();
    this.permissions = data.agent.permissions;
    return data;
  }

  async executeTrade(trade: Omit<AgentTrade, 'agentId'>) {
    const response = await fetch('/api/agents/trading/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        ...trade
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute trade');
    }

    return response.json();
  }

  subscribeToMarketData(symbols: string[]) {
    if (this.socket) {
      this.socket.emit('agent:subscribe:market', symbols);
    }
  }

  private handleMarketUpdate(data: any) {
    // Override this method in agent implementation
    console.log(`Market update for ${data.symbol}:`, data);
  }

  private handleTradeExecuted(trade: any) {
    // Override this method in agent implementation
    console.log(`Trade executed:`, trade);
  }

  private handleRiskAlert(alert: any) {
    // Override this method in agent implementation
    console.log(`Risk alert:`, alert);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Example usage for AI agents
export class TradingAgent extends TradingAgentBridge {
  private strategy: string;

  constructor(agentId: string, strategy: string) {
    super(agentId);
    this.strategy = strategy;
  }

  protected onMarketUpdate(data: any) {
    // Implement your trading logic here
    this.analyzeAndTrade(data);
  }

  private async analyzeAndTrade(marketData: any) {
    // Example: Simple momentum strategy
    if (this.strategy === 'momentum') {
      const { symbol, data } = marketData;
      
      // Check if price is rising
      if (data.changePercent > 2) {
        try {
          await this.executeTrade({
            symbol,
            side: 'buy',
            quantity: 0.1,
            orderType: 'market',
            strategy: this.strategy,
            reasoning: 'Positive momentum detected',
            confidence: 0.75
          });
        } catch (error) {
          console.error('Trade execution failed:', error);
        }
      }
    }
  }
}
