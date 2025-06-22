/**
 * TypeScript types for Trading Agent tables
 * These types match the schema defined in the migration files:
 * - 20250526105100_create_vault_system_tables.sql
 * - 20250526105259_create_trading_agent_tables.sql
 */

export interface VaultCredential {
  id: number;
  name: string;
  description?: string | null;
  credential_type: 'api_key' | 'oauth_token' | 'jwt' | 'password' | 'private_key' | 'other';
  encrypted_value: string;
  metadata?: Record<string, any>;
  is_active: boolean;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultAccessLog {
  id: number;
  credential_id?: number | null;
  action: 'create' | 'read' | 'update' | 'delete' | 'use';
  actor: string;
  ip_address?: string | null;
  user_agent?: string | null;
  success: boolean;
  details?: Record<string, any>;
  created_at: string;
}

export interface VaultEncryptionKey {
  id: number;
  key_name: string;
  key_version: number;
  encrypted_key: string;
  is_active: boolean;
  rotation_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentTransaction {
  id: number;
  agent_id: number;
  transaction_type: 'buy' | 'sell' | 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake' | 'claim' | 'other';
  status: 'pending' | 'confirmed' | 'failed' | 'rejected';
  amount_in?: number | null;
  token_in?: string | null;
  amount_out?: number | null;
  token_out?: string | null;
  price?: number | null;
  gas_cost_eth?: number | null;
  gas_cost_usd?: number | null;
  transaction_hash?: string | null;
  block_number?: number | null;
  error_message?: string | null;
  metadata?: Record<string, any>;
  executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentHealth {
  id: number;
  agent_id: number;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  cpu_usage?: number | null;
  memory_usage?: number | null;
  disk_usage?: number | null;
  uptime_seconds?: number | null;
  last_heartbeat?: string | null;
  health_details?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentEvent {
  id: number;
  agent_id: number;
  event_type: 'start' | 'stop' | 'pause' | 'resume' | 'error' | 'warning' | 'info';
  event_message: string;
  event_details?: Record<string, any>;
  created_at: string;
}

export interface WalletBalance {
  id: number;
  agent_id: number;
  wallet_address: string;
  token_address: string;
  token_symbol: string;
  balance: number;
  balance_usd?: number | null;
  last_updated?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExchangeCredential {
  id: number;
  agent_id?: number | null;
  exchange_name: string;
  encrypted_api_key: string;
  encrypted_api_secret: string;
  encrypted_passphrase?: string | null;
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Utility function types for vault operations
export type EncryptCredentialFn = (credentialValue: string, keyName?: string) => Promise<string>;
export type DecryptCredentialFn = (encryptedValue: string, keyName?: string) => Promise<string>;