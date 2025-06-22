// Trading Agent Bridge - Connects AI agents to trading execution
import { Agent, AgentMessage } from '@/types/agent';
import { Order } from '@/types/trading';
import { Trade } from '@/lib/trading/exchange-connectors/base-connector';
import { tradingClient } from '@/lib/clients/trading-client';

export class TradingAgentBridge {
  private agentPermissions: Map<string, TradingPermissions>;
  
  constructor() {
    this.agentPermissions = new Map();
  }

  // Register an agent with trading permissions
  async registerTradingAgent(
    agentId: string, 
    permissions: TradingPermissions
  ): Promise<void> {
    this.agentPermissions.set(agentId, permissions);
    
    // Register with backend
    await fetch('/api/agents/trading-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, permissions })
    });
  }

  // Execute trade on behalf of agent
  async executeTrade(
    agentId: string,
    tradeRequest: TradeRequest
  ): Promise<TradeResult> {
    // Validate permissions
    const permissions = this.agentPermissions.get(agentId);
    if (!permissions) {
      throw new Error(`Agent ${agentId} not registered for trading`);
    }

    // Check risk limits
    if (!this.validateRiskLimits(tradeRequest, permissions)) {
      throw new Error('Trade exceeds agent risk limits');
    }

    // Execute through trading client
    const order = await tradingClient.placeOrder(
      tradeRequest.accountId,
      {
        account_id: tradeRequest.accountId,
        symbol: tradeRequest.symbol,
        order_type: tradeRequest.orderType,
        side: tradeRequest.side,
        quantity: tradeRequest.quantity,
        price: tradeRequest.price,
        time_in_force: 'gtc'
      }
    );

    if (!order) {
      throw new Error('Order placement failed');
    }

    return {
      orderId: order.id,
      status: order.status,
      executedAt: new Date().toISOString(),
      agentId
    };
  }

  // Monitor agent positions
  async getAgentPositions(agentId: string): Promise<Position[]> {
    const response = await fetch(`/api/agents/${agentId}/positions`);
    return response.json();
  }

  // Risk validation
  private validateRiskLimits(
    trade: TradeRequest,
    permissions: TradingPermissions
  ): boolean {
    const tradeValue = trade.quantity * (trade.price || 0);
    
    return (
      tradeValue <= permissions.maxTradeSize &&
      trade.quantity <= permissions.maxPositionSize &&
      permissions.allowedSymbols.includes(trade.symbol) &&
      permissions.allowedStrategies.includes(trade.strategy)
    );
  }
}

interface TradingPermissions {
  maxTradeSize: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  allowedSymbols: string[];
  allowedStrategies: string[];
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
}

interface TradeRequest {
  accountId: string;
  symbol: string;
  orderType: 'market' | 'limit' | 'stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  strategy: string;
  reasoning: string;
}

interface TradeResult {
  orderId: string;
  status: string;
  executedAt: string;
  agentId: string;
}

interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  agentId: string;
}

export const tradingAgentBridge = new TradingAgentBridge();
