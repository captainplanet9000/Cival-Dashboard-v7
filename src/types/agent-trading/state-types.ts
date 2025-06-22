/**
 * Agent State Data Types
 * 
 * Type definitions for agent state data structures.
 */

/**
 * Market View
 * Represents an agent's view of a particular market
 */
export interface MarketView {
  symbol: string;
  lastPrice: number;
  view: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  lastUpdated: string;
  indicators: Record<string, number>;
}

/**
 * Agent State Data
 * Typed structure for the state JSONB column
 */
export interface AgentStateData {
  version: string;
  lastAction: string;
  tradingEnabled: boolean;
  activeStrategies: string[];
  marketViews: Record<string, MarketView>;
  pendingDecisions: string[];
  metrics: {
    tradesExecuted: number;
    successfulTrades: number;
    failedTrades: number;
    totalProfitLoss: number;
    winRate: number;
  };
  lastUpdated: string;
}