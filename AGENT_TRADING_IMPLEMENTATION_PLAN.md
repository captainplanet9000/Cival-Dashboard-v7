# Agent Trading Implementation Plan

## Overview

This plan outlines the implementation of agent trading capabilities, connecting AI agents with the existing trading infrastructure in the Trading Farm dashboard. The implementation bridges the gap between agent decision-making and order execution across multiple exchanges.

## Current State Assessment

**✅ What's Already Built:**
- Exchange Infrastructure: Connectors for Hyperliquid, Uniswap, and other exchanges
- Trading Manager: Central orchestration system for multi-exchange trading
- Trading API: Backend endpoints for market data and order execution
- Frontend Dashboard: Complete trading UI with live data, portfolio, and strategies
- Python AI Services: Basic structure with a trading coordinator skeleton
- Database Schema: Agent trading tables designed but not applied

**❌ What's Missing for Agent Trading:**
- Agent-Trading Bridge: No connection between AI agents and trading execution
- Agent API Endpoints: Empty /api/agents/trading/ directory
- Permission System: No implementation of agent trading permissions
- Real-time Data Feed: Agents not receiving market data
- Agent Monitoring UI: No frontend for agent management

## Phase 1: Complete Agent-Trading Bridge (Backend)

### 1. Enhance Trading Coordinator Service

Expand the `TradingCoordinator` class to connect with the trading execution system:

```python
# C:\TradingFarm\cival-dashboard\python-ai-services\services\trading_coordinator.py
class TradingCoordinator:
    async def execute_trade(self, trade_request: TradeRequest) -> TradeResult:
        """Execute a trade through the Next.js API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:3000/api/agents/trading/execute",
                json=trade_request.dict(),
                timeout=30.0
            )
            response.raise_for_status()
            return TradeResult(**response.json())
            
    async def register_agent(self, agent_config: AgentRegistration) -> AgentRegistrationResult:
        """Register agent with trading permissions"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:3000/api/agents/trading/register",
                json=agent_config.dict(),
                timeout=10.0
            )
            response.raise_for_status()
            return AgentRegistrationResult(**response.json())
```

### 2. Implement Market Data Feed for Agents

Create a new service to handle market data delivery to agents:

```python
# C:\TradingFarm\cival-dashboard\python-ai-services\services\market_data_service.py
class MarketDataService:
    def __init__(self, google_bridge, a2a_protocol):
        self.google_bridge = google_bridge
        self.a2a_protocol = a2a_protocol
        self.subscriptions = {}
        
    async def subscribe_to_market_data(self, symbol: str, interval: str = "1m"):
        """Subscribe to market data for a specific symbol"""
        # Implementation with WebSocket connection to trading system
        
    async def get_historical_data(self, symbol: str, interval: str, limit: int = 100):
        """Get historical market data"""
        # Implementation with REST API call to trading system
```

### 3. Create Agent State Management

Implement persistence for agent trading states:

```python
# C:\TradingFarm\cival-dashboard\python-ai-services\services\agent_state_manager.py
class AgentStateManager:
    def __init__(self, db_connection_string):
        self.db = Database(db_connection_string)
        
    async def update_agent_state(self, agent_id: str, state: dict):
        """Update the agent's state in the database"""
        
    async def get_agent_state(self, agent_id: str) -> dict:
        """Retrieve the agent's state from the database"""
```

## Phase 2: Extend Next.js API Endpoints

### 1. Add Agent Status Endpoint

```typescript
// C:\TradingFarm\cival-dashboard\src\app\api\agents\trading\status\route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    // Fetch agent status from database
    const agentStatus = await getAgentStatus(agentId);
    
    return NextResponse.json(agentStatus);
  } catch (error) {
    console.error('Error fetching agent status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent status' },
      { status: 500 }
    );
  }
}
```

### 2. Create Market Data Streaming Endpoint

```typescript
// C:\TradingFarm\cival-dashboard\src\app\api\agents\trading\market-data\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMarketDataStream } from '@/lib/trading/market-data-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '1m';
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }
    
    // Get market data
    const marketData = await getMarketDataStream(symbol, interval);
    
    return NextResponse.json(marketData);
  } catch (error) {
    console.error('Error fetching market data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
```

### 3. Trading History Endpoint

```typescript
// C:\TradingFarm\cival-dashboard\src\app\api\agents\trading\history\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAgentTradingHistory } from '@/lib/agents/agent-history-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }
    
    // Get agent trading history
    const history = await getAgentTradingHistory(agentId);
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching agent trading history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent trading history' },
      { status: 500 }
    );
  }
}
```

## Phase 3: Implement Database Schema

Apply the existing `agent_trading_schema.sql` with adjustments for permissions:

```sql
-- Extend the agent_permissions table
CREATE TABLE IF NOT EXISTS agent_permissions (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) UNIQUE NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  max_trade_size DECIMAL(18, 8) NOT NULL,
  max_position_size DECIMAL(18, 8) NOT NULL,
  max_daily_trades INTEGER NOT NULL,
  allowed_symbols JSONB NOT NULL,
  allowed_strategies JSONB NOT NULL,
  risk_level VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  trades_today INTEGER DEFAULT 0,
  position_value DECIMAL(18, 8) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create agent_trades table
CREATE TABLE IF NOT EXISTS agent_trades (
  id SERIAL PRIMARY KEY,
  trade_id VARCHAR(255) UNIQUE NOT NULL,
  agent_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,
  quantity DECIMAL(18, 8) NOT NULL,
  price DECIMAL(18, 8) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  strategy VARCHAR(50),
  reasoning TEXT,
  confidence_score DECIMAL(5, 2),
  status VARCHAR(20) NOT NULL,
  exchange VARCHAR(50) NOT NULL,
  executed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create agent_market_data_subscriptions table
CREATE TABLE IF NOT EXISTS agent_market_data_subscriptions (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, symbol, interval)
);

-- Create agent_performance_metrics table
CREATE TABLE IF NOT EXISTS agent_performance_metrics (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL,
  total_trades INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  failed_trades INTEGER DEFAULT 0,
  total_profit_loss DECIMAL(18, 8) DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  average_trade_duration INTEGER DEFAULT 0,
  max_drawdown DECIMAL(18, 8) DEFAULT 0,
  sharpe_ratio DECIMAL(8, 4) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id)
);
```

## Phase 4: Implement Frontend Components

### 1. Agent Trading Management UI

```typescript
// C:\TradingFarm\cival-dashboard\src\components\agent\AgentTradingControls.tsx
import React, { useState, useEffect } from 'react';
import { Button, Card, Input, Select, Switch, Tabs } from '@/components/ui';
import { AgentPermissions, AgentTrade } from '@/types/agent-types';

export default function AgentTradingControls({ agentId }: { agentId: string }) {
  const [permissions, setPermissions] = useState<AgentPermissions | null>(null);
  const [trades, setTrades] = useState<AgentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch agent permissions and trades
    async function fetchAgentData() {
      // Implementation
    }
    
    fetchAgentData();
  }, [agentId]);
  
  // UI implementation for agent control panel
}
```

### 2. Real-time Trading Dashboard for Agents

```typescript
// C:\TradingFarm\cival-dashboard\src\components\agent\AgentTradingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner } from '@/components/ui';
import { TradeHistoryChart } from '@/components/charts';
import { useAgentTrades } from '@/hooks/useAgentTrades';

export default function AgentTradingDashboard({ agentId }: { agentId: string }) {
  const { trades, loading, error } = useAgentTrades(agentId);
  
  // Implementation of agent trading dashboard UI
}
```

### 3. Agent Performance Metrics UI

```typescript
// C:\TradingFarm\cival-dashboard\src\components\agent\AgentPerformanceMetrics.tsx
import React from 'react';
import { Card, Grid, Stat, Progress } from '@/components/ui';
import { useAgentPerformance } from '@/hooks/useAgentPerformance';

export default function AgentPerformanceMetrics({ agentId }: { agentId: string }) {
  const { performance, loading, error } = useAgentPerformance(agentId);
  
  if (loading) return <div>Loading performance metrics...</div>;
  if (error) return <div>Error loading metrics: {error.message}</div>;
  
  // Implementation of performance metrics UI
}
```

## Phase 5: Real-time Data Streaming

### 1. WebSocket Implementation for Market Data

```typescript
// C:\TradingFarm\cival-dashboard\src\lib\websocket\market-data-socket.ts
import { createWebSocketConnection } from '@/lib/websocket/socket-manager';

export function subscribeToMarketData(symbol: string, callback: (data: any) => void) {
  const socket = createWebSocketConnection(`/api/market-data/${symbol}`);
  
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    callback(data);
  };
  
  return () => socket.close();
}
```

### 2. Agent Notification System

```typescript
// C:\TradingFarm\cival-dashboard\src\lib\agents\notification-service.ts
import { createWebSocketConnection } from '@/lib/websocket/socket-manager';

export function subscribeToAgentNotifications(agentId: string, callback: (notification: any) => void) {
  const socket = createWebSocketConnection(`/api/agents/notifications/${agentId}`);
  
  socket.onmessage = (event) => {
    const notification = JSON.parse(event.data);
    callback(notification);
  };
  
  return () => socket.close();
}
```

### 3. Real-time Position Updates

```typescript
// C:\TradingFarm\cival-dashboard\src\lib\agents\position-updates.ts
import { createWebSocketConnection } from '@/lib/websocket/socket-manager';

export function subscribeToPositionUpdates(agentId: string, callback: (positions: any) => void) {
  const socket = createWebSocketConnection(`/api/agents/positions/${agentId}`);
  
  socket.onmessage = (event) => {
    const positions = JSON.parse(event.data);
    callback(positions);
  };
  
  return () => socket.close();
}
```

## Phase 6: Permission System & Security

### 1. Agent Permission Manager

```typescript
// C:\TradingFarm\cival-dashboard\src\lib\agents\permission-manager.ts
import { AgentPermission } from '@/types/agent-types';

export async function validateAgentPermission(agentId: string, action: string, params: any): Promise<boolean> {
  // Fetch agent permissions
  const permissions = await getAgentPermissions(agentId);
  
  // Validate based on action type
  switch (action) {
    case 'trade':
      return validateTradePermission(permissions, params);
    case 'subscribe':
      return validateSubscriptionPermission(permissions, params);
    default:
      return false;
  }
}

function validateTradePermission(permissions: AgentPermission, tradeParams: any): boolean {
  // Implementation of trade permission validation
}

function validateSubscriptionPermission(permissions: AgentPermission, subscriptionParams: any): boolean {
  // Implementation of subscription permission validation
}
```

### 2. API Security Middleware

```typescript
// C:\TradingFarm\cival-dashboard\src\middleware\agent-auth-middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { validateAgentApiKey } from '@/lib/agents/auth-service';

export async function agentAuthMiddleware(req: NextRequest) {
  // Extract API key from request
  const apiKey = req.headers.get('x-agent-api-key');
  
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is required' },
      { status: 401 }
    );
  }
  
  // Validate API key
  const isValid = await validateAgentApiKey(apiKey);
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  // Continue to handler
  return NextResponse.next();
}
```

## Implementation Steps

1. **Backend First**: Implement the Trading Coordinator and Market Data Service
2. **Database Setup**: Apply the agent_trading_schema.sql with adjustments
3. **API Endpoints**: Extend Next.js API endpoints for agent trading
4. **Data Streaming**: Implement WebSocket connections for real-time data
5. **Frontend Components**: Create agent trading management UI
6. **Testing**: Test the complete flow from agent decision to trade execution

## Testing Plan

1. **Unit Tests**: For individual components
   - Test trading coordinator functions
   - Test permission validation logic
   - Test API endpoints with mock requests

2. **Integration Tests**: Between AI service and trading system
   - Test agent registration flow
   - Test market data delivery to agents
   - Test trade execution from agent to trading system

3. **End-to-End Test**: Complete flow from market data to AI decision to trade execution
   - Test complete trading cycle
   - Verify database updates
   - Validate UI updates

4. **Performance Tests**: Ensure real-time data handling works at scale
   - Test with multiple concurrent agents
   - Test with high-frequency market data
   - Verify WebSocket connection stability

## Timeline Estimate

- **Phase 1**: 1-2 weeks
- **Phase 2**: 1 week
- **Phase 3**: 2-3 days
- **Phase 4**: 1-2 weeks
- **Phase 5**: 1 week
- **Phase 6**: 1 week

Total: 5-7 weeks for complete implementation