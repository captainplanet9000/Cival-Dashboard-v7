import { 
  AgentPosition, 
  AgentPositionInsert, 
  AgentPositionUpdate 
} from './database';

// Re-export the base types for use by other modules
export type { AgentPosition, AgentPositionInsert, AgentPositionUpdate };
import { 
  PositionSide, 
  PositionStatus 
} from './common';

// Position filter options
export interface PositionFilters {
  agentId?: string;
  symbol?: string;
  side?: PositionSide;
  status?: PositionStatus;
  strategy?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minValue?: number;
  maxValue?: number;
  minPnl?: number;
  maxPnl?: number;
  minPnlPercentage?: number;
  maxPnlPercentage?: number;
}

// Position statistics
export interface PositionStatistics {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  longPositions: number;
  shortPositions: number;
  totalValue: number;
  totalUnrealizedPnl: number;
  averagePnlPercentage: number;
  bestPerformingSymbol: string;
  worstPerformingSymbol: string;
  averagePositionSize: number;
  averagePositionDuration: number; // in days
}

// Position sorting options
export enum PositionSortField {
  CREATED_AT = 'created_at',
  SYMBOL = 'symbol',
  QUANTITY = 'quantity',
  AVERAGE_ENTRY_PRICE = 'average_entry_price',
  CURRENT_PRICE = 'current_price',
  UNREALIZED_PNL = 'unrealized_pnl',
  POSITION_VALUE = 'position_value',
  SIDE = 'side',
  STATUS = 'status'
}

export interface PositionSortOptions {
  field: PositionSortField;
  direction: 'asc' | 'desc';
}

// Position update result
export interface PositionUpdateResult {
  success: boolean;
  positionId?: string;
  error?: string;
  updatedFields?: Partial<AgentPosition>;
}