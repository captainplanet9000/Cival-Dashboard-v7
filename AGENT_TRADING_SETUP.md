# AI Agent Trading Implementation Guide

## 🚀 Current Progress

### ✅ What I've Created:

1. **API Endpoints**:
   - `/api/agents/trading/register` - Register new trading agents
   - `/api/agents/trading/execute` - Execute trades for agents

2. **Trading Agent Bridge** (`src/lib/trading/trading-agent-bridge.ts`):
   - Connects AI agents to trading system
   - Handles WebSocket communication
   - Manages permissions and trade execution

3. **WebSocket Service** (`src/lib/trading/agent-websocket-service.ts`):
   - Real-time market data streaming
   - Trade execution notifications
   - Risk alerts

## 📋 Implementation Steps

### Step 1: Database Setup

First, apply the agent trading schema to your PostgreSQL database:

```bash
# Option 1: If PostgreSQL is installed locally
psql -U your_username -d your_database_name -f C:\TradingFarm\cival-dashboard\agent_trading_schema.sql

# Option 2: Using pgAdmin or another GUI tool
# Copy the contents of agent_trading_schema.sql and execute in your database
```

### Step 2: Update Environment Variables

Add these to your `.env.local`:

```env
# Agent Trading Configuration
ENABLE_AGENT_TRADING=true
AGENT_TRADING_MODE=paper
MAX_AGENTS_PER_ACCOUNT=5
AGENT_WEBSOCKET_PORT=3001

# Risk Management
AGENT_MAX_TRADE_SIZE=10000
AGENT_MAX_POSITION_SIZE=50000
AGENT_MAX_DAILY_TRADES=100
AGENT_DEFAULT_RISK_LEVEL=moderate
```

### Step 3: Install Additional Dependencies

```bash
npm install socket.io socket.io-client
```

### Step 4: Start WebSocket Server

Create `start-agent-websocket.js` in the root:

```javascript
const { createServer } = require('http');
const { Server } = require('socket.io');
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Import and initialize your WebSocket service here

httpServer.listen(3001);
console.log('Agent WebSocket server running on port 3001');
```

### Step 5: Complete Python Trading Coordinator

Update `python-ai-services/services/trading_coordinator.py`:

```python
import asyncio
from typing import Dict, List, Optional
from datetime import datetime
import aiohttp
from loguru import logger

class EnhancedTradingCoordinator:
    def __init__(self, agent_id: str, api_url: str = "http://localhost:3000"):
        self.agent_id = agent_id
        self.api_url = api_url
        self.session = None
        
    async def register(self, permissions: Dict):
        """Register agent with trading system"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_url}/api/agents/trading/register",
                json={
                    "agentId": self.agent_id,
                    **permissions
                }
            ) as response:
                return await response.json()
    
    async def execute_trade(self, trade_params: Dict):
        """Execute a trade through the API"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.api_url}/api/agents/trading/execute",
                json={
                    "agentId": self.agent_id,
                    **trade_params
                }
            ) as response:
                return await response.json()
```

### Step 6: Create Agent Trading Dashboard Component

Create `src/components/agent-trading-dashboard.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AgentTradingDashboard() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents/trading/register');
      const data = await response.json();
      setAgents(data.agents || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trading Agents</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Agent list and controls */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 7: Test Agent Trading

Create a test agent script `test-trading-agent.js`:

```javascript
import { TradingAgent } from './src/lib/trading/trading-agent-bridge.js';

async function testAgent() {
  // Create a momentum trading agent
  const agent = new TradingAgent('momentum-bot-001', 'momentum');
  
  // Register the agent
  await agent.registerAgent({
    maxTradeSize: 1000,
    maxPositionSize: 5000,
    maxDailyTrades: 10,
    allowedSymbols: ['BTC', 'ETH', 'SOL'],
    allowedStrategies: ['momentum'],
    riskLevel: 'moderate'
  });
  
  // Connect to WebSocket
  await agent.connect();
  
  // Subscribe to market data
  agent.subscribeToMarketData(['BTC', 'ETH', 'SOL']);
  
  console.log('Trading agent is running...');
}

testAgent().catch(console.error);
```

## 🔧 What Still Needs Implementation

### 1. Database Integration
- Replace in-memory storage with actual database queries
- Implement Prisma models for agent tables
- Add database connection pooling

### 2. Authentication
- Integrate with your existing auth system
- Add API key authentication for agents
- Implement rate limiting

### 3. Risk Management
- Real-time position tracking
- Stop-loss implementation
- Portfolio exposure limits
- Circuit breakers

### 4. Frontend Components
- Agent configuration UI
- Trade monitoring dashboard
- Performance metrics charts
- Risk alerts panel

### 5. Production Deployment
- WebSocket server deployment
- SSL/TLS configuration
- Load balancing
- Monitoring and logging

## 🚦 Quick Start

1. **Apply database schema**
2. **Update environment variables**
3. **Install dependencies**: `npm install socket.io socket.io-client`
4. **Start the application**: `npm run dev`
5. **Start WebSocket server**: `node start-agent-websocket.js`
6. **Test with the example agent**: `node test-trading-agent.js`

## 📊 Monitoring

The system logs all agent activities. Check:
- Agent registration in console logs
- Trade execution in `/api/agents/trading/execute` responses
- WebSocket connections in the WebSocket server logs
- Market data streaming in agent console output

## 🔒 Security Notes

1. Always validate agent permissions before trades
2. Implement rate limiting to prevent abuse
3. Use SSL/TLS for WebSocket connections in production
4. Rotate API keys regularly
5. Monitor for unusual trading patterns

## 🎯 Next Steps

1. Complete database integration
2. Build comprehensive frontend UI
3. Add more sophisticated trading strategies
4. Implement backtesting capabilities
5. Add machine learning models for trade decisions
