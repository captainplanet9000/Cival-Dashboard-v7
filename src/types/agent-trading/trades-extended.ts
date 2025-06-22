/**
 * Extended Agent Trading Trades Types
 * 
 * Additional type definitions for agent trading trades.
 */

import { AgentTrade } from './trades';

/**
 * Update type for agent trades
 */
export type AgentTradeUpdate = Partial<
  Omit<AgentTrade, 'id' | 'trade_id' | 'agent_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Extended Agent Trade with calculated properties
 */
export interface AgentTradeExtended extends AgentTrade {
  formattedExecutedAt: string;
  formattedCreatedAt: string;
  isProfitable?: boolean;
  profitLossAmount?: number;
  durationMs?: number;
}