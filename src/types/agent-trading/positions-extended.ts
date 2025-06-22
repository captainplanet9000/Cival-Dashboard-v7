/**
 * Extended Agent Trading Positions Types
 * 
 * Additional type definitions for agent trading positions.
 */

import { AgentPosition } from './positions';

/**
 * Extended Agent Position with calculated properties
 */
export interface AgentPositionExtended extends AgentPosition {
  formattedOpenedAt: string;
  currentValue: number;
  unrealizedPnlPercentage: number;
  positionDuration: string;
}