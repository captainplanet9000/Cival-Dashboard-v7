/**
 * Agent Trading API Types
 * 
 * Type definitions for API requests and responses in the agent trading system.
 */

import { AgentTrade } from './trades';
import { AgentPerformance } from './performance';

/**
 * Common response wrapper for all agent trading service responses
 */
export interface AgentTradingServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Trade execution request
 */
export interface AgentTradeExecuteRequest {
  agentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  orderType: string;
  strategy?: string;
  reasoning?: string;
}

/**
 * Trade execution response
 */
export interface AgentTradeExecuteResponse {
  tradeId: string;
  orderId: string;
  status: string;
  message: string;
}

/**
 * Agent registration request
 */
export interface AgentRegistrationRequest {
  agentId: string;
  accountId: string;
  maxTradeSize: number;
  maxPositionSize: number;
  maxDailyTrades: number;
  allowedSymbols: string[];
  allowedStrategies: string[];
  riskLevel: string;
}

/**
 * Agent registration response
 */
export interface AgentRegistrationResponse {
  agentId: string;
  isActive: boolean;
  message: string;
}