/**
 * Agent Trading Decision Data Types
 * 
 * Type definitions for trading decision data structures.
 */

/**
 * Trading Decision
 * Structured format for the decision JSONB column
 */
export interface TradingDecision {
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop' | 'stop_limit';
  timeInForce: 'day' | 'gtc' | 'ioc' | 'fok';
  stopPrice?: number;
  limitPrice?: number;
  strategy: string;
  indicators: Record<string, number>;
  confidence: number;
}