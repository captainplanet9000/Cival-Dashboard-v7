# Agent Zero - Cival Dashboard Integration Plan

## Overview

This document outlines a practical implementation plan for migrating the existing cival-dashboard CrewAI trading agent functionality to run inside the Agent Zero containerized environment. By leveraging Agent Zero's root access capabilities within a secure container, we can enhance the Trading Farm dashboard's AI capabilities while maintaining security through isolation.

This approach allows us to use the pre-built Agent Zero container rather than creating a custom containerization solution from scratch, significantly reducing implementation time.

## Phase 1: Agent Zero Setup (Days 1-2)

### 1.1 Install and Configure Agent Zero
- [ ] Install Docker Desktop (if not already installed)
- [ ] Pull the Agent Zero Docker image: `docker pull frdel/agent-zero-run`
- [ ] Create a directory in your project for Agent Zero data:
  ```bash
  # In your cival-dashboard project root
  mkdir -p agent-zero-data/{memory,knowledge,prompts,instruments,work_dir,logs}
  ```
- [ ] Create configuration files in the data directory:
  ```bash
  # Create .env file for Agent Zero
  cat > agent-zero-data/.env << EOL
  OPENAI_API_KEY=your_openai_key_here
  ANTHROPIC_API_KEY=your_anthropic_key_here
  # Add other API keys as needed
  EOL
  
  # Create basic settings.json
  cat > agent-zero-data/settings.json << EOL
  {
    "agent": {
      "name": "TradingFarmAgent",
      "model": "gpt-4"
    },
    "ui": {
      "theme": "dark"
    }
  }
  EOL
  ```

### 1.2 Agent Zero Container Deployment
- [ ] Run Agent Zero container with mapped volumes:
  ```bash
  # Run from your cival-dashboard project root
  docker run -d \
    --name cival-agent0 \
    -p 8080:80 \
    -p 2222:22 \
    -p 8000:8000 \
    -v "$(pwd)/agent-zero-data":/a0 \
    frdel/agent-zero-run
  ```
- [ ] Verify container is running: `docker ps -a | grep cival-agent0`
- [ ] Test the Agent Zero web UI by visiting http://localhost:8080 in your browser
- [ ] Add this configuration to docker-compose file for easy management:
  ```bash
  # Add to docker-compose.yml or create docker-compose.agent-zero.yml
  cat > docker-compose.agent-zero.yml << EOL
  version: '3.8'
  
  services:
    agent-zero:
      image: frdel/agent-zero-run
      container_name: cival-agent0
      ports:
        - "8080:80"  # Web UI
        - "8000:8000" # Trading API (we'll add later)
        - "2222:22"  # SSH for remote function calls
      volumes:
        - ./agent-zero-data:/a0
      restart: unless-stopped
      networks:
        - cival-network
  
  networks:
    cival-network:
      driver: bridge
  EOL
  ```

### 1.3 CrewAI Setup Inside Agent Zero
- [ ] Install Python dependencies inside the container:
  ```bash
  # Access container shell
  docker exec -it cival-agent0 bash
  
  # Install required packages for CrewAI and trading
  pip install crewai>=0.28.0 langchain>=0.0.335 langchain-openai>=0.0.1
  pip install openai>=1.3.5 anthropic>=0.5.0
  pip install pandas numpy matplotlib seaborn
  pip install ccxt>=4.0.112 ta>=0.10.2 vectorbt pydantic>=2.4.2
  pip install fastapi>=0.104.0 uvicorn>=0.23.2 websockets>=11.0.3
  ```
- [ ] Create directories for trading code inside Agent Zero container:
  ```bash
  # Inside the container
  mkdir -p /a0/trading_farm/{agents,models,tools,api,data,logs}
  
  # Make Python package structure
  touch /a0/trading_farm/__init__.py
  touch /a0/trading_farm/agents/__init__.py
  touch /a0/trading_farm/models/__init__.py
  touch /a0/trading_farm/tools/__init__.py
  ```
- [ ] The API keys are already available through the mounted .env file in the Agent Zero environment

## Phase 2: Migrate CrewAI Implementation (Days 3-5)

### 2.1 Transfer Trading Code to Agent Zero
- [ ] Copy your existing CrewAI code from python-ai-services to Agent Zero:
  ```bash
  # From your host machine, in the cival-dashboard directory
  
  # Create a temporary directory for code to transfer
  mkdir -p temp_transfer/agents temp_transfer/models temp_transfer/tools
  
  # Copy key CrewAI files (adjust paths as needed for your project structure)
  cp python-ai-services/agents/trading_crew.py temp_transfer/agents/
  cp python-ai-services/agents/crew_llm_config.py temp_transfer/agents/
  cp python-ai-services/agents/crew_setup.py temp_transfer/agents/
  cp python-ai-services/models/crew_models.py temp_transfer/models/
  cp python-ai-services/models/base_models.py temp_transfer/models/
  
  # Copy any tool files used by CrewAI
  cp python-ai-services/tools/market_data_tools.py temp_transfer/tools/
  
  # Now copy the files to the Agent Zero container
  docker cp temp_transfer/. cival-agent0:/a0/trading_farm/
  
  # Clean up
  rm -rf temp_transfer
  ```
- [ ] Adapt code for Agent Zero environment:
  ```bash
  # SSH into the container
  docker exec -it cival-agent0 bash
  
  # Create a modified crew_llm_config.py file
  cat > /a0/trading_farm/agents/crew_llm_config.py << EOL
  """LLM configuration for CrewAI"""
  import os
  from langchain_openai import ChatOpenAI
  
  def get_llm():
      """Get the LLM from environment variables"""
      # Agent Zero already has API keys from the .env file
      openai_api_key = os.environ.get("OPENAI_API_KEY")
      if not openai_api_key:
          raise EnvironmentError("OPENAI_API_KEY not found in environment")
          
      return ChatOpenAI(
          model_name="gpt-4",
          temperature=0.2,
          api_key=openai_api_key
      )
  EOL
  ```

### 2.2 Create Enhanced Trading Tools
- [ ] Create enhanced market data tools leveraging Agent Zero's system access:
  ```bash
  # Inside the container
  cat > /a0/trading_farm/tools/agent_zero_tools.py << EOL
  """Enhanced trading tools using Agent Zero's capabilities"""
  import os
  import subprocess
  import json
  from datetime import datetime
  from crewai.tools import BaseTool
  
  class MarketDataTool(BaseTool):
      name = "Market Data Tool"
      description = "Fetch market data for a trading symbol"
      
      def _run(self, symbol: str) -> str:
          """Run a system command to fetch data"""
          # Using curl with root access in Agent Zero
          cmd = f"curl -s https://api.binance.com/api/v3/ticker/24hr?symbol={symbol.replace('/', '')}"
          result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
          return result.stdout
  
  class TechnicalAnalysisTool(BaseTool):
      name = "Technical Analysis Tool"
      description = "Run technical analysis on market data"
      
      def _run(self, symbol: str, interval: str = "1h", limit: int = 100) -> str:
          """Fetch data and calculate indicators"""
          # Create a temporary Python script file
          script_path = "/tmp/analysis.py"
          with open(script_path, "w") as f:
              f.write(f"""
  import ccxt
  import pandas as pd
  import numpy as np
  import json
  from datetime import datetime
  
  exchange = ccxt.binance()
  ohlcv = exchange.fetch_ohlcv('{symbol}', '{interval}', limit={limit})
  
  df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
  df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
  
  # Calculate indicators
  df['sma20'] = df['close'].rolling(window=20).mean()
  df['sma50'] = df['close'].rolling(window=50).mean()
  df['rsi'] = 100 - (100 / (1 + (df['close'].diff().clip(lower=0).rolling(window=14).sum() / 
                            abs(df['close'].diff().clip(upper=0)).rolling(window=14).sum())))
  
  # Latest values
  latest = df.iloc[-1].to_dict()
  indicators = {{
      'close': latest['close'],
      'sma20': latest['sma20'],
      'sma50': latest['sma50'],
      'rsi': latest['rsi'],
      'trend': 'bullish' if latest['sma20'] > latest['sma50'] else 'bearish',
      'overbought': latest['rsi'] > 70,
      'oversold': latest['rsi'] < 30
  }}
  
  print(json.dumps(indicators))
  """)
          
          # Execute script with Agent Zero's Python
          result = subprocess.run(f"python {script_path}", shell=True, capture_output=True, text=True)
          return result.stdout
  
  class AgentZeroMemoryTool(BaseTool):
      name = "Agent Zero Memory Tool"
      description = "Save and retrieve data from Agent Zero's memory system"
      
      def _run(self, action: str, data: dict = None, query: str = "") -> str:
          """Interface with Agent Zero's memory system"""
          if action == "save" and data:
              # Save trading data to Agent Zero memory
              memory_file = f"/a0/memory/trading/{data.get('symbol', 'general')}.json"
              os.makedirs(os.path.dirname(memory_file), exist_ok=True)
              
              with open(memory_file, "w") as f:
                  json.dump({
                      "timestamp": datetime.now().isoformat(),
                      **data
                  }, f, indent=2)
              return f"Saved to memory: {memory_file}"
          
          elif action == "retrieve":
              # This is simplified - Agent Zero has a more sophisticated memory system
              if query:
                  # For demo, just search file names
                  result = subprocess.run(f"find /a0/memory -name '*{query}*'", 
                                        shell=True, capture_output=True, text=True)
                  files = result.stdout.strip().split('\n')
                  
                  content = []
                  for file in files:
                      if os.path.isfile(file):
                          with open(file, 'r') as f:
                              content.append(json.load(f))
                  return json.dumps(content)
              else:
                  return "No query provided for memory retrieval"
          
          return "Invalid action. Use 'save' or 'retrieve'."
  EOL
  ```

### 2.3 Create Trading API Inside Agent Zero
- [ ] Create a FastAPI server inside Agent Zero to expose your CrewAI functionality:
  ```bash
  # Inside the container
  mkdir -p /a0/trading_farm/api
  touch /a0/trading_farm/api/__init__.py
  
  # Create main API file
  cat > /a0/trading_farm/api/main.py << EOL
  """Trading API running inside Agent Zero"""
  from fastapi import FastAPI, WebSocket, WebSocketDisconnect
  from fastapi.middleware.cors import CORSMiddleware
  import uvicorn
  import json
  import sys
  import os
  from typing import Dict, Any
  
  # Add the trading_farm directory to the Python path
  sys.path.append('/a0/trading_farm')
  
  # Import your CrewAI components
  from agents.trading_crew import trading_crew
  from tools.agent_zero_tools import MarketDataTool, TechnicalAnalysisTool, AgentZeroMemoryTool
  
  # Initialize FastAPI app
  app = FastAPI(title="Trading Farm API", description="Trading API running in Agent Zero")
  
  # Configure CORS
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],  # In production, restrict this
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  
  @app.get("/")
  async def root():
      """Root endpoint"""
      return {"status": "Trading API running inside Agent Zero"}
  
  @app.post("/analyze")
  async def analyze_market(data: Dict[str, Any]):
      """Run market analysis using CrewAI"""
      symbol = data.get("symbol", "BTC/USD")
      market_data = data.get("market_data", "")
      
      # Run CrewAI analysis
      result = trading_crew.kickoff(inputs={
          'symbol': symbol,
          'market_data_summary': market_data
      })
      
      return {"result": result}
  
  @app.websocket("/ws")
  async def websocket_endpoint(websocket: WebSocket):
      """WebSocket endpoint for streaming data"""
      await websocket.accept()
      try:
          while True:
              data = await websocket.receive_text()
              message = json.loads(data)
              
              # Run trading analysis
              result = trading_crew.kickoff(inputs={
                  'symbol': message.get('symbol', 'BTC/USD'),
                  'market_data_summary': message.get('market_data', '')
              })
              
              await websocket.send_json({"result": result})
      except WebSocketDisconnect:
          pass
  
  if __name__ == "__main__":
      # Start the server on port 8000
      uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
  EOL
  ```

- [ ] Create startup script to run the API on container start:
  ```bash
  # Inside the container
  mkdir -p /a0/startup
  
  cat > /a0/startup/trading_api.sh << EOL
  #!/bin/bash
  cd /a0/trading_farm/api
  python main.py > /a0/logs/trading_api.log 2>&1 &
  EOL
  
  chmod +x /a0/startup/trading_api.sh
  ```

- [ ] Test the API inside the container:
  ```bash
  # Inside the container
  cd /a0/trading_farm/api
  python main.py &
  curl -X POST http://localhost:8000/analyze \
    -H "Content-Type: application/json" \
    -d '{"symbol":"BTC/USD", "market_data":"Price has been trending upward over the last 24 hours with increasing volume."}'
  ```

## Phase 3: Dashboard Integration (Days 6-8)

### 3.1 Create Next.js API Route for Agent Zero Communication
- [ ] Add new API route in your cival-dashboard Next.js application:
  ```bash
  mkdir -p src/app/api/agent-zero
  ```

- [ ] Create a bridge API route for securely communicating with Agent Zero:
  ```typescript
  // src/app/api/agent-zero/route.ts
  import { NextResponse } from 'next/server'
  import { createServerClient } from '@/utils/supabase/server'
  
  export async function POST(request: Request) {
    // Create authenticated supabase client
    const supabase = await createServerClient()
    
    // Get user session for authorization
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Extract request data
    const requestData = await request.json()
    
    // Forward request to Agent Zero API
    try {
      const agentZeroResponse = await fetch('http://cival-agent0:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      
      const responseData = await agentZeroResponse.json()
      
      // Log activity to database for auditing
      await supabase.from('trading_agent_activities').insert({
        user_id: session.user.id,
        action: 'market_analysis',
        request: requestData,
        response: responseData,
        performance_monitoring: true // Add performance monitoring
      })
      
      return NextResponse.json(responseData)
    } catch (error) {
      console.error('Agent Zero API error:', error)
      return NextResponse.json({ error: 'Failed to communicate with trading agent' }, { status: 500 })
    }
  }
  ```

### 3.2 Create React Component for Trading Analysis
- [ ] Create a React component for interacting with the Agent Zero trading API:
  ```tsx
  // src/components/trading/AgentZeroAnalysis.tsx
  'use client'
  
  import { useState } from 'react'
  import { useToast } from '@/components/ui/use-toast'
  import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
  import { Button } from '@/components/ui/button'
  import { Textarea } from '@/components/ui/textarea'
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
  import { Loader2 } from 'lucide-react'
  
  type TradingAnalysisResult = {
    advice: string;
    reasoning: string;
    confidence: number;
    timestamp: string;
  }
  
  export default function AgentZeroAnalysis() {
    const [symbol, setSymbol] = useState<string>('BTC/USDT')
    const [marketData, setMarketData] = useState<string>("")
    const [analysisResult, setAnalysisResult] = useState<TradingAnalysisResult | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const { toast } = useToast()
  
    const runAnalysis = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/agent-zero', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol,
            market_data: marketData,
          }),
        })
  
        const data = await response.json()
        if (response.ok) {
          setAnalysisResult(data.result)
        } else {
          toast({
            title: 'Analysis Failed',
            description: data.error || 'Unknown error occurred',
            variant: 'destructive',
          })
        }
      } catch (error) {
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to the trading agent',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
  
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Agent Zero Trading Analysis</CardTitle>
          <CardDescription>
            Leverage advanced AI trading analysis powered by Agent Zero and CrewAI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="symbol" className="text-sm font-medium">Trading Pair</label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger id="symbol">
                <SelectValue placeholder="Select trading pair" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
                <SelectItem value="BNB/USDT">BNB/USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="market-data" className="text-sm font-medium">
              Market Context (optional)
            </label>
            <Textarea
              id="market-data"
              placeholder="Enter any additional market context or news..."
              rows={3}
              value={marketData}
              onChange={(e) => setMarketData(e.target.value)}
            />
          </div>
          
          {analysisResult && (
            <div className="mt-6 p-4 bg-muted rounded-md">
              <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
              <div className="whitespace-pre-wrap">
                <p className="font-semibold">Recommendation: {analysisResult.advice}</p>
                <p className="mt-2">Reasoning: {analysisResult.reasoning}</p>
                <div className="flex items-center mt-2">
                  <span>Confidence:</span>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 ml-2">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${analysisResult.confidence}%` }}
                    ></div>
                  </div>
                  <span className="ml-2">{analysisResult.confidence}%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            onClick={runAnalysis} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Run Trading Analysis'
            )}
          </Button>
        </CardFooter>
      </Card>
    )
  }
  ```

### 3.3 Integrate with Dashboard Layout
- [ ] Add the new component to your dashboard page:
  ```tsx
  // src/app/dashboard/trading/page.tsx
  import AgentZeroAnalysis from '@/components/trading/AgentZeroAnalysis'
  
  export default function TradingPage() {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Trading Analysis</h1>
        <AgentZeroAnalysis />
      </div>
    )
  }
  ```

### 3.4 Create Database Migration for Activity Tracking
- [ ] Create a Supabase migration for the trading agent activities table:
  ```bash
  npx supabase migration new create_trading_agent_activities
  ```

- [ ] Add SQL to the migration file:
  ```sql
  -- Create table for tracking trading agent activities
  CREATE TABLE public.trading_agent_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    request JSONB NOT NULL,
    response JSONB,
    status TEXT DEFAULT 'completed' NOT NULL
  );

  -- Add RLS policies
  ALTER TABLE public.trading_agent_activities ENABLE ROW LEVEL SECURITY;

  -- Users can only see their own activities
  CREATE POLICY "Users can view their own activities"
    ON public.trading_agent_activities
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

  -- Only allow users to insert their own activities
  CREATE POLICY "Users can insert their own activities"
    ON public.trading_agent_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

  -- Create triggers for updated_at
  CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.trading_agent_activities
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
  ```

- [ ] Apply the migration and generate types:
  ```bash
  npx supabase migration up
  npx supabase gen types typescript --local > src/types/database.types.ts
  ```

## Phase 4: Production Deployment (Days 9-10)

### 4.1 Update Docker Compose Configuration
- [ ] Update the main `docker-compose.yml` file to include Agent Zero:
  ```yaml
  # Add to existing docker-compose.yml
  services:
    # ... existing services
    
    agent-zero:
      image: frdel/agent-zero-run
      container_name: cival-agent0
      ports:
        - "8080:80"  # Web UI (internal only in production)
        - "8000:8000" # Trading API
        - "2222:22"  # SSH for remote function calls
      volumes:
        - ./agent-zero-data:/a0
      restart: unless-stopped
      networks:
        - cival-network
      environment:
        - TZ=UTC
      depends_on:
        - postgres
        - redis
  ```

### 4.2 Security Hardening
- [ ] Create a secure network configuration:
  ```yaml
  # In docker-compose.yml, update network configuration
  networks:
    cival-network:
      driver: bridge
      internal: false # Allow internet access for trading APIs
    cival-internal:
      driver: bridge
      internal: true # Internal network only for database communication
  ```

- [ ] Implement authentication for Agent Zero API access:
  ```typescript
  // Add to src/app/api/agent-zero/route.ts
  import { createServerClient } from '@/utils/supabase/server'
  import { headers } from 'next/headers'
  
  // Add authorization middleware
  async function validateAuthorization(request: Request) {
    const headersList = headers()
    const authHeader = headersList.get('authorization')
    
    // Check API key for service-to-service calls
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.slice(7)
      if (apiKey === process.env.AGENT_ZERO_API_KEY) {
        return true
      }
    }
    
    // Check user session for frontend calls
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  }
  ```

### 4.3 Testing and Monitoring
- [ ] Create a testing script for the Agent Zero integration:
  ```bash
  # testing/test-agent-zero.sh
  #!/bin/bash
  
  echo "Testing Agent Zero API connectivity..."
  curl -s -X GET http://cival-agent0:8000/ | grep -q "Trading API running inside Agent Zero"
  if [ $? -eq 0 ]; then
    echo "✅ Agent Zero API is running"
  else
    echo "❌ Agent Zero API is not responding"
    exit 1
  fi
  
  echo "Testing Agent Zero trading analysis..."  
  response=$(curl -s -X POST http://cival-agent0:8000/analyze \
    -H "Content-Type: application/json" \
    -d '{"symbol":"BTC/USDT", "market_data":"Price has been trending upward."}')
  
  echo $response | grep -q "result"
  if [ $? -eq 0 ]; then
    echo "✅ Trading analysis is working"
  else
    echo "❌ Trading analysis failed"
    exit 1
  fi
  
  echo "All tests passed!"
  ```

- [ ] Add monitoring and logging:
  ```bash
  # Inside the Agent Zero container
  mkdir -p /a0/monitoring
  
  # Create a basic health check script
  cat > /a0/monitoring/health_check.sh << EOL
  #!/bin/bash
  # Check if the API is running
  curl -s http://localhost:8000/ > /dev/null
  if [ \$? -ne 0 ]; then
    echo "\$(date): API not responding, restarting..." >> /a0/logs/health_check.log
    # Restart the API
    cd /a0/trading_farm/api
    pkill -f "python main.py"
    python main.py > /a0/logs/trading_api.log 2>&1 &
  fi
  EOL
  
  chmod +x /a0/monitoring/health_check.sh
  
  # Add cron job to run health check every 5 minutes
  (crontab -l 2>/dev/null; echo "*/5 * * * * /a0/monitoring/health_check.sh") | crontab -
  ```

### 4.4 Final Integration and Launch
- [ ] Final system review and verification
- [ ] Create comprehensive documentation
- [ ] Train team members on the integrated system
- [ ] Deploy to production
- [ ] Monitor performance and address any issues

## Technical Details

### Docker Configuration
```yaml
version: '3.8'

services:
  agent-zero:
    image: frdel/agent-zero-run
    container_name: trading-farm-agent0
    ports:
      - "8080:80"  # Web UI
      - "8000:8000"  # Trading API
      - "2222:22"  # SSH for RFC
    volumes:
      - ./trading-farm-data:/a0
    restart: unless-stopped
    networks:
      - trading-farm-network

networks:
  trading-farm-network:
    driver: bridge
```

### CrewAI Integration Model
The integration will follow this architecture:

1. **Agent Zero Container**: Provides the isolated environment with root access
2. **CrewAI Framework**: Runs inside the container, using Agent Zero's capabilities
3. **Trading API**: Exposes CrewAI functionality to the dashboard
4. **Dashboard UI**: Provides user interface for interacting with the trading agents

### Security Considerations

1. **Container Isolation**: All operations are contained within the Docker container
2. **Permission Control**: Dashboard implements role-based access control
3. **API Authentication**: All API calls require authentication
4. **Audit Logging**: All operations are logged for accountability
5. **Limited Network Access**: Container has restricted network access

## Resources Required

1. **Development Resources**:
   - 1 Backend Developer (Python, CrewAI, Docker)
   - 1 Frontend Developer (Next.js, React)
   - 1 DevOps Engineer (part-time)

2. **Infrastructure**:
   - Docker environment (local or cloud)
   - Sufficient storage for market data and agent memory
   - API keys for trading platforms and LLM services

3. **External Dependencies**:
   - Agent Zero Docker image
   - CrewAI framework
   - Trading APIs (Binance, etc.)
   - LLM services (OpenAI, Anthropic, etc.)

## Post-Launch Activities

- [ ] Final pre-launch testing
- [ ] Production deployment
- [ ] Monitor system performance
- [ ] Address any issues

## Technical Details

### Docker Configuration
```yaml
version: '3.8'

services:
  agent-zero:
    image: frdel/agent-zero-run
    container_name: trading-farm-agent0
    ports:
      - "8080:80"  # Web UI
      - "8000:8000"  # Trading API
      - "2222:22"  # SSH for RFC
    volumes:
      - ./trading-farm-data:/a0
    restart: unless-stopped
    networks:
      - trading-farm-network

networks:
  trading-farm-network:
    driver: bridge
```

### CrewAI Integration Model
The integration will follow this architecture:

1. **Agent Zero Container**: Provides the isolated environment with root access
2. **CrewAI Framework**: Runs inside the container, using Agent Zero's capabilities
3. **Trading API**: Exposes CrewAI functionality to the dashboard
4. **Dashboard UI**: Provides user interface for interacting with the trading agents

### Security Considerations

1. **Container Isolation**: All operations are contained within the Docker container
2. **Permission Control**: Dashboard implements role-based access control
3. **API Authentication**: All API calls require authentication
4. **Audit Logging**: All operations are logged for accountability
5. **Limited Network Access**: Container has restricted network access

## Resources Required

1. **Development Resources**:
   - 1 Backend Developer (Python, CrewAI, Docker)
   - 1 Frontend Developer (Next.js, React)
   - 1 DevOps Engineer (part-time)

2. **Infrastructure**:
   - Docker environment (local or cloud)
   - Sufficient storage for market data and agent memory
   - API keys for trading platforms and LLM services

3. **External Dependencies**:
   - Agent Zero Docker image
   - CrewAI framework
   - Trading APIs (Binance, etc.)
   - LLM services (OpenAI, Anthropic, etc.)

## Success Criteria

1. CrewAI agents successfully run inside Agent Zero container
2. Trading analyses and strategies execute correctly
3. Dashboard integrates seamlessly with Agent Zero
4. System maintains security and isolation
5. Performance meets or exceeds existing implementation
  cp python-ai-services/models/market_data.py temp_transfer/models/
  cp python-ai-services/tools/trading_tools.py temp_transfer/tools/
  cp python-ai-services/tools/research_tools.py temp_transfer/tools/
  cp python-ai-services/utils/config.py temp_transfer/
  
  # Copy files to Agent Zero container
  docker cp temp_transfer/. cival-agent0:/a0/trading_farm/
  ```

### 2.2 Adapt Code for Agent Zero Environment

- [ ] Update import paths in all files to match the new structure:
  ```bash
  # SSH into the Agent Zero container
  docker exec -it cival-agent0 bash
  
  # Navigate to the trading directory
  cd /a0/trading_farm
  
  # Use sed to replace import paths (example, adjust as needed)
  find . -type f -name "*.py" -exec sed -i 's/from python_ai_services/from trading_farm/g' {} \;
  ```

- [ ] Create a configuration file for the trading module:
  ```python
  # /a0/trading_farm/config.py
  import os
  from dotenv import load_dotenv
  
  # Load environment variables from .env file in /a0
  load_dotenv('/a0/.env')
  
  # API Keys
  OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
  ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
  
  # Trading Configuration
  DEFAULT_MARKET = "BTC/USD"
  DEFAULT_TIMEFRAME = "1d"
  DEFAULT_EXCHANGE = "binance"
  
  # LLM Configuration
  DEFAULT_MODEL = "gpt-4-1106-preview"
  ANTHROPIC_MODEL = "claude-3-opus"
  
  # Logging
  LOG_LEVEL = "INFO"
  LOG_FILE = "/a0/trading_farm/logs/trading.log"
  ```

### 2.3 Create FastAPI Trading Server

- [ ] Implement a FastAPI server to expose trading functionality:
  ```python
  # /a0/trading_farm/api/trading_api.py
  from fastapi import FastAPI, HTTPException, Depends, Header
  from pydantic import BaseModel
  import asyncio
  import logging
  import os
  from typing import Optional, Dict, Any, List
  
  # Import your trading crew and tools
  from trading_farm.agents.trading_crew import TradingCrew
  
  # Configure logging
  logging.basicConfig(
      level=logging.INFO,
      format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
      handlers=[
          logging.FileHandler("/a0/trading_farm/logs/api.log"),
          logging.StreamHandler()
      ]
  )
  logger = logging.getLogger("trading_api")
  
  app = FastAPI(title="Trading Farm API", 
                description="AI-powered trading analysis and signals API")
  
  # Simple API key validation for security
  API_KEY = os.getenv("AGENT_ZERO_API_KEY", "default_api_key_change_me")
  
  def verify_api_key(x_api_key: str = Header(None)):
      if not x_api_key or x_api_key != API_KEY:
          raise HTTPException(status_code=401, detail="Invalid API key")
      return x_api_key
  
  class TradingRequest(BaseModel):
      symbol: str
      timeframe: str = "1d"
      risk_tolerance: str = "medium"  # low, medium, high
      trading_style: str = "swing"    # day, swing, position
      initial_capital: float = 10000.0
      additional_context: Optional[str] = None
  
  @app.get("/health")
  def health_check():
      return {"status": "healthy", "service": "trading_api"}
  
  @app.post("/analyze", dependencies=[Depends(verify_api_key)])
  async def analyze_market(request: TradingRequest):
      try:
          logger.info(f"Received trading analysis request for {request.symbol}")
          
          # Create trading crew instance
          crew = TradingCrew(
              symbol=request.symbol,
              timeframe=request.timeframe,
              risk_tolerance=request.risk_tolerance,
              trading_style=request.trading_style,
              initial_capital=request.initial_capital
          )
          
          # Run the analysis
          result = await asyncio.to_thread(crew.run_analysis, request.additional_context)
          
          return {
              "signal": result.get("signal", "neutral"),
              "entryPrice": float(result.get("entry_price", 0)),
              "stopLoss": float(result.get("stop_loss", 0)),
              "takeProfit": float(result.get("take_profit", 0)),
              "timeframe": request.timeframe,
              "confidence": float(result.get("confidence", 0.5)),
              "rationale": result.get("rationale", ""),
              "riskRewardRatio": float(result.get("risk_reward_ratio", 0)),
              "agentAnalysis": {
                  "marketAnalyst": result.get("market_analysis", ""),
                  "riskManager": result.get("risk_analysis", ""),
                  "strategyDeveloper": result.get("strategy_analysis", ""),
                  "executionSpecialist": result.get("execution_plan", "")
              }
          }
      except Exception as e:
          logger.error(f"Error analyzing market: {str(e)}", exc_info=True)
          raise HTTPException(
              status_code=500, 
              detail=f"Failed to analyze market: {str(e)}"
          )
  
  # Run the server when module is executed directly
  if __name__ == "__main__":
      import uvicorn
      uvicorn.run("trading_api:app", host="0.0.0.0", port=8000, reload=True)
  ```

- [ ] Create a startup script to run the API server:
  ```bash
  # /a0/trading_farm/run_api.sh
  #!/bin/bash
  cd /a0/trading_farm
  python -m api.trading_api
  ```

- [ ] Make the script executable and run it:
  ```bash
  # Inside the container
  chmod +x /a0/trading_farm/run_api.sh
  
  # Start the API server
  /a0/trading_farm/run_api.sh &
  ```

## Phase 3: Next.js Dashboard Integration (Days 6-8)

### 3.1 Create API Communication Service

- [ ] Implement a service to communicate with the Agent Zero trading API in your Next.js dashboard:
  ```typescript
  // src/services/agentZeroService.ts
  import axios from 'axios';

  const AGENT_ZERO_API_URL = process.env.NEXT_PUBLIC_AGENT_ZERO_API_URL || 'http://localhost:8000';
  const AGENT_ZERO_API_KEY = process.env.AGENT_ZERO_API_KEY;

  const agentZeroApi = axios.create({
    baseURL: AGENT_ZERO_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': AGENT_ZERO_API_KEY,
    },
  });

  export interface TradingAnalysisRequest {
    symbol: string;
    timeframe: string;
    risk_tolerance: string;
    trading_style: string;
    initial_capital: number;
    additional_context?: string;
  }

  export interface TradingAnalysisResponse {
    signal: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    timeframe: string;
    confidence: number;
    rationale: string;
    riskRewardRatio: number;
    agentAnalysis: {
      marketAnalyst: string;
      riskManager: string;
      strategyDeveloper: string;
      executionSpecialist: string;
    };
  }

  export const getTradingAnalysis = async (
    params: TradingAnalysisRequest
  ): Promise<TradingAnalysisResponse> => {
    try {
      const response = await agentZeroApi.post('/analyze', params);
      return response.data;
    } catch (error) {
      console.error('Error fetching trading analysis:', error);
      throw error;
    }
  };

  export const checkAgentZeroHealth = async (): Promise<boolean> => {
    try {
      const response = await agentZeroApi.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Agent Zero health check failed:', error);
      return false;
    }
  };
  ```### 3.2 Create Trading Analysis UI Components

- [ ] Create a TradingAnalysisForm component:
  ```tsx
  // src/components/TradingAnalysisForm.tsx
  'use client';
  
  import { useState } from 'react';
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import * as z from 'zod';
  import { Button } from '@/components/ui/button';
  import { Card, CardContent } from '@/components/ui/card';
  import { Input } from '@/components/ui/input';
  import { Select } from '@/components/ui/select';
  import { Textarea } from '@/components/ui/textarea';
  import { useToast } from '@/components/ui/use-toast';
  import { 
    getTradingAnalysis, 
    TradingAnalysisRequest 
  } from '@/services/agentZeroService';
  
  const formSchema = z.object({
    symbol: z.string().min(1, "Symbol is required"),
    timeframe: z.string().min(1, "Timeframe is required"),
    risk_tolerance: z.string().min(1, "Risk tolerance is required"),
    trading_style: z.string().min(1, "Trading style is required"),
    initial_capital: z.number().positive("Initial capital must be positive"),
    additional_context: z.string().optional(),
  });
  
  type FormValues = z.infer<typeof formSchema>;
  
  export function TradingAnalysisForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    
    const form = useForm<FormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        symbol: 'BTC/USD',
        timeframe: '1d',
        risk_tolerance: 'medium',
        trading_style: 'swing',
        initial_capital: 10000,
        additional_context: '',
      },
    });
    
    const onSubmit = async (data: FormValues) => {
      setIsLoading(true);
      
      try {
        const result = await getTradingAnalysis({
          symbol: data.symbol,
          timeframe: data.timeframe,
          risk_tolerance: data.risk_tolerance,
          trading_style: data.trading_style,
          initial_capital: data.initial_capital,
          additional_context: data.additional_context,
        });
        
        setAnalysisResult(result);
        toast({
          title: 'Analysis Complete',
          description: `Trading analysis for ${data.symbol} completed successfully.`,
        });
      } catch (error) {
        console.error('Error:', error);
        toast({
          variant: 'destructive',
          title: 'Analysis Failed',
          description: 'Failed to get trading analysis. Please try again.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    return (
      <Card>
        <CardContent className="pt-6">
          {/* Form implementation with shadcn/ui components */}
        </CardContent>
      </Card>
    );
  }
  ```

- [ ] Implement a TradingResultDisplay component:
  ```tsx
  // src/components/TradingResultDisplay.tsx
  'use client';
  
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { TradingAnalysisResponse } from '@/services/agentZeroService';
  
  interface TradingResultDisplayProps {
    result: TradingAnalysisResponse;
    onReset: () => void;
  }
  
  export function TradingResultDisplay({ result, onReset }: TradingResultDisplayProps) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Trading Analysis: {result.signal.toUpperCase()} {result.timeframe}
            </CardTitle>
            <Badge variant={result.signal === 'buy' ? 'success' : 
                            result.signal === 'sell' ? 'danger' : 'warning'}>
              {result.signal.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="details">Agent Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary">
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <h4 className="font-medium text-sm">Entry Price</h4>
                  <p className="text-2xl">${result.entryPrice.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Confidence</h4>
                  <p className="text-2xl">{(result.confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Stop Loss</h4>
                  <p className="text-2xl text-red-600">${result.stopLoss.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Take Profit</h4>
                  <p className="text-2xl text-green-600">${result.takeProfit.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium text-sm mb-2">Rationale</h4>
                <p className="text-sm">{result.rationale}</p>
              </div>
            </TabsContent>
            
            <TabsContent value="details">
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Market Analyst</h4>
                  <p className="text-sm p-3 bg-muted rounded-md">{result.agentAnalysis.marketAnalyst}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Risk Manager</h4>
                  <p className="text-sm p-3 bg-muted rounded-md">{result.agentAnalysis.riskManager}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Strategy Developer</h4>
                  <p className="text-sm p-3 bg-muted rounded-md">{result.agentAnalysis.strategyDeveloper}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Execution Specialist</h4>
                  <p className="text-sm p-3 bg-muted rounded-md">{result.agentAnalysis.executionSpecialist}</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onReset}>New Analysis</Button>
            <Button>Save to History</Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  ```

### 3.3 Create Next.js API Route for Agent Zero Proxy

- [ ] Implement a server-side proxy to securely communicate with Agent Zero:
  ```typescript
  // src/app/api/trading-analysis/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

  export async function POST(request: NextRequest) {
    try {
      // Get authenticated user from Supabase
      const supabase = createRouteHandlerClient({ cookies: () => cookies() });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // Get request data
      const requestData = await request.json();
      
      // Call Agent Zero API
      const response = await fetch(`${process.env.AGENT_ZERO_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.AGENT_ZERO_API_KEY!,
        },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        throw new Error(`Agent Zero API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Log the analysis to Supabase for history tracking
      await supabase.from('trading_signals').insert({
        user_id: session.user.id,
        symbol: requestData.symbol,
        timeframe: requestData.timeframe,
        signal: data.signal,
        entry_price: data.entryPrice,
        stop_loss: data.stopLoss,
        take_profit: data.takeProfit,
        rationale: data.rationale,
        confidence: data.confidence,
        risk_reward_ratio: data.riskRewardRatio,
        status: 'open',
        agent_analysis: data.agentAnalysis,
      });
      
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('Trading analysis error:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  }
  ```## Phase 4: Testing and Validation (Days 9-10)

### 4.1 Component Testing

- [ ] Test Agent Zero API endpoints:
  ```bash
  # Test the health endpoint
  curl http://localhost:8000/health
  
  # Test the analyze endpoint (with API key)
  curl -X POST http://localhost:8000/analyze \
    -H "Content-Type: application/json" \
    -H "X-API-Key: your_api_key" \
    -d '{
      "symbol": "BTC/USD",
      "timeframe": "1d",
      "risk_tolerance": "medium",
      "trading_style": "swing",
      "initial_capital": 10000
    }'
  ```

- [ ] Create Jest tests for the Next.js components:
  ```typescript
  // __tests__/components/TradingAnalysisForm.test.tsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { TradingAnalysisForm } from '@/components/TradingAnalysisForm';
  import { getTradingAnalysis } from '@/services/agentZeroService';
  
  // Mock the service
  jest.mock('@/services/agentZeroService', () => ({
    getTradingAnalysis: jest.fn(),
  }));
  
  describe('TradingAnalysisForm', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });
    
    test('renders form elements correctly', () => {
      render(<TradingAnalysisForm />);
      
      expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/timeframe/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/risk tolerance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/trading style/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
    });
    
    test('submits form and shows results on success', async () => {
      const mockResult = {
        signal: 'buy',
        entryPrice: 50000,
        stopLoss: 48000,
        takeProfit: 55000,
        timeframe: '1d',
        confidence: 0.85,
        rationale: 'Test rationale',
        riskRewardRatio: 2.5,
        agentAnalysis: {
          marketAnalyst: 'Market analysis',
          riskManager: 'Risk analysis',
          strategyDeveloper: 'Strategy analysis',
          executionSpecialist: 'Execution plan',
        },
      };
      
      (getTradingAnalysis as jest.Mock).mockResolvedValue(mockResult);
      
      render(<TradingAnalysisForm />);
      
      fireEvent.change(screen.getByLabelText(/symbol/i), { 
        target: { value: 'ETH/USD' } 
      });
      
      fireEvent.click(screen.getByRole('button', { name: /analyze/i }));
      
      await waitFor(() => {
        expect(getTradingAnalysis).toHaveBeenCalledWith(expect.objectContaining({
          symbol: 'ETH/USD',
        }));
      });
      
      // Verify results are displayed
      expect(screen.getByText('BUY')).toBeInTheDocument();
      expect(screen.getByText('$50,000')).toBeInTheDocument();
    });
  });
  ```

### 4.2 Integration Testing

- [ ] Test full flow from UI to Agent Zero and back:
  ```typescript
  // cypress/e2e/trading-flow.cy.ts
  describe('Trading Analysis Flow', () => {
    beforeEach(() => {
      // Mock the API response
      cy.intercept('POST', '/api/trading-analysis', {
        statusCode: 200,
        body: {
          signal: 'buy',
          entryPrice: 50000,
          stopLoss: 48000,
          takeProfit: 55000,
          timeframe: '1d',
          confidence: 0.85,
          rationale: 'Test rationale',
          riskRewardRatio: 2.5,
          agentAnalysis: {
            marketAnalyst: 'Market analysis',
            riskManager: 'Risk analysis',
            strategyDeveloper: 'Strategy analysis',
            executionSpecialist: 'Execution plan',
          },
        },
      }).as('tradingAnalysis');
      
      // Visit the trading page
      cy.visit('/trading');
    });
    
    it('should submit form and display results', () => {
      // Fill out the form
      cy.get('input[name="symbol"]').clear().type('BTC/USD');
      cy.get('select[name="timeframe"]').select('1d');
      cy.get('select[name="risk_tolerance"]').select('medium');
      cy.get('select[name="trading_style"]').select('swing');
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Wait for API call
      cy.wait('@tradingAnalysis');
      
      // Verify results are displayed
      cy.contains('BUY').should('be.visible');
      cy.contains('$50,000').should('be.visible');
      cy.contains('$48,000').should('be.visible');
      cy.contains('$55,000').should('be.visible');
      
      // Check tab switching works
      cy.get('button').contains('Agent Details').click();
      cy.contains('Market analysis').should('be.visible');
    });
  });
  ```

## Phase 5: Deployment and Documentation (Days 11-14)

### 5.1 Production Deployment

- [ ] Update docker-compose for production environment:
  ```yaml
  # docker-compose.prod.yml
  version: '3.8'
  
  services:
    agent-zero:
      image: frdel/agent-zero-run
      container_name: cival-agent0
      ports:
        - "8000:8000"  # Only expose API port
      volumes:
        - ./agent-zero-data:/a0
      environment:
        - NODE_ENV=production
      restart: unless-stopped
      networks:
        - cival-network
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
        interval: 30s
        timeout: 10s
        retries: 3
    
    nextjs-dashboard:
      build:
        context: .
        dockerfile: Dockerfile
      ports:
        - "3000:3000"
      environment:
        - NODE_ENV=production
        - AGENT_ZERO_API_URL=http://agent-zero:8000
        - AGENT_ZERO_API_KEY=${AGENT_ZERO_API_KEY}
        - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
        - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      depends_on:
        - agent-zero
      networks:
        - cival-network
      restart: unless-stopped
    
    nginx:
      image: nginx:alpine
      ports:
        - "80:80"
        - "443:443"
      volumes:
        - ./nginx/conf.d:/etc/nginx/conf.d
        - ./nginx/ssl:/etc/nginx/ssl
        - ./nginx/www:/var/www/html
      depends_on:
        - nextjs-dashboard
      networks:
        - cival-network
      restart: unless-stopped
  
  networks:
    cival-network:
      driver: bridge
  ```

- [ ] Create a startup script for the production environment:
  ```bash
  #!/bin/bash
  # start-production.sh
  
  # Load environment variables
  set -a
  source .env.production
  set +a
  
  # Start with Docker Compose
  docker-compose -f docker-compose.prod.yml up -d
  
  # Verify all services are running
  docker-compose -f docker-compose.prod.yml ps
  
  echo "Trading Farm is now running in production mode!"
  ```

### 5.2 Documentation

- [ ] Create API documentation for Agent Zero API:
  ```markdown
  # Agent Zero Trading API Documentation
  
  ## Authentication
  
  All API requests require the `X-API-Key` header with a valid API key.
  
  ## Endpoints
  
  ### Health Check
  
  ```
  GET /health
  ```
  
  Returns the health status of the API.
  
  ### Trading Analysis
  
  ```
  POST /analyze
  ```
  
  Request a trading analysis for a specific market.
  
  #### Request Body
  
  ```json
  {
    "symbol": "BTC/USD",
    "timeframe": "1d",
    "risk_tolerance": "medium",
    "trading_style": "swing",
    "initial_capital": 10000,
    "additional_context": "Looking for swing trading opportunities"
  }
  ```
  
  #### Response
  
  ```json
  {
    "signal": "buy",
    "entryPrice": 50000,
    "stopLoss": 48000,
    "takeProfit": 55000,
    "timeframe": "1d",
    "confidence": 0.85,
    "rationale": "Strong bullish momentum with support...",
    "riskRewardRatio": 2.5,
    "agentAnalysis": {
      "marketAnalyst": "BTC/USD shows positive momentum...",
      "riskManager": "Given your medium risk tolerance...",
      "strategyDeveloper": "For your swing trading style...",
      "executionSpecialist": "For optimal execution, consider..."
    }
  }
  ```
  ```
  
- [ ] Create a comprehensive README.md:
  ```markdown
  # Trading Farm Dashboard with Agent Zero Integration
  
  This project integrates CrewAI trading agents with a Next.js dashboard through Agent Zero, creating a powerful AI-powered trading analysis platform.
  
  ## Architecture
  
  - **Agent Zero Container**: Runs CrewAI trading agents and exposes a FastAPI server
  - **Next.js Dashboard**: Frontend interface with trading analysis forms and results display
  - **Supabase**: Database for storing trading signals and user data
  
  ## Features
  
  - AI trading analysis with multiple specialized agents (market analyst, risk manager, etc.)
  - Real-time trading signal generation and display
  - Historical signal tracking and analysis
  - User authentication and personalized recommendations
  
  ## Setup and Installation
  
  ### Prerequisites
  
  - Docker and Docker Compose
  - Node.js 18+ and npm/yarn
  - Supabase account
  - OpenAI and/or Anthropic API keys
  
  ### Quick Start
  
  1. Clone the repository
  2. Copy `.env.example` to `.env.local` and fill in required values
  3. Run `docker-compose up -d` to start the Agent Zero container
  4. Run `npm install` to install Next.js dependencies
  5. Run `npm run dev` to start the dashboard in development mode
  
  ## Development
  
  See full documentation in the `/docs` directory.
  ```

## Phase 6: Monitoring and Maintenance (Ongoing)

### 6.1 Setup Monitoring

- [ ] Implement basic logging and monitoring:
  ```typescript
  // src/middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  
  export function middleware(request: NextRequest) {
    const startTime = Date.now();
    
    // Process the request
    const response = NextResponse.next();
    
    // Add timing header
    const endTime = Date.now();
    response.headers.set('Server-Timing', `total;dur=${endTime - startTime}`);
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${request.method}] ${request.url} - ${endTime - startTime}ms`);
    }
    
    return response;
  }
  
  export const config = {
    matcher: [
      '/api/:path*',
      '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
  };
  ```

- [ ] Add error tracking and reporting:
  ```typescript
  // src/lib/errorReporting.ts
  export function captureError(error: Error, context?: Record<string, any>) {
    // In a real application, this would send to Sentry, LogRocket, etc.
    console.error('[ERROR]', error, context);
    
    // Log to server
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      }),
    }).catch(e => console.error('Failed to log error:', e));
  }
  ```

### 6.2 Implement Regular Maintenance Tasks

- [ ] Create a script for regular health checks:
  ```bash
  #!/bin/bash
  # healthcheck.sh
  
  echo "Running Trading Farm health check..."
  
  # Check if Agent Zero container is running
  AGENT_ZERO_STATUS=$(docker inspect --format='{{.State.Status}}' cival-agent0 2>/dev/null)
  if [ "$AGENT_ZERO_STATUS" != "running" ]; then
    echo "⚠️ Agent Zero container is not running. Status: $AGENT_ZERO_STATUS"
    echo "Attempting to restart..."
    docker start cival-agent0
  else
    echo "✅ Agent Zero container is running"
    
    # Check API health
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    if [ "$HEALTH_STATUS" != "200" ]; then
      echo "⚠️ Agent Zero API health check failed with status $HEALTH_STATUS"
    else
      echo "✅ Agent Zero API is healthy"
    fi
  fi
  
  # Check Next.js dashboard
  NEXTJS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
  if [ "$NEXTJS_STATUS" != "200" ]; then
    echo "⚠️ Next.js dashboard health check failed with status $NEXTJS_STATUS"
  else
    echo "✅ Next.js dashboard is healthy"
  fi
  
  echo "Health check completed at $(date)"
  ```

---

This comprehensive integration plan provides a step-by-step guide to migrate your existing CrewAI trading analysis code into the Agent Zero container and integrate it with your Next.js dashboard. The timeline is approximate and can be adjusted based on your team's velocity and any challenges encountered during implementation.

Remember to test thoroughly at each phase and maintain proper documentation to ensure a smooth integration process. Good luck with your project!