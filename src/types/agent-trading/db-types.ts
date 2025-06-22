/**
 * Agent Trading Database Types
 * 
 * Type definitions for database entities in the agent trading system.
 */

import { Database } from '../database.types';

/**
 * Agent Trading Permissions from database
 */
export type DbAgentTradingPermissions = Database['public']['Tables']['agent_trading_permissions']['Row'];

/**
 * Agent Trades from database
 */
export type DbAgentTrades = Database['public']['Tables']['agent_trades']['Row'];

/**
 * Agent Positions from database
 */
export type DbAgentPositions = Database['public']['Tables']['agent_positions']['Row'];

/**
 * Agent Performance from database
 */
export type DbAgentPerformance = Database['public']['Tables']['agent_performance']['Row'];

/**
 * Agent Status from database
 */
export type DbAgentStatus = Database['public']['Tables']['agent_status']['Row'];

/**
 * Agent Market Data Subscriptions from database
 */
export type DbAgentMarketDataSubscriptions = Database['public']['Tables']['agent_market_data_subscriptions']['Row'];

/**
 * Agent State from database
 */
export type DbAgentState = Database['public']['Tables']['agent_state']['Row'];

/**
 * Agent Checkpoints from database
 */
export type DbAgentCheckpoints = Database['public']['Tables']['agent_checkpoints']['Row'];

/**
 * Agent Decisions from database
 */
export type DbAgentDecisions = Database['public']['Tables']['agent_decisions']['Row'];