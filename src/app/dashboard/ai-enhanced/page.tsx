'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Shield, 
  Activity,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { TradingDecisionCard } from "@/components/enhanced/TradingDecisionCard";

interface PydanticAIHealth {
  status: 'healthy' | 'unhealthy';
  services: Record<string, string>;
  pydantic_ai_version: string;
  integration_status: string;
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'close';
  symbol: string;
  quantity: number;
  price?: number;
  confidence: number;
  risk_level: 'low' | 'medium' | 'high' | 'extreme';
  reasoning: string;
  stop_loss?: number;
  take_profit?: number;
  timeframe: string;
}

interface EnhancedTradingResponse {
  agent_id: string;
  pydantic_ai_enhanced: boolean;
  decision: TradingDecision;
  reasoning: string;
  confidence: number;
  integration_status: {
    google_sdk: string;
    a2a_protocol: string;
    market_analyst: string;
    risk_monitor: string;
  };
  timestamp: number;
  api_version: string;
  fallback_used: boolean;
  processing_time: number;
  compliance_status: string;
  integration_benefits: string[];
}

export default function AIEnhancedDashboard() {
  const [aiHealth, setAiHealth] = useState<PydanticAIHealth | null>(null);
  const [tradingDecisions, setTradingDecisions] = useState<EnhancedTradingResponse[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Check PydanticAI service health
  useEffect(() => {
    checkAIHealth();
    const interval = setInterval(checkAIHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAIHealth = async () => {
    try {
      const response = await fetch('/api/ai/trading?status=true');
      const healthData = await response.json();
      setAiHealth({
        status: healthData.pydantic_ai_status === 'online' ? 'healthy' : 'unhealthy',
        services: healthData.service_health?.services || {},
        pydantic_ai_version: healthData.service_health?.pydantic_ai_version || 'unknown',
        integration_status: healthData.pydantic_ai_status || 'offline'
      });
    } catch (error) {
      console.error('Health check failed:', error);
      setAiHealth({
        status: 'unhealthy',
        services: {},
        pydantic_ai_version: 'unknown',
        integration_status: 'offline'
      });
    }
  };  const analyzeSymbol = async (symbol: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          account_id: 'demo-account-001',
          market_data: {
            current_price: 150 + Math.random() * 50,
            volume: Math.floor(Math.random() * 1000000),
            volatility: Math.random() * 0.5,
            trend: Math.random() > 0.5 ? 'up' : 'down'
          }
        })
      });

      const enhancedResult: EnhancedTradingResponse = await response.json();
      setTradingDecisions(prev => [enhancedResult, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteDecision = (decision: TradingDecision) => {
    console.log('Executing decision:', decision);
  };

  const handleRejectDecision = (decision: TradingDecision) => {
    console.log('Reviewing decision:', decision);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Brain className="mr-3 h-8 w-8 text-blue-600" />
            AI-Enhanced Trading
          </h1>
          <p className="text-muted-foreground">
            Powered by PydanticAI with Google SDK & A2A integration
          </p>
        </div>
        <Button variant="outline" onClick={checkAIHealth}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* AI System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            PydanticAI System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center space-x-2">
              {aiHealth?.status === 'healthy' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="font-medium">Service Health</div>
                <div className="text-sm text-muted-foreground">
                  {aiHealth?.status || 'checking...'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-medium">PydanticAI Version</div>
                <div className="text-sm text-muted-foreground">
                  {aiHealth?.pydantic_ai_version || 'unknown'}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-medium">Integration</div>
                <div className="text-sm text-muted-foreground">
                  Google SDK + A2A
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium">Enhanced Features</div>
                <div className="text-sm text-muted-foreground">
                  Type-safe • Validated
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5" />
            Quick AI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'].map(symbol => (
              <Button
                key={symbol}
                onClick={() => analyzeSymbol(symbol)}
                disabled={isAnalyzing || aiHealth?.status !== 'healthy'}
                variant="outline"
              >
                {isAnalyzing ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="mr-2 h-4 w-4" />
                )}
                Analyze {symbol}
              </Button>
            ))}
          </div>
          
          {aiHealth?.status !== 'healthy' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm text-yellow-800">
                  PydanticAI service is offline. Fallback system available.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Trading Decisions */}
      {tradingDecisions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent AI Decisions</h2>
            <Badge variant="outline">Enhanced with PydanticAI</Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {tradingDecisions.map((result, index) => (
              <TradingDecisionCard
                key={`${result.decision.symbol}-${index}`}
                decision={result.decision}
                aiStatus={result}
                onExecute={handleExecuteDecision}
                onReject={handleRejectDecision}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}