import { Database } from '../database.types';

// UUID type definition
export type UUID = string;

// Type aliases for database tables
export type AgentTradingPermissionRow = Database['public']['Tables']['agent_trading_permissions']['Row'];
export type AgentTradeRow = Database['public']['Tables']['agent_trades']['Row'];
export type AgentPositionRow = Database['public']['Tables']['agent_positions']['Row'];
export type AgentPerformanceRow = Database['public']['Tables']['agent_performance']['Row'];
export type AgentStatusRow = Database['public']['Tables']['agent_status']['Row'];
export type AgentMarketDataSubscriptionRow = Database['public']['Tables']['agent_market_data_subscriptions']['Row'];
export type AgentStateRow = Database['public']['Tables']['agent_state']['Row'];
export type AgentCheckpointRow = Database['public']['Tables']['agent_checkpoints']['Row'];
export type AgentDecisionRow = Database['public']['Tables']['agent_decisions']['Row'];

// Common enum types
export enum TradeSide {
  BUY = 'buy',
  SELL = 'sell'
}

export enum PositionSide {
  LONG = 'long',
  SHORT = 'short'
}

export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PARTIALLY_CLOSED = 'partially_closed'
}

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

export enum RiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high'
}

export enum TradeStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  PARTIALLY_FILLED = 'partially_filled',
  CANCELED = 'canceled',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

// Common interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface TradingDecision {
  action: TradeSide | 'hold';
  symbol: string;
  reasoning: string;
  confidence: number;
  price?: number;
  quantity?: number;
  riskScore?: number;
}