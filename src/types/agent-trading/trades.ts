import { 
  AgentTrade, 
  AgentTradeInsert, 
  AgentTradeUpdate 
} from './database';

// Re-export the base types for use by other modules
export type { AgentTrade, AgentTradeInsert, AgentTradeUpdate };
import { 
  OrderType, 
  TradeSide, 
  TradeStatus 
} from './common';

// Trade filter options
export interface TradeFilters {
  agentId?: string;
  symbol?: string;
  side?: TradeSide;
  status?: TradeStatus;
  orderType?: OrderType;
  strategy?: string;
  exchange?: string;
  startDate?: Date;
  endDate?: Date;
  minPrice?: number;
  maxPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  minConfidence?: number;
}

// Trade statistics
export interface TradeStatistics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  averageTradeSize: number;
  totalVolume: number;
  averageExecutionTime: number; // in milliseconds
  tradingPairs: string[];
  mostTradedSymbol: string;
  mostSuccessfulStrategy?: string;
  averageConfidenceScore: number;
}

// Trade sorting options
export enum TradeSortField {
  CREATED_AT = 'created_at',
  EXECUTED_AT = 'executed_at',
  SYMBOL = 'symbol',
  QUANTITY = 'quantity',
  PRICE = 'price',
  SIDE = 'side',
  STATUS = 'status',
  STRATEGY = 'strategy',
  CONFIDENCE = 'confidence_score'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export interface TradeSortOptions {
  field: TradeSortField;
  direction: SortDirection;
}

// Trade execution result
export interface TradeExecutionResult {
  success: boolean;
  tradeId?: string;
  orderId?: string;
  error?: string;
  executionTime?: number; // in milliseconds
  status: TradeStatus;
  filledQuantity?: number;
  filledPrice?: number;
  fee?: number;
  timestamp?: Date;
}