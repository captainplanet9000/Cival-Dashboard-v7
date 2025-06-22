/**
 * Agent Trading Status Types
 * 
 * Type definitions for agent trading status tracking.
 */

import { UUID } from '../common';
import { AgentStatusType } from './enums';

/**
 * Agent Status
 * Matches the agent_status table
 */
export interface AgentStatus {
  agent_id: string;
  user_id: UUID;
  status: string;
  last_activity: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for agent status
 */
export type AgentStatusInsert = Omit<
  AgentStatus,
  'created_at' | 'updated_at'
>;

/**
 * Update type for agent status
 */
export type AgentStatusUpdate = Partial<
  Omit<AgentStatus, 'agent_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Extended Agent Status with additional calculated properties
 */
export interface AgentStatusExtended extends AgentStatus {
  formattedLastActivity: string;
  statusColor: string;
  statusIcon: string;
  isActive: boolean;
}