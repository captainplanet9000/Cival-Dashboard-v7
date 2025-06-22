import { NextRequest, NextResponse } from 'next/server';
import { 
  getAgentPermissions, 
  getAgentTrades,
  calculateAgentPerformance
} from '@/lib/agents/agent-trading-service';

// Mock authentication for now - replace with your actual auth
async function checkAuth(req: NextRequest) {
  // TODO: Implement actual authentication
  return { user: { id: 'demo-user' } };
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const symbol = searchParams.get('symbol');
    const strategy = searchParams.get('strategy');
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    // Check if agent exists
    const agent = await getAgentPermissions(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Check if user owns the agent
    if (agent.accountId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Get agent trades using shared service
    const { trades, total } = await getAgentTrades(agentId, {
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      symbol: symbol || undefined,
      strategy: strategy || undefined,
      limit,
      offset
    });
    
    // Get agent performance metrics
    const performance = await calculateAgentPerformance(agentId);
    
    // Extract trade statistics from trades
    let totalBuys = 0;
    let totalSells = 0;
    let successfulTrades = 0;
    let totalVolume = 0;
    
    trades.forEach(trade => {
      if (trade.side === 'buy') totalBuys++;
      if (trade.side === 'sell') totalSells++;
      if (trade.status === 'filled' || trade.status === 'completed') successfulTrades++;
      totalVolume += trade.quantity * trade.price;
    });
    
    return NextResponse.json({
      agentId,
      trades,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + trades.length < total
      },
      statistics: {
        totalTrades: total,
        totalBuys,
        totalSells,
        successfulTrades,
        successRate: total > 0 ? (successfulTrades / trades.length) * 100 : 0,
        totalVolume,
        performance
      }
    });
    
  } catch (error) {
    console.error('Error fetching agent trading history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trading history' },
      { status: 500 }
    );
  }
}