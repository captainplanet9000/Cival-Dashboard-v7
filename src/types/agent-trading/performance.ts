/**
 * Agent Trading Performance Types
 * 
 * Type definitions for agent trading performance metrics.
 */

import { UUID } from '../common';

/**
 * Agent Performance
 * Matches the agent_performance table
 */
export interface AgentPerformance {
  id: UUID;
  agent_id: string;
  user_id: UUID;
  date: string;
  total_trades: number;
  successful_trades: number;
  failed_trades: number;
  total_profit_loss: number;
  win_rate: number;
  average_trade_duration?: number;
  max_drawdown?: number;
  sharpe_ratio?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for agent performance
 */
export type AgentPerformanceInsert = Omit<
  AgentPerformance,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Update type for agent performance
 */
export type AgentPerformanceUpdate = Partial<
  Omit<AgentPerformance, 'id' | 'agent_id' | 'user_id' | 'date' | 'created_at' | 'updated_at'>
>;