/**
 * Extended Agent Trading Performance Types
 * 
 * Additional type definitions for agent trading performance metrics.
 */

import { AgentPerformance } from './performance';

/**
 * Extended Performance metrics with additional calculated properties
 */
export interface AgentPerformanceExtended extends AgentPerformance {
  formattedDate: string;
  successRate: number;
  averageProfitPerTrade: number;
}