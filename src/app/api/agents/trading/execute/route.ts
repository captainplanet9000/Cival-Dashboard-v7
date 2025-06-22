import { NextRequest, NextResponse } from 'next/server';
import { TradingManager } from '@/lib/trading/trading-manager';

// Mock authentication and permissions
async function checkAuth(req: NextRequest) {
  return { user: { id: 'demo-user' } };
}

// In-memory storage - replace with database
const agentPermissions = new Map();
const agentTrades = new Map();

// Initialize trading manager with mock config for demo
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

export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      agentId, 
      symbol, 
      side, 
      quantity, 
      orderType = 'limit',
      price,
      strategy,
      reasoning,
      confidence,
      exchange = 'hyperliquid'
    } = body;

    // Validate required fields
    if (!agentId || !symbol || !side || !quantity) {
      return NextResponse.json({ 
        error: 'Missing required fields: agentId, symbol, side, quantity' 
      }, { status: 400 });
    }

    // Check agent permissions
    const agent = agentPermissions.get(agentId);
    if (!agent || !agent.isActive) {
      return NextResponse.json({ 
        error: 'Agent not registered or inactive' 
      }, { status: 403 });
    }

    // Validate permissions
    const validationErrors = [];
    
    // Check symbol permission
    if (!agent.allowedSymbols.includes(symbol)) {
      validationErrors.push(`Symbol ${symbol} not allowed for agent`);
    }
    
    // Check strategy permission
    if (strategy && !agent.allowedStrategies.includes(strategy)) {
      validationErrors.push(`Strategy ${strategy} not allowed for agent`);
    }
    
    // Check trade size
    const tradeValue = quantity * (price || 0);
    if (tradeValue > agent.maxTradeSize) {
      validationErrors.push(`Trade size ${tradeValue} exceeds max ${agent.maxTradeSize}`);
    }
    
    // Check daily trade limit
    if (agent.tradesToday >= agent.maxDailyTrades) {
      validationErrors.push(`Daily trade limit reached: ${agent.maxDailyTrades}`);
    }
    
    // Check position size
    const newPositionValue = agent.positionValue + (side === 'buy' ? tradeValue : -tradeValue);
    if (Math.abs(newPositionValue) > agent.maxPositionSize) {
      validationErrors.push(`Position size would exceed max ${agent.maxPositionSize}`);
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json({ 
        error: 'Trade validation failed', 
        details: validationErrors 
      }, { status: 400 });
    }

    // Execute trade through trading manager
    try {
      const tradeParams = {
        id: `trade-${Date.now()}-${agentId}`,
        symbol,
        side,
        type: orderType,
        quantity,
        price
      };
      
      const result = await tradingManager.placeOrder(tradeParams, exchange);
      
      // Record trade
      const trade = {
        id: `trade-${Date.now()}`,
        agentId,
        orderId: result.id,
        symbol,
        side,
        quantity,
        price: result.averagePrice || price,
        orderType,
        strategy,
        reasoning,
        confidenceScore: confidence,
        status: result.status,
        exchange,
        executedAt: new Date(),
        createdAt: new Date()
      };
      
      // Store trade (in-memory for demo)
      if (!agentTrades.has(agentId)) {
        agentTrades.set(agentId, []);
      }
      agentTrades.get(agentId).push(trade);
      
      // Update agent stats
      agent.tradesToday += 1;
      if (side === 'buy') {
        agent.positionValue += tradeValue;
      } else {
        agent.positionValue -= tradeValue;
      }
      
      return NextResponse.json({
        success: true,
        trade: {
          orderId: result.id,
          status: result.status,
          executedPrice: result.averagePrice,
          executedQuantity: result.filledQuantity,
          timestamp: trade.executedAt
        }
      });
      
    } catch (error) {
      console.error('Trade execution error:', error);
      return NextResponse.json({ 
        error: 'Failed to execute trade',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Agent trading error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
