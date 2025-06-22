/**
 * Agent Trading Service
 * Provides utilities for agent trading API interactions
 */
import { TradingManager } from '@/lib/trading/trading-manager';

// Types for agent trading
export interface AgentPermission {
  agentId: string;
  accountId: string;
  maxTradeSize: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  allowedSymbols: string[];
  allowedStrategies: string[];
  riskLevel: string;
  isActive: boolean;
  tradesToday: number;
  positionValue: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AgentTrade {
  id: string;
  agentId: string;
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  orderType: string;
  strategy?: string;
  reasoning?: string;
  confidenceScore?: number;
  status: string;
  exchange: string;
  executedAt: Date;
  createdAt: Date;
}

export interface AgentStatus {
  agentId: string;
  status: 'active' | 'idle' | 'trading' | 'error' | 'inactive';
  lastActivity: Date;
  performance: {
    totalTrades: number;
    successfulTrades: number;
    profitLoss: number;
    winRate: number;
  };
}

export interface MarketDataSubscription {
  id: string;
  agentId: string;
  userId: string;
  symbol: string;
  interval: string;
  active: boolean;
  createdAt: Date;
}

// In-memory storage - will be replaced with database
const agentPermissions = new Map<string, AgentPermission>();
const agentTrades = new Map<string, AgentTrade[]>();
const agentStatus = new Map<string, AgentStatus>();
const marketDataSubscriptions = new Map<string, MarketDataSubscription>();

// Trading manager instance with mock config
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

const tradingManager = new TradingManager(tradingManagerConfig);

/**
 * Get agent permissions
 */
export async function getAgentPermissions(agentId: string): Promise<AgentPermission | null> {
  return agentPermissions.get(agentId) || null;
}

/**
 * Register agent with trading permissions
 */
export async function registerAgent(agentConfig: Partial<AgentPermission>): Promise<AgentPermission> {
  const { agentId, accountId } = agentConfig;
  
  if (!agentId || !accountId) {
    throw new Error('Agent ID and account ID are required');
  }
  
  // Check if agent already exists
  if (agentPermissions.has(agentId)) {
    throw new Error('Agent already registered');
  }
  
  // Create agent permissions
  const agent: AgentPermission = {
    agentId,
    accountId,
    maxTradeSize: agentConfig.maxTradeSize || 10000,
    maxPositionSize: agentConfig.maxPositionSize || 50000,
    maxDailyTrades: agentConfig.maxDailyTrades || 100,
    allowedSymbols: agentConfig.allowedSymbols || ['BTC', 'ETH', 'SOL'],
    allowedStrategies: agentConfig.allowedStrategies || ['momentum', 'mean_reversion', 'arbitrage'],
    riskLevel: agentConfig.riskLevel || 'moderate',
    isActive: agentConfig.isActive !== undefined ? agentConfig.isActive : true,
    tradesToday: 0,
    positionValue: 0,
    createdAt: new Date()
  };
  
  agentPermissions.set(agentId, agent);
  
  // Initialize empty trades array
  agentTrades.set(agentId, []);
  
  // Initialize agent status
  agentStatus.set(agentId, {
    agentId,
    status: agent.isActive ? 'idle' : 'inactive',
    lastActivity: new Date(),
    performance: {
      totalTrades: 0,
      successfulTrades: 0,
      profitLoss: 0,
      winRate: 0
    }
  });
  
  return agent;
}

/**
 * Execute trade on behalf of agent
 */
export async function executeTrade(tradeParams: {
  agentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType?: string;
  price?: number;
  strategy?: string;
  reasoning?: string;
  confidence?: number;
  exchange?: string;
}): Promise<AgentTrade> {
  const { agentId, symbol, side, quantity, price, strategy, reasoning, confidence, exchange = 'hyperliquid' } = tradeParams;
  
  // Get agent permissions
  const agent = agentPermissions.get(agentId);
  if (!agent || !agent.isActive) {
    throw new Error('Agent not registered or inactive');
  }
  
  // Validate permissions
  validateTradePermissions(agent, tradeParams);
  
  // Execute trade through trading manager
  const result = await tradingManager.placeOrder({
    id: `trade-${Date.now()}-${agentId}`,
    symbol,
    side,
    type: (tradeParams.orderType as 'market' | 'limit' | 'stop' | 'stop_limit') || 'limit',
    quantity,
    price
  }, exchange);
  
  // Record trade
  const trade: AgentTrade = {
    id: `trade-${Date.now()}`,
    agentId,
    orderId: result.id,
    symbol,
    side,
    quantity,
    price: result.price || price || 0,
    orderType: tradeParams.orderType || 'limit',
    strategy,
    reasoning,
    confidenceScore: confidence,
    status: result.status,
    exchange,
    executedAt: new Date(),
    createdAt: new Date()
  };
  
  // Store trade
  const agentTradeList = agentTrades.get(agentId) || [];
  agentTradeList.push(trade);
  agentTrades.set(agentId, agentTradeList);
  
  // Update agent stats
  const tradeValue = quantity * (price || 0);
  agent.tradesToday += 1;
  
  if (side === 'buy') {
    agent.positionValue += tradeValue;
  } else {
    agent.positionValue -= tradeValue;
  }
  
  // Update agent status
  updateAgentStatus(agentId, 'trading');
  
  // Schedule status update to idle after delay
  setTimeout(() => {
    updateAgentStatus(agentId, 'idle');
  }, 5000);
  
  return trade;
}

/**
 * Validate trade permissions
 */
function validateTradePermissions(agent: AgentPermission, tradeParams: any): void {
  const validationErrors: string[] = [];
  
  // Check symbol permission
  if (!agent.allowedSymbols.includes(tradeParams.symbol)) {
    validationErrors.push(`Symbol ${tradeParams.symbol} not allowed for agent`);
  }
  
  // Check strategy permission
  if (tradeParams.strategy && !agent.allowedStrategies.includes(tradeParams.strategy)) {
    validationErrors.push(`Strategy ${tradeParams.strategy} not allowed for agent`);
  }
  
  // Check trade size
  const tradeValue = tradeParams.quantity * (tradeParams.price || 0);
  if (tradeValue > agent.maxTradeSize) {
    validationErrors.push(`Trade size ${tradeValue} exceeds max ${agent.maxTradeSize}`);
  }
  
  // Check daily trade limit
  if (agent.tradesToday >= agent.maxDailyTrades) {
    validationErrors.push(`Daily trade limit reached: ${agent.maxDailyTrades}`);
  }
  
  // Check position size
  const newPositionValue = agent.positionValue + (tradeParams.side === 'buy' ? tradeValue : -tradeValue);
  if (Math.abs(newPositionValue) > agent.maxPositionSize) {
    validationErrors.push(`Position size would exceed max ${agent.maxPositionSize}`);
  }
  
  if (validationErrors.length > 0) {
    throw new Error(`Trade validation failed: ${validationErrors.join(', ')}`);
  }
}

/**
 * Update agent status
 */
export async function updateAgentStatus(agentId: string, newStatus: AgentStatus['status'], performance?: Partial<AgentStatus['performance']>): Promise<AgentStatus> {
  // Get current status
  const status = agentStatus.get(agentId);
  
  if (!status) {
    throw new Error('Agent status not found');
  }
  
  // Update status
  const updatedStatus: AgentStatus = {
    ...status,
    status: newStatus,
    lastActivity: new Date(),
    performance: performance ? {
      ...status.performance,
      ...performance
    } : status.performance
  };
  
  agentStatus.set(agentId, updatedStatus);
  
  return updatedStatus;
}

/**
 * Get agent trades
 */
export async function getAgentTrades(agentId: string, filters?: {
  fromDate?: Date;
  toDate?: Date;
  symbol?: string;
  strategy?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  trades: AgentTrade[];
  total: number;
}> {
  // Get agent trades
  let trades = agentTrades.get(agentId) || [];
  
  // Apply filters
  if (filters) {
    if (filters.fromDate) {
      trades = trades.filter(trade => 
        trade.executedAt.getTime() >= filters.fromDate!.getTime()
      );
    }
    
    if (filters.toDate) {
      trades = trades.filter(trade => 
        trade.executedAt.getTime() <= filters.toDate!.getTime()
      );
    }
    
    if (filters.symbol) {
      trades = trades.filter(trade => 
        trade.symbol.toLowerCase() === filters.symbol!.toLowerCase()
      );
    }
    
    if (filters.strategy) {
      trades = trades.filter(trade => 
        trade.strategy?.toLowerCase() === filters.strategy!.toLowerCase()
      );
    }
  }
  
  // Sort by executed date, newest first
  trades.sort((a, b) => 
    b.executedAt.getTime() - a.executedAt.getTime()
  );
  
  // Apply pagination
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;
  const paginatedTrades = trades.slice(offset, offset + limit);
  
  return {
    trades: paginatedTrades,
    total: trades.length
  };
}

/**
 * Create market data subscription
 */
export async function createMarketDataSubscription(params: {
  agentId: string;
  userId: string;
  symbol: string;
  interval?: string;
}): Promise<MarketDataSubscription> {
  const { agentId, userId, symbol, interval = '1m' } = params;
  
  // Create subscription
  const subscription: MarketDataSubscription = {
    id: `sub_${Date.now()}`,
    agentId,
    userId,
    symbol,
    interval,
    active: true,
    createdAt: new Date()
  };
  
  // Store subscription
  marketDataSubscriptions.set(subscription.id, subscription);
  
  return subscription;
}

/**
 * Cancel market data subscription
 */
export async function cancelMarketDataSubscription(subscriptionId: string): Promise<boolean> {
  // Check if subscription exists
  const subscription = marketDataSubscriptions.get(subscriptionId);
  
  if (!subscription) {
    return false;
  }
  
  // Update subscription status
  subscription.active = false;
  marketDataSubscriptions.set(subscriptionId, subscription);
  
  return true;
}

/**
 * Calculate agent performance metrics
 */
export async function calculateAgentPerformance(agentId: string): Promise<AgentStatus['performance']> {
  // Get agent trades
  const trades = agentTrades.get(agentId) || [];
  
  // Calculate metrics
  const totalTrades = trades.length;
  const successfulTrades = trades.filter(trade => 
    trade.status === 'filled' || trade.status === 'completed'
  ).length;
  
  // Calculate profit/loss (simplified)
  let profitLoss = 0;
  trades.forEach(trade => {
    const tradeValue = trade.quantity * trade.price;
    if (trade.side === 'buy') {
      profitLoss -= tradeValue;
    } else {
      profitLoss += tradeValue;
    }
  });
  
  // Calculate win rate
  const winRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
  
  return {
    totalTrades,
    successfulTrades,
    profitLoss,
    winRate
  };
}