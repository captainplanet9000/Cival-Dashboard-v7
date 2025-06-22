/**
 * Enums for Agent Trading System
 * 
 * Enumerated type definitions used across the agent trading system.
 */

/**
 * Trade status options
 */
export enum TradeStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  FILLED = 'filled',
  PARTIALLY_FILLED = 'partially_filled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  FAILED = 'failed',
  ERROR = 'error'
}

/**
 * Order type options
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit',
  TRAILING_STOP = 'trailing_stop',
  BRACKET = 'bracket',
  OCO = 'oco'
}

/**
 * Trade side options
 */
export enum TradeSide {
  BUY = 'buy',
  SELL = 'sell'
}

/**
 * Agent status options
 */
export enum AgentStatusType {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  WAITING_GAS = 'waiting_gas'
}