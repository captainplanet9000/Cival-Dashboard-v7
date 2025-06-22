/**
 * Agent Trading Permissions Types
 * 
 * Type definitions for agent trading permissions.
 */

import { UUID } from '../common';

/**
 * Agent Trading Permissions
 * Matches the agent_trading_permissions table
 */
export interface AgentTradingPermissions {
  agent_id: string;
  user_id: UUID;
  account_id: string;
  max_trade_size: number;
  max_position_size: number;
  max_daily_trades: number;
  allowed_symbols: string[];
  allowed_strategies: string[];
  risk_level: string;
  is_active: boolean;
  trades_today: number;
  position_value: number;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for agent trading permissions
 */
export type AgentTradingPermissionsInsert = Omit<
  AgentTradingPermissions, 
  'created_at' | 'updated_at'
>;

/**
 * Update type for agent trading permissions
 */
export type AgentTradingPermissionsUpdate = Partial<
  Omit<AgentTradingPermissions, 'agent_id' | 'user_id' | 'created_at' | 'updated_at'>
>;