import { NextRequest, NextResponse } from 'next/server';
import { 
  getAgentPermissions, 
  updateAgentStatus, 
  AgentStatus 
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
    
    // Get agent status (this would be a database call in production)
    const status = {
      status: agent.isActive ? 'idle' : 'inactive',
      lastActivity: agent.createdAt,
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        profitLoss: 0,
        winRate: 0
      }
    } as AgentStatus;
    
    return NextResponse.json({
      agentId,
      status: status.status,
      lastActivity: status.lastActivity,
      performance: status.performance,
      permissions: {
        maxTradeSize: agent.maxTradeSize,
        maxPositionSize: agent.maxPositionSize,
        maxDailyTrades: agent.maxDailyTrades,
        allowedSymbols: agent.allowedSymbols,
        allowedStrategies: agent.allowedStrategies,
        riskLevel: agent.riskLevel
      },
      tradesToday: agent.tradesToday,
      positionValue: agent.positionValue
    });
    
  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await checkAuth(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { agentId, status, performance } = body;
    
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
    
    // Update agent status
    const updatedStatus = await updateAgentStatus(
      agentId, 
      status || 'idle', 
      performance
    );
    
    return NextResponse.json({
      agentId,
      status: updatedStatus.status,
      lastActivity: updatedStatus.lastActivity,
      performance: updatedStatus.performance,
      updated: true
    });
    
  } catch (error) {
    console.error('Error updating agent status:', error);
    return NextResponse.json(
      { error: 'Failed to update agent status' },
      { status: 500 }
    );
  }
}