/**
 * Enhanced TypeScript types for PydanticAI integration
 * These types match the PydanticAI Python models for type safety
 */

// Trading Decision Types
export type TradeAction = 'buy' | 'sell' | 'hold' | 'close';
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';
export type MarketCondition = 'bullish' | 'bearish' | 'neutral' | 'volatile';

// Enhanced Trading Decision (from PydanticAI)
export interface TradingDecision {
  action: TradeAction;
  symbol: string;
  quantity: number;
  price?: number;
  confidence: number; // 0-1
  risk_level: RiskLevel;
  reasoning: string;
  stop_loss?: number;
  take_profit?: number;
  timeframe: string;
}

// Enhanced Market Analysis (from PydanticAI)
export interface MarketAnalysis {
  symbol: string;
  condition: MarketCondition;
  trend_direction: 'up' | 'down' | 'sideways';
  trend_strength: number; // 0-1
  volatility: number;
  support_levels: number[];
  resistance_levels: number[];
  indicators: Record<string, number>;
  sentiment_score?: number; // -1 to 1
  news_impact?: string;
  forecast: string;
}

// Enhanced Risk Assessment (from PydanticAI)
export interface RiskAssessment {
  portfolio_value: number;
  var_95: number;
  var_99: number;
  expected_shortfall: number;
  max_drawdown: number;
  risk_level: RiskLevel;
  diversification_ratio: number;
  stress_test_results: Record<string, number>;
  recommendations: string[];
}

// PydanticAI Integration Status
export interface PydanticAIStatus {
  pydantic_ai_enhanced: boolean;
  integration_status: {
    google_sdk: string;
    a2a_protocol: string;
    market_analyst: string;
    risk_monitor: string;
  };
  api_version: string;
  fallback_used: boolean;
  processing_time: number;
  compliance_status: string;
  integration_benefits: string[];
}

// Enhanced Trading Response
export interface EnhancedTradingResponse extends PydanticAIStatus {
  agent_id: string;
  decision: TradingDecision;
  reasoning: string;
  confidence: number;
  timestamp: number;
  next_review: string;
}

// Request types for PydanticAI services
export interface TradingAnalysisRequest {
  symbol: string;
  account_id: string;
  strategy_id?: string;
  market_data: Record<string, any>;
  context?: Record<string, any>;
}

export interface MarketAnalysisRequest {
  symbols: string[];
  timeframe: string;
  indicators: string[];
  include_sentiment: boolean;
  depth: 'basic' | 'standard' | 'deep';
}

export interface RiskAssessmentRequest {
  portfolio: Record<string, number>;
  timeframe: string;
  confidence_level: number;
  stress_scenarios: boolean;
}

// PydanticAI Service Health
export interface PydanticAIHealth {
  status: 'healthy' | 'unhealthy';
  services: Record<string, string>;
  pydantic_ai_version: string;
  integration_status: string;
}