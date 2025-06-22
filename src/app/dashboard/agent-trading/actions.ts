'use server';

import { revalidatePath } from 'next/cache';
import { getServerAgentTradingDb } from '@/utils/agent-trading-db';
import type { 
  AgentTradeInsert, 
  AgentCheckpointInsert,
  AgentTradingPermissionInsert
} from '@/utils/agent-trading-db';
import { z } from 'zod';

/**
 * Validation schema for creating trading permissions
 */
const tradingPermissionSchema = z.object({
  agent_id: z.string().min(3),
  user_id: z.string().uuid(),
  account_id: z.string().min(1),
  max_trade_size: z.number().positive().optional(),
  max_position_size: z.number().positive().optional(),
  max_daily_trades: z.number().int().positive().optional(),
  allowed_symbols: z.array(z.string()).optional(),
  allowed_strategies: z.array(z.string()).optional(),
  risk_level: z.string().optional(),
  is_active: z.boolean().optional()
});

/**
 * Server action to create a new trading permission
 * This demonstrates type-safe server actions with Supabase
 */
export async function createTradingPermission(formData: FormData) {
  try {
    const rawData = {
      agent_id: formData.get('agent_id'),
      user_id: formData.get('user_id'),
      account_id: formData.get('account_id'),
      risk_level: formData.get('risk_level'),
      max_trade_size: parseFloat(formData.get('max_trade_size') as string || '10000'),
      max_position_size: parseFloat(formData.get('max_position_size') as string || '50000'),
      max_daily_trades: parseInt(formData.get('max_daily_trades') as string || '100'),
      is_active: formData.get('is_active') === 'true'
    };

    // Convert allowed_symbols and allowed_strategies from comma-separated strings to arrays
    const symbolsString = formData.get('allowed_symbols') as string;
    const strategiesString = formData.get('allowed_strategies') as string;
    
    const allowed_symbols = symbolsString ? symbolsString.split(',').map(s => s.trim()) : undefined;
    const allowed_strategies = strategiesString ? strategiesString.split(',').map(s => s.trim()) : undefined;

    // Combine all data for validation
    const data = {
      ...rawData,
      allowed_symbols,
      allowed_strategies
    };

    // Validate the data
    const validatedData = tradingPermissionSchema.parse(data);
    
    // Get server-side database utility
    const serverDb = await getServerAgentTradingDb();
    
    // Insert the new trading permission
    const { data: permission, error } = await serverDb.createTradingPermission(
      validatedData as AgentTradingPermissionInsert
    );
    
    if (error) {
      return {
        success: false,
        message: error.message,
        data: null
      };
    }

    // Revalidate the path to update the UI
    revalidatePath('/dashboard/agent-trading');
    
    return {
      success: true,
      message: 'Trading permission created successfully',
      data: permission
    };
  } catch (err) {
    console.error('Error creating trading permission:', err);
    const errorMessage = err instanceof z.ZodError 
      ? 'Validation error: ' + err.errors.map(e => e.message).join(', ')
      : 'An unexpected error occurred';
      
    return {
      success: false,
      message: errorMessage,
      data: null
    };
  }
}

/**
 * Server action to record a new trade
 */
export async function recordTrade(trade: AgentTradeInsert) {
  try {
    // Get server-side database utility
    const serverDb = await getServerAgentTradingDb();
    
    // Insert the new trade
    const { data, error } = await serverDb.createTrade(trade);
    
    if (error) {
      return {
        success: false,
        message: error.message,
        data: null
      };
    }

    // Revalidate the path to update the UI
    revalidatePath('/dashboard/agent-trading');
    
    return {
      success: true,
      message: 'Trade recorded successfully',
      data
    };
  } catch (err) {
    console.error('Error recording trade:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      data: null
    };
  }
}

/**
 * Server action to create a checkpoint for an agent's state
 */
export async function createAgentCheckpoint(checkpoint: AgentCheckpointInsert) {
  try {
    // Get server-side database utility
    const serverDb = await getServerAgentTradingDb();
    
    // Insert the checkpoint
    const { data, error } = await serverDb.createCheckpoint(checkpoint);
    
    if (error) {
      return {
        success: false,
        message: error.message,
        data: null
      };
    }

    // Revalidate the path to update the UI
    revalidatePath('/dashboard/agent-trading');
    
    return {
      success: true,
      message: 'Checkpoint created successfully',
      data
    };
  } catch (err) {
    console.error('Error creating checkpoint:', err);
    return {
      success: false,
      message: 'An unexpected error occurred',
      data: null
    };
  }
}