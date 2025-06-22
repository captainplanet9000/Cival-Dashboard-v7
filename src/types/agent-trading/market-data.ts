/**
 * Agent Trading Market Data Subscription Types
 * 
 * Type definitions for agent trading market data subscriptions.
 */

import { UUID } from '../common';

/**
 * Agent Market Data Subscription
 * Matches the agent_market_data_subscriptions table
 */
export interface AgentMarketDataSubscription {
  id: UUID;
  subscription_id: string;
  agent_id: string;
  user_id: UUID;
  symbol: string;
  interval: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Insert type for agent market data subscriptions
 */
export type AgentMarketDataSubscriptionInsert = Omit<
  AgentMarketDataSubscription,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Update type for agent market data subscriptions
 */
export type AgentMarketDataSubscriptionUpdate = Partial<
  Omit<AgentMarketDataSubscription, 'id' | 'subscription_id' | 'agent_id' | 'user_id' | 'created_at' | 'updated_at'>
>;

/**
 * Extended Agent Market Data Subscription with additional properties
 */
export interface AgentMarketDataSubscriptionExtended extends AgentMarketDataSubscription {
  formattedCreatedAt: string;
  subscriptionStatus: 'active' | 'paused' | 'error';
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
}