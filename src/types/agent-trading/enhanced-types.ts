import { 
  AgentCheckpoint, 
  AgentDecision, 
  AgentMarketDataSubscription, 
  AgentPerformance, 
  AgentPosition, 
  AgentState, 
  AgentStatusRecord, 
  AgentTrade, 
  AgentTradingPermission 
} from './database';
import { OrderType, PositionSide, PositionStatus, RiskLevel, TradeStatus, TradeSide, TradingDecision, TradingStrategy } from './common';

// Note: Base types are exported from their respective modules (trades, positions, etc.)
// This file only exports enhanced/extended versions

// Enhanced Agent Trading Permission with UI-specific properties
export interface EnhancedAgentTradingPermission extends AgentTradingPermission {
  // Client-side calculated properties
  remainingDailyTrades: number;
  riskLevelDisplay: string;
  positionUtilizationPercentage: number;
  allowedSymbolsArray: string[];
  allowedStrategiesArray: string[];
  formattedMaxTradeSize: string;
  formattedMaxPositionSize: string;
  statusBadgeColor: string;
  lastModified: Date;
}

// Enhanced Agent Trade with UI-specific properties
export interface EnhancedAgentTrade extends AgentTrade {
  // Client-side calculated properties
  formattedQuantity: string;
  formattedPrice: string;
  totalValue: number;
  formattedTotalValue: string;
  sideColor: string;
  statusBadgeColor: string;
  executedAtFormatted: string;
  createdAtFormatted: string;
  profitLoss?: number;
  profitLossPercentage?: number;
  durationInSeconds?: number;
  formattedDuration?: string;
}

// Enhanced Agent Position with UI-specific properties
export interface EnhancedAgentPosition extends AgentPosition {
  // Client-side calculated properties
  formattedQuantity: string;
  formattedAverageEntryPrice: string;
  formattedCurrentPrice: string;
  formattedUnrealizedPnl: string;
  formattedPositionValue: string;
  pnlPercentage: number;
  formattedPnlPercentage: string;
  sideColor: string;
  statusBadgeColor: string;
  pnlColor: string;
  durationInDays: number;
  createdAtFormatted: string;
}

// Enhanced Agent Performance with UI-specific properties
export interface EnhancedAgentPerformance extends AgentPerformance {
  // Client-side calculated properties
  formattedProfitLoss: string;
  formattedProfitLossPercentage: string;
  formattedMaxDrawdown: string;
  formattedWinRate: string;
  formattedAverageTradeDuration: string;
  profitLossColor: string;
  dateFormatted: string;
  sharpeRatingText: string;
  performanceRating: 'excellent' | 'good' | 'average' | 'poor';
}

// Enhanced Agent Status with UI-specific properties
export interface EnhancedAgentStatus extends AgentStatusRecord {
  // Client-side calculated properties
  statusBadgeColor: string;
  formattedHealthScore: string;
  healthScoreColor: string;
  formattedLastActivity: string;
  formattedUptime: string;
  hasError: boolean;
  resourceUtilization: number; // Combined CPU and memory usage
  formattedResourceUtilization: string;
}

// Enhanced Agent Market Data Subscription with UI-specific properties
export interface EnhancedAgentMarketDataSubscription extends AgentMarketDataSubscription {
  // Client-side calculated properties
  formattedLastUpdated: string;
  statusBadgeColor: string;
  intervalDisplay: string;
  dataTypeDisplay: string;
  sourceDisplay: string;
  lastUpdateRelative: string;
  isStale: boolean;
}

// Enhanced Agent State with UI-specific properties
export interface EnhancedAgentState extends AgentState {
  // Client-side calculated properties
  stateSize: number;
  lastStateUpdateFormatted: string;
  stateVersion: number;
  hasCheckpoint: boolean;
  stateComplexity: 'simple' | 'moderate' | 'complex';
  lastCheckpointRelative: string;
  parsedState: Record<string, any>;
}

// Enhanced Agent Checkpoint with UI-specific properties
export interface EnhancedAgentCheckpoint extends AgentCheckpoint {
  // Client-side calculated properties
  createdAtFormatted: string;
  createdAtRelative: string;
  stateSize: number;
  stateComplexity: 'simple' | 'moderate' | 'complex';
  parsedState: Record<string, any>;
}

// Enhanced Agent Decision with UI-specific properties
export interface EnhancedAgentDecision extends AgentDecision {
  // Client-side calculated properties
  createdAtFormatted: string;
  executedAtFormatted: string;
  confidenceDisplay: string;
  confidenceColor: string;
  parsedDecision: TradingDecision;
  parsedSignals: Record<string, any>[];
  hasResult: boolean;
  resultSummary: string;
  decisionTypeDisplay: string;
  executionDuration: number;
}