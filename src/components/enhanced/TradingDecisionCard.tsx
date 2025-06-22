'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Brain,
  Target,
  Shield
} from "lucide-react";
import { TradingDecision, PydanticAIStatus } from "@/types/pydantic-ai";

interface TradingDecisionCardProps {
  decision: TradingDecision;
  aiStatus: PydanticAIStatus;
  onExecute?: (decision: TradingDecision) => void;
  onReject?: (decision: TradingDecision) => void;
}

export function TradingDecisionCard({ 
  decision, 
  aiStatus, 
  onExecute, 
  onReject 
}: TradingDecisionCardProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4 text-trading-buy" />;
      case 'sell': return <TrendingDown className="h-4 w-4 text-trading-sell" />;
      case 'hold': return <Clock className="h-4 w-4 text-trading-neutral" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'destructive';
      case 'extreme': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

  return (
    <Card className="relative overflow-hidden">
      {/* PydanticAI Enhancement Indicator */}
      {aiStatus.pydantic_ai_enhanced && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200">
            <Brain className="h-3 w-3 mr-1" />
            AI Enhanced
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getActionIcon(decision.action)}
            <CardTitle className="text-lg font-bold">
              {decision.action.toUpperCase()} {decision.symbol}
            </CardTitle>
          </div>
          <Badge 
            variant={getRiskBadgeVariant(decision.risk_level) as any}
            className="text-xs"
          >
            {decision.risk_level.toUpperCase()} RISK
          </Badge>
        </div>
        
        <CardDescription className="text-sm">
          Quantity: {decision.quantity.toLocaleString()} shares
          {decision.price && ` • Target: ${formatPrice(decision.price)}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Confidence Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Confidence Level
            </span>
            <span className="font-medium">{(decision.confidence * 100).toFixed(1)}%</span>
          </div>
          <Progress value={decision.confidence * 100} className="h-2" />
        </div>

        {/* AI Reasoning */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center">
            <Brain className="h-4 w-4 mr-1" />
            AI Analysis
          </h4>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {decision.reasoning}
          </p>
        </div>

        {/* Risk Management */}
        {(decision.stop_loss || decision.take_profit) && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <Shield className="h-4 w-4 mr-1" />
              Risk Management
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {decision.stop_loss && (
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <div className="text-red-700 font-medium">Stop Loss</div>
                  <div className="text-red-600">{formatPrice(decision.stop_loss)}</div>
                </div>
              )}
              {decision.take_profit && (
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <div className="text-green-700 font-medium">Take Profit</div>
                  <div className="text-green-600">{formatPrice(decision.take_profit)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integration Status */}
        {aiStatus.pydantic_ai_enhanced && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">System Integration</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(aiStatus.integration_status).map(([system, status]) => (
                <div key={system} className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="capitalize">{system.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Information */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Timeframe: {decision.timeframe}</div>
          <div>Processing: {aiStatus.processing_time}ms</div>
          {aiStatus.fallback_used && (
            <div className="text-orange-600">⚠️ Fallback system used</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          {onExecute && (
            <Button 
              onClick={() => onExecute(decision)}
              className="flex-1"
              variant={decision.action === 'buy' ? 'default' : decision.action === 'sell' ? 'destructive' : 'secondary'}
            >
              Execute {decision.action.toUpperCase()}
            </Button>
          )}
          {onReject && (
            <Button 
              onClick={() => onReject(decision)}
              variant="outline"
              className="flex-1"
            >
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}