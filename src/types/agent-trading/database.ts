import { Database } from '../database.types';
import { 
  AgentStatus, 
  OrderType, 
  PositionSide, 
  PositionStatus, 
  RiskLevel, 
  TradeStatus, 
  TradeSide 
} from './common';

// Agent Trading Permissions Types
export type AgentTradingPermission = Database['public']['Tables']['agent_trading_permissions']['Row'];
export type AgentTradingPermissionInsert = Database['public']['Tables']['agent_trading_permissions']['Insert'];
export type AgentTradingPermissionUpdate = Database['public']['Tables']['agent_trading_permissions']['Update'];

// Agent Trades Types
export type AgentTrade = Database['public']['Tables']['agent_trades']['Row'];
export type AgentTradeInsert = Database['public']['Tables']['agent_trades']['Insert'];
export type AgentTradeUpdate = Database['public']['Tables']['agent_trades']['Update'];

// Agent Positions Types
export type AgentPosition = Database['public']['Tables']['agent_positions']['Row'];
export type AgentPositionInsert = Database['public']['Tables']['agent_positions']['Insert'];
export type AgentPositionUpdate = Database['public']['Tables']['agent_positions']['Update'];

// Agent Performance Types
export type AgentPerformance = Database['public']['Tables']['agent_performance']['Row'];
export type AgentPerformanceInsert = Database['public']['Tables']['agent_performance']['Insert'];
export type AgentPerformanceUpdate = Database['public']['Tables']['agent_performance']['Update'];

// Agent Status Types
export type AgentStatusRecord = Database['public']['Tables']['agent_status']['Row'];
export type AgentStatusInsert = Database['public']['Tables']['agent_status']['Insert'];
export type AgentStatusUpdate = Database['public']['Tables']['agent_status']['Update'];

// Agent Market Data Subscriptions Types
export type AgentMarketDataSubscription = Database['public']['Tables']['agent_market_data_subscriptions']['Row'];
export type AgentMarketDataSubscriptionInsert = Database['public']['Tables']['agent_market_data_subscriptions']['Insert'];
export type AgentMarketDataSubscriptionUpdate = Database['public']['Tables']['agent_market_data_subscriptions']['Update'];

// Agent State Types
export type AgentState = Database['public']['Tables']['agent_state']['Row'];
export type AgentStateInsert = Database['public']['Tables']['agent_state']['Insert'];
export type AgentStateUpdate = Database['public']['Tables']['agent_state']['Update'];

// Agent Checkpoints Types
export type AgentCheckpoint = Database['public']['Tables']['agent_checkpoints']['Row'];
export type AgentCheckpointInsert = Database['public']['Tables']['agent_checkpoints']['Insert'];
export type AgentCheckpointUpdate = Database['public']['Tables']['agent_checkpoints']['Update'];

// Agent Decisions Types
export type AgentDecision = Database['public']['Tables']['agent_decisions']['Row'];
export type AgentDecisionInsert = Database['public']['Tables']['agent_decisions']['Insert'];
export type AgentDecisionUpdate = Database['public']['Tables']['agent_decisions']['Update'];