import { NextRequest, NextResponse } from 'next/server';

// Mock authentication for now - replace with your actual auth
async function checkAuth(req: NextRequest) {
  // TODO: Implement actual authentication
  return { user: { id: 'demo-user' } };
}

// In-memory storage for demo - replace with database
const agentPermissions = new Map();

export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      agentId, 
      maxTradeSize = 10000,
      maxPositionSize = 50000,
      maxDailyTrades = 100,
      allowedSymbols = ['BTC', 'ETH', 'SOL'],
      allowedStrategies = ['momentum', 'mean_reversion', 'arbitrage'],
      riskLevel = 'moderate'
    } = body;

    // Validate agent ID
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json({ error: 'Invalid agent ID' }, { status: 400 });
    }

    // Check if agent already exists
    if (agentPermissions.has(agentId)) {
      return NextResponse.json({ error: 'Agent already registered' }, { status: 409 });
    }

    // Create agent trading permissions
    const agent = {
      agentId,
      accountId: session.user.id,
      maxTradeSize,
      maxPositionSize,
      maxDailyTrades,
      allowedSymbols,
      allowedStrategies,
      riskLevel,
      isActive: true,
      createdAt: new Date(),
      tradesToday: 0,
      positionValue: 0
    };

    agentPermissions.set(agentId, agent);

    return NextResponse.json({
      success: true,
      agent: {
        agentId: agent.agentId,
        permissions: {
          maxTradeSize: agent.maxTradeSize,
          maxPositionSize: agent.maxPositionSize,
          maxDailyTrades: agent.maxDailyTrades,
          allowedSymbols: agent.allowedSymbols,
          allowedStrategies: agent.allowedStrategies,
          riskLevel: agent.riskLevel
        },
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register agent' }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all registered agents for the user
    const agents = Array.from(agentPermissions.values())
      .filter(agent => agent.accountId === session.user.id && agent.isActive);

    return NextResponse.json({
      agents: agents.map(agent => ({
        agentId: agent.agentId,
        permissions: {
          maxTradeSize: agent.maxTradeSize,
          maxPositionSize: agent.maxPositionSize,
          maxDailyTrades: agent.maxDailyTrades,
          allowedSymbols: agent.allowedSymbols,
          allowedStrategies: agent.allowedStrategies,
          riskLevel: agent.riskLevel
        },
        status: agent.isActive ? 'active' : 'inactive',
        tradesToday: agent.tradesToday,
        positionValue: agent.positionValue,
        createdAt: agent.createdAt
      }))
    });

  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' }, 
      { status: 500 }
    );
  }
}
