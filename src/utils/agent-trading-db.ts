/**
 * Agent Trading Database Utilities
 * 
 * This file provides type-safe functions for interacting with the agent trading
 * tables in the Supabase database.
 */

import { createBrowserClient } from '@/utils/supabase/client';
import { createServerClient } from '@/utils/supabase/server';
import { 
  type Database,
  type Tables, 
  type TablesInsert, 
  type TablesUpdate 
} from '@/types/database.types';

// Type aliases for easier usage
export type AgentTradingPermission = Tables<'agent_trading_permissions'>;
export type AgentTrade = Tables<'agent_trades'>;
export type AgentPosition = Tables<'agent_positions'>;
export type AgentPerformance = Tables<'agent_performance'>;
export type AgentStatus = Tables<'agent_status'>;
export type AgentMarketDataSubscription = Tables<'agent_market_data_subscriptions'>;
export type AgentState = Tables<'agent_state'>;
export type AgentCheckpoint = Tables<'agent_checkpoints'>;
export type AgentDecision = Tables<'agent_decisions'>;

// Insert types
export type AgentTradingPermissionInsert = TablesInsert<'agent_trading_permissions'>;
export type AgentTradeInsert = TablesInsert<'agent_trades'>;
export type AgentPositionInsert = TablesInsert<'agent_positions'>;
export type AgentPerformanceInsert = TablesInsert<'agent_performance'>;
export type AgentStatusInsert = TablesInsert<'agent_status'>;
export type AgentMarketDataSubscriptionInsert = TablesInsert<'agent_market_data_subscriptions'>;
export type AgentStateInsert = TablesInsert<'agent_state'>;
export type AgentCheckpointInsert = TablesInsert<'agent_checkpoints'>;
export type AgentDecisionInsert = TablesInsert<'agent_decisions'>;

// Update types
export type AgentTradingPermissionUpdate = TablesUpdate<'agent_trading_permissions'>;
export type AgentTradeUpdate = TablesUpdate<'agent_trades'>;
export type AgentPositionUpdate = TablesUpdate<'agent_positions'>;
export type AgentPerformanceUpdate = TablesUpdate<'agent_performance'>;
export type AgentStatusUpdate = TablesUpdate<'agent_status'>;
export type AgentMarketDataSubscriptionUpdate = TablesUpdate<'agent_market_data_subscriptions'>;
export type AgentStateUpdate = TablesUpdate<'agent_state'>;
export type AgentCheckpointUpdate = TablesUpdate<'agent_checkpoints'>;
export type AgentDecisionUpdate = TablesUpdate<'agent_decisions'>;

/**
 * Error handling utility
 */
export interface DbError {
  message: string;
  details?: string;
  code?: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

/**
 * Formats a Supabase error into a standardized DbError
 */
function formatError(error: any): DbError {
  return {
    message: error.message || 'An unknown database error occurred',
    details: error.details || error.hint || undefined,
    code: error.code || undefined
  };
}

/**
 * Client-side database operations for agent trading
 */
export const agentTradingDb = {
  /**
   * Get all trading permissions for the current user
   */
  async getTradingPermissions(): Promise<DbResult<AgentTradingPermission[]>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trading_permissions')
        .select('*');

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to get trading permissions:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Get a single trading permission by agent ID
   */
  async getTradingPermissionByAgentId(agentId: string): Promise<DbResult<AgentTradingPermission>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trading_permissions')
        .select('*')
        .eq('agent_id', agentId)
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to get trading permission for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Create a new trading permission
   */
  async createTradingPermission(permission: AgentTradingPermissionInsert): Promise<DbResult<AgentTradingPermission>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trading_permissions')
        .insert(permission)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to create trading permission:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Update a trading permission
   */
  async updateTradingPermission(
    agentId: string, 
    updates: AgentTradingPermissionUpdate
  ): Promise<DbResult<AgentTradingPermission>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trading_permissions')
        .update(updates)
        .eq('agent_id', agentId)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to update trading permission for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Get trades for a specific agent
   */
  async getTradesByAgentId(agentId: string): Promise<DbResult<AgentTrade[]>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trades')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to get trades for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Create a new trade
   */
  async createTrade(trade: AgentTradeInsert): Promise<DbResult<AgentTrade>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_trades')
        .insert(trade)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to create trade:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Get current positions for an agent
   */
  async getPositionsByAgentId(agentId: string): Promise<DbResult<AgentPosition[]>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_positions')
        .select('*')
        .eq('agent_id', agentId);

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to get positions for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Create or update an agent status
   */
  async upsertAgentStatus(status: AgentStatusInsert): Promise<DbResult<AgentStatus>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_status')
        .upsert(status, { onConflict: 'agent_id' })
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to upsert agent status:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Create a checkpoint for an agent's state
   */
  async createCheckpoint(checkpoint: AgentCheckpointInsert): Promise<DbResult<AgentCheckpoint>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_checkpoints')
        .insert(checkpoint)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to create agent checkpoint:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Get checkpoints for an agent
   */
  async getCheckpointsByAgentId(agentId: string): Promise<DbResult<AgentCheckpoint[]>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_checkpoints')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to get checkpoints for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Save an agent decision
   */
  async createDecision(decision: AgentDecisionInsert): Promise<DbResult<AgentDecision>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_decisions')
        .insert(decision)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error('Failed to create agent decision:', err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Update an agent decision (e.g., mark as executed)
   */
  async updateDecision(
    id: string,
    updates: AgentDecisionUpdate
  ): Promise<DbResult<AgentDecision>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_decisions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to update decision ${id}:`, err);
      return { data: null, error: formatError(err) };
    }
  },

  /**
   * Get recent decisions for an agent
   */
  async getRecentDecisionsByAgentId(
    agentId: string,
    limit = 10
  ): Promise<DbResult<AgentDecision[]>> {
    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from('agent_decisions')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return { data, error: null };
    } catch (err) {
      console.error(`Failed to get recent decisions for agent ${agentId}:`, err);
      return { data: null, error: formatError(err) };
    }
  }
};

/**
 * Server-side database operations for agent trading
 * These functions should be used in server components or API routes
 */
export async function getServerAgentTradingDb() {
  const supabase = await createServerClient();
  
  return {
    /**
     * Get all trading permissions (server-side)
     */
    async getTradingPermissions(): Promise<DbResult<AgentTradingPermission[]>> {
      try {
        const { data, error } = await supabase
          .from('agent_trading_permissions')
          .select('*');

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error('Server: Failed to get trading permissions:', err);
        return { data: null, error: formatError(err) };
      }
    },

    /**
     * Get trades for a specific agent (server-side)
     */
    async getTradesByAgentId(agentId: string): Promise<DbResult<AgentTrade[]>> {
      try {
        const { data, error } = await supabase
          .from('agent_trades')
          .select('*')
          .eq('agent_id', agentId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error(`Server: Failed to get trades for agent ${agentId}:`, err);
        return { data: null, error: formatError(err) };
      }
    },

    /**
     * Get performance metrics for an agent (server-side)
     */
    async getPerformanceByAgentId(
      agentId: string,
      limit = 30
    ): Promise<DbResult<AgentPerformance[]>> {
      try {
        const { data, error } = await supabase
          .from('agent_performance')
          .select('*')
          .eq('agent_id', agentId)
          .order('date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error(`Server: Failed to get performance for agent ${agentId}:`, err);
        return { data: null, error: formatError(err) };
      }
    },

    /**
     * Create a new trading permission (server-side)
     */
    async createTradingPermission(permission: AgentTradingPermissionInsert): Promise<DbResult<AgentTradingPermission>> {
      try {
        const { data, error } = await supabase
          .from('agent_trading_permissions')
          .insert(permission)
          .select()
          .single();

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error('Server: Failed to create trading permission:', err);
        return { data: null, error: formatError(err) };
      }
    },

    /**
     * Create a new trade (server-side)
     */
    async createTrade(trade: AgentTradeInsert): Promise<DbResult<AgentTrade>> {
      try {
        const { data, error } = await supabase
          .from('agent_trades')
          .insert(trade)
          .select()
          .single();

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error('Server: Failed to create trade:', err);
        return { data: null, error: formatError(err) };
      }
    },

    /**
     * Create a new checkpoint (server-side)
     */
    async createCheckpoint(checkpoint: AgentCheckpointInsert): Promise<DbResult<AgentCheckpoint>> {
      try {
        const { data, error } = await supabase
          .from('agent_checkpoints')
          .insert(checkpoint)
          .select()
          .single();

        if (error) throw error;
        
        return { data, error: null };
      } catch (err) {
        console.error('Server: Failed to create checkpoint:', err);
        return { data: null, error: formatError(err) };
      }
    }
  };
}