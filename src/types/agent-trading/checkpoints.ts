/**
 * Agent Trading Checkpoint Types
 * 
 * Type definitions for agent state checkpoints.
 */

import { UUID } from './common';
import { AgentStateData } from './state-types';

/**
 * Agent Checkpoint
 * Matches the agent_checkpoints table
 */
export interface AgentCheckpoint {
  id: UUID;
  agent_id: string;
  user_id: UUID;
  checkpoint_id: string;
  state: AgentStateData;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Insert type for agent checkpoints
 */
export type AgentCheckpointInsert = Omit<
  AgentCheckpoint,
  'id' | 'created_at'
>;

/**
 * Update type for agent checkpoints
 */
export type AgentCheckpointUpdate = Partial<
  Omit<AgentCheckpoint, 'id' | 'agent_id' | 'user_id' | 'checkpoint_id' | 'created_at'>
>;

/**
 * Extended Agent Checkpoint with additional properties
 */
export interface AgentCheckpointExtended extends AgentCheckpoint {
  formattedCreatedAt: string;
  checkpointType: 'automatic' | 'manual' | 'recovery';
}