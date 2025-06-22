import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { 
  AgentTradingPermission, 
  AgentTrade, 
  AgentPosition,
  AgentPerformance
} from '@/utils/agent-trading-db';
import {
  TradingSignal
} from '@/lib/types/trading';

// Define StrategyPerformance type locally if not available elsewhere
interface StrategyPerformance {
  id: string;
  strategy_name: string;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  trades_count: number;
  period_start: string;
  period_end: string;
  created_at?: string;
  updated_at?: string;
}

// Define TradingConfig type locally if not available elsewhere
interface TradingConfig {
  id: string;
  user_id: string;
  config_name: string;
  risk_parameters: Record<string, any>;
  strategy_settings: Record<string, any>;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export class SupabaseService {
  private static instance: SupabaseService;
  private client: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    this.client = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // Authentication methods
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  async signUp(email: string, password: string) {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  }
  
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw error;
    }
  }
  
  async getCurrentUser() {
    const { data: { user }, error } = await this.client.auth.getUser();
    
    if (error) {
      throw error;
    }
    
    return user;
  }

  async getSession() {
    const { data: { session }, error } = await this.client.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    return session;
  }

  // Agent Trading Permissions
  async getAgentTradingPermissions(userId?: string): Promise<AgentTradingPermission[]> {
    let query = this.client
      .from('agent_trading_permissions')
      .select('*');
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent trading permissions:', error);
      throw error;
    }
    
    return data as unknown as AgentTradingPermission[];
  }

  async getAgentTradingPermission(agentId: string): Promise<AgentTradingPermission> {
    const { data, error } = await this.client
      .from('agent_trading_permissions')
      .select('*')
      .eq('agent_id', agentId)
      .single();
    
    if (error) {
      console.error(`Error fetching agent trading permission for ${agentId}:`, error);
      throw error;
    }
    
    return data as unknown as AgentTradingPermission;
  }

  async createAgentTradingPermission(permission: Omit<AgentTradingPermission, 'created_at' | 'updated_at'>) {
    const { data, error } = await this.client
      .from('agent_trading_permissions')
      .insert(permission)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent trading permission:', error);
      throw error;
    }
    
    return data as unknown as AgentTradingPermission;
  }

  async updateAgentTradingPermission(agentId: string, updates: Partial<AgentTradingPermission>) {
    const { data, error } = await this.client
      .from('agent_trading_permissions')
      .update(updates)
      .eq('agent_id', agentId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating agent trading permission for ${agentId}:`, error);
      throw error;
    }
    
    return data as unknown as AgentTradingPermission;
  }

  async deleteAgentTradingPermission(agentId: string) {
    const { error } = await this.client
      .from('agent_trading_permissions')
      .delete()
      .eq('agent_id', agentId);
    
    if (error) {
      console.error(`Error deleting agent trading permission for ${agentId}:`, error);
      throw error;
    }
    
    return true;
  }

  // Agent Trades
  async getAgentTrades(
    filters: { 
      agentId?: string, 
      userId?: string, 
      symbol?: string, 
      status?: string,
      startDate?: Date,
      endDate?: Date
    } = {},
    pagination: { page?: number, limit?: number } = {}
  ): Promise<AgentTrade[]> {
    let query = this.client
      .from('agent_trades')
      .select('*');
    
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId);
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    // Apply pagination
    if (pagination.limit) {
      query = query.limit(pagination.limit);
      
      if (pagination.page && pagination.page > 1) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }
    }
    
    // Sort by creation date, newest first
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent trades:', error);
      throw error;
    }
    
    return data as unknown as AgentTrade[];
  }

  async getAgentTrade(tradeId: string): Promise<AgentTrade> {
    const { data, error } = await this.client
      .from('agent_trades')
      .select('*')
      .eq('id', tradeId)
      .single();
    
    if (error) {
      console.error(`Error fetching agent trade ${tradeId}:`, error);
      throw error;
    }
    
    return data as unknown as AgentTrade;
  }

  async createAgentTrade(trade: Omit<AgentTrade, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await this.client
      .from('agent_trades')
      .insert(trade)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating agent trade:', error);
      throw error;
    }
    
    return data as unknown as AgentTrade;
  }

  async updateAgentTrade(tradeId: string, updates: Partial<AgentTrade>) {
    const { data, error } = await this.client
      .from('agent_trades')
      .update(updates)
      .eq('id', tradeId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating agent trade ${tradeId}:`, error);
      throw error;
    }
    
    return data as unknown as AgentTrade;
  }

  // Agent Positions
  async getAgentPositions(
    filters: { 
      agentId?: string, 
      userId?: string, 
      symbol?: string, 
      accountId?: string 
    } = {}
  ): Promise<AgentPosition[]> {
    let query = this.client
      .from('agent_positions')
      .select('*');
    
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId);
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol);
    }
    
    if (filters.accountId) {
      query = query.eq('account_id', filters.accountId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent positions:', error);
      throw error;
    }
    
    return data as unknown as AgentPosition[];
  }

  async getAgentPosition(positionId: string): Promise<AgentPosition> {
    const { data, error } = await this.client
      .from('agent_positions')
      .select('*')
      .eq('id', positionId)
      .single();
    
    if (error) {
      console.error(`Error fetching agent position ${positionId}:`, error);
      throw error;
    }
    
    return data as unknown as AgentPosition;
  }

  async createOrUpdateAgentPosition(
    position: Omit<AgentPosition, 'id' | 'opened_at' | 'updated_at'>
  ) {
    // Check if position already exists for this agent/symbol/account
    const { data: existing } = await this.client
      .from('agent_positions')
      .select('id')
      .eq('agent_id', position.agent_id)
      .eq('symbol', position.symbol)
      .maybeSingle();
    
    if (existing) {
      // Update existing position
      const { data, error } = await this.client
        .from('agent_positions')
        .update(position)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating agent position for ${position.agent_id}/${position.symbol}:`, error);
        throw error;
      }
      
      return data as unknown as AgentPosition;
    } else {
      // Create new position
      const { data, error } = await this.client
        .from('agent_positions')
        .insert(position)
        .select()
        .single();
      
      if (error) {
        console.error('Error creating agent position:', error);
        throw error;
      }
      
      return data as unknown as AgentPosition;
    }
  }

  async closeAgentPosition(positionId: string) {
    const { error } = await this.client
      .from('agent_positions')
      .delete()
      .eq('id', positionId);
    
    if (error) {
      console.error(`Error closing agent position ${positionId}:`, error);
      throw error;
    }
    
    return true;
  }

  // Agent Performance
  async getAgentPerformance(
    filters: { 
      agentId?: string, 
      userId?: string,
      startDate?: Date,
      endDate?: Date
    } = {}
  ): Promise<AgentPerformance[]> {
    let query = this.client
      .from('agent_performance')
      .select('*');
    
    if (filters.agentId) {
      query = query.eq('agent_id', filters.agentId);
    }
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.startDate) {
      query = query.gte('date', filters.startDate.toISOString().split('T')[0]);
    }
    
    if (filters.endDate) {
      query = query.lte('date', filters.endDate.toISOString().split('T')[0]);
    }
    
    // Sort by date, newest first
    query = query.order('date', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching agent performance:', error);
      throw error;
    }
    
    return data as unknown as AgentPerformance[];
  }

  // Trading Signals
  async getTradingSignals(
    filters: { 
      userId?: string,
      symbol?: string,
      signalType?: string,
      direction?: 'buy' | 'sell' | 'neutral',
      isActive?: boolean,
      startDate?: Date,
      endDate?: Date
    } = {},
    pagination: { page?: number, limit?: number } = {}
  ): Promise<TradingSignal[]> {
    let query = this.client
      .from('trading_signals')
      .select('*');
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol);
    }
    
    if (filters.signalType) {
      query = query.eq('signal_type', filters.signalType);
    }
    
    if (filters.direction) {
      query = query.eq('direction', filters.direction);
    }
    
    if (filters.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    // Apply pagination
    if (pagination.limit) {
      query = query.limit(pagination.limit);
      
      if (pagination.page && pagination.page > 1) {
        const offset = (pagination.page - 1) * pagination.limit;
        query = query.range(offset, offset + pagination.limit - 1);
      }
    }
    
    // Sort by creation date, newest first
    query = query.order('created_at', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching trading signals:', error);
      throw error;
    }
    
    return data as unknown as TradingSignal[];
  }

  async createTradingSignal(signal: Omit<TradingSignal, 'id' | 'created_at'>) {
    const { data, error } = await this.client
      .from('trading_signals')
      .insert(signal)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating trading signal:', error);
      throw error;
    }
    
    return data as unknown as TradingSignal;
  }

  async deactivateTradingSignal(signalId: string) {
    const { data, error } = await this.client
      .from('trading_signals')
      .update({ is_active: false })
      .eq('id', signalId)
      .select()
      .single();
    
    if (error) {
      console.error(`Error deactivating trading signal ${signalId}:`, error);
      throw error;
    }
    
    return data as unknown as TradingSignal;
  }

  // Strategy Performance
  async getStrategyPerformance(
    filters: { 
      userId?: string,
      strategyName?: string,
      symbol?: string,
      timeframe?: string
    } = {}
  ): Promise<StrategyPerformance[]> {
    let query = this.client
      .from('strategy_performance')
      .select('*');
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters.strategyName) {
      query = query.eq('strategy_name', filters.strategyName);
    }
    
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol);
    }
    
    if (filters.timeframe) {
      query = query.eq('timeframe', filters.timeframe);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching strategy performance:', error);
      throw error;
    }
    
    return data as unknown as StrategyPerformance[];
  }

  async updateStrategyPerformance(
    strategyName: string,
    symbol: string,
    timeframe: string,
    updates: Partial<StrategyPerformance>
  ) {
    const { data, error } = await this.client
      .from('strategy_performance')
      .update(updates)
      .eq('strategy_name', strategyName)
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .select()
      .single();
    
    if (error) {
      console.error(`Error updating strategy performance for ${strategyName}/${symbol}/${timeframe}:`, error);
      throw error;
    }
    
    return data as unknown as StrategyPerformance;
  }

  // Trading Config
  async getTradingConfigs(userId?: string): Promise<TradingConfig[]> {
    let query = this.client
      .from('trading_config')
      .select('*');
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching trading configs:', error);
      throw error;
    }
    
    return data as unknown as TradingConfig[];
  }

  async getTradingConfig(userId: string, configName: string): Promise<TradingConfig> {
    const { data, error } = await this.client
      .from('trading_config')
      .select('*')
      .eq('user_id', userId)
      .eq('config_name', configName)
      .single();
    
    if (error) {
      console.error(`Error fetching trading config ${configName} for user ${userId}:`, error);
      throw error;
    }
    
    return data as unknown as TradingConfig;
  }

  async saveUserTradingConfig(
    userId: string, 
    configName: string, 
    configData: Record<string, any>
  ): Promise<TradingConfig> {
    const config = {
      user_id: userId,
      config_name: configName,
      config_data: configData,
      is_active: true
    };
    
    // Check if config already exists
    const { data: existing } = await this.client
      .from('trading_config')
      .select('id')
      .eq('user_id', userId)
      .eq('config_name', configName)
      .maybeSingle();
    
    if (existing) {
      // Update existing config
      const { data, error } = await this.client
        .from('trading_config')
        .update(config)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating trading config ${configName} for user ${userId}:`, error);
        throw error;
      }
      
      return data as unknown as TradingConfig;
    } else {
      // Create new config
      const { data, error } = await this.client
        .from('trading_config')
        .insert(config)
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating trading config ${configName} for user ${userId}:`, error);
        throw error;
      }
      
      return data as unknown as TradingConfig;
    }
  }
}

// Export a singleton instance
export const supabaseService = SupabaseService.getInstance();

export default supabaseService;