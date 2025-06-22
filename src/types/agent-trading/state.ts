/**
 * Agent Trading State Types
 * 
 * Type definitions for agent state management.
 */

import { UUID } from '../common';
import { AgentStateData } from './state-types';

/**
 * Agent State
 * Matches the agent_state table
 */
export interface AgentState {
  agent_id: string;
  user_id: UUID;
  state: AgentStateData;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for agent state
 */
export type AgentStateInsert = Omit<
  AgentState,
  'created_at' | 'updated_at'
>;

/**
 * Update type for agent state
 */
export type AgentStateUpdate = Partial<
  Omit<AgentState, 'agent_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Extended Agent State with additional properties
 */
export interface AgentStateExtended extends AgentState {
  formattedUpdatedAt: string;
}