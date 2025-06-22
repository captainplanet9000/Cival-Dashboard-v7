/**
 * Agent Trading Decision Types
 * 
 * Type definitions for agent trading decisions.
 */

import { UUID } from '../common';
import { TradingDecision } from './decision-types';

/**
 * Agent Decision
 * Matches the agent_decisions table
 */
export interface AgentDecision {
  id: UUID;
  agent_id: string;
  user_id: UUID;
  symbol: string;
  decision: TradingDecision;
  reasoning?: string;
  confidence_score?: number;
  executed: boolean;
  created_at: string;
}

/**
 * Insert type for agent decisions
 */
export type AgentDecisionInsert = Omit<
  AgentDecision,
  'id' | 'created_at'
>;

/**
 * Update type for agent decisions
 */
export type AgentDecisionUpdate = Partial<
  Omit<AgentDecision, 'id' | 'agent_id' | 'user_id' | 'symbol' | 'created_at'>
>;

/**
 * Extended Agent Decision with additional properties
 */
export interface AgentDecisionExtended extends AgentDecision {
  formattedCreatedAt: string;
  executionStatus: 'pending' | 'executed' | 'cancelled' | 'expired';
}