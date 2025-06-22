// Vault Banking Integration Types for Cival Dashboard
export interface VaultAccount {
  id: string;
  vault_account_id: string;
  name: string;
  account_type: 'trading' | 'reserve' | 'settlement' | 'fee' | 'master';
  currency: string;
  balance: number;
  available_balance: number;
  reserved_balance: number;
  risk_level: 'low' | 'medium' | 'high';
  status: 'active' | 'suspended' | 'closed' | 'pending';
  parent_account_id?: string;
  sub_accounts: string[];
  metadata: {
    created_by: string;
    purpose: string;
    trading_strategies: string[];
    risk_limits: VaultRiskLimits;
  };
  compliance_status: ComplianceStatus;
  created_at: Date;
  updated_at: Date;
}

export interface VaultRiskLimits {
  daily_withdrawal_limit: number;
  daily_trading_limit: number;
  position_concentration_limit: number;
  maximum_drawdown_limit: number;
  leverage_limit: number;
  currency_exposure_limits: Record<string, number>;
}

export interface Transaction {
  id: string;
  transaction_id: string;
  from_account_id?: string;
  to_account_id?: string;
  transaction_type: 'deposit' | 'withdrawal' | 'transfer' | 'trade_settlement' | 'fee' | 'dividend' | 'interest';
  amount: number;
  currency: string;
  exchange_rate?: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'requires_approval';
  reference: string;
  description: string;
  metadata: {
    strategy_id?: string;
    trade_id?: string;
    order_id?: string;
    external_reference?: string;
    compliance_check_id?: string;
  };
  compliance_checks: ComplianceCheck[];
  audit_trail: AuditTrailEntry[];
  created_at: Date;
  processed_at?: Date;
  completed_at?: Date;
}

export interface ComplianceStatus {
  status: 'compliant' | 'pending_review' | 'non_compliant' | 'requires_action';
  last_check: Date;
  next_check: Date;
  issues: ComplianceIssue[];
  certifications: ComplianceCertification[];
  risk_score: number;
  aml_status: 'clear' | 'flagged' | 'under_review';
  kyc_status: 'verified' | 'pending' | 'expired' | 'rejected';
}

export interface ComplianceIssue {
  id: string;
  type: 'aml' | 'kyc' | 'sanctions' | 'risk_limit' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: Date;
  resolved: boolean;
  resolved_at?: Date;
  resolution_notes?: string;
  assigned_to?: string;
}

export interface ComplianceCertification {
  type: 'aml' | 'kyc' | 'accredited_investor' | 'institutional' | 'retail';
  status: 'valid' | 'expired' | 'pending' | 'revoked';
  issued_at: Date;
  expires_at: Date;
  issuer: string;
  document_hash?: string;
}

export interface ComplianceCheck {
  id: string;
  check_type: 'aml' | 'sanctions' | 'risk_assessment' | 'transaction_monitoring' | 'suspicious_activity';
  status: 'passed' | 'failed' | 'pending' | 'manual_review';
  score: number;
  details: Record<string, any>;
  flags: string[];
  performed_at: Date;
  performed_by: 'system' | 'manual';
}

export interface FundingWorkflow {
  id: string;
  name: string;
  workflow_type: 'deposit' | 'withdrawal' | 'internal_transfer' | 'currency_exchange';
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'rejected' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requester_id: string;
  approver_id?: string;
  amount: number;
  currency: string;
  source_account_id?: string;
  destination_account_id?: string;
  external_details?: {
    bank_name: string;
    account_number: string;
    routing_number: string;
    swift_code?: string;
    reference_number: string;
  };
  approval_chain: ApprovalStep[];
  risk_assessment: WorkflowRiskAssessment;
  estimated_completion: Date;
  actual_completion?: Date;
  fees: WorkflowFee[];
  documents: WorkflowDocument[];
  audit_trail: AuditTrailEntry[];
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalStep {
  step_number: number;
  approver_role: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  comments?: string;
  approved_at?: Date;
  required_amount_threshold: number;
  auto_approve: boolean;
}

export interface WorkflowRiskAssessment {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  mitigation_actions: string[];
  approval_required: boolean;
  automatic_approval_eligible: boolean;
}

export interface RiskFactor {
  factor_type: 'amount' | 'frequency' | 'destination' | 'compliance' | 'pattern';
  weight: number;
  description: string;
  score: number;
}

export interface WorkflowFee {
  fee_type: 'processing' | 'network' | 'conversion' | 'premium' | 'regulatory';
  amount: number;
  currency: string;
  description: string;
  waived: boolean;
  waiver_reason?: string;
}

export interface WorkflowDocument {
  id: string;
  document_type: 'authorization' | 'compliance' | 'receipt' | 'confirmation' | 'audit';
  file_name: string;
  file_size: number;
  mime_type: string;
  upload_date: Date;
  encrypted: boolean;
  hash: string;
  retention_period: number;
}

export interface AuditTrailEntry {
  id: string;
  action: string;
  actor_id: string;
  actor_type: 'user' | 'system' | 'api';
  timestamp: Date;
  ip_address?: string;
  user_agent?: string;
  details: Record<string, any>;
  sensitive_data_hash?: string;
}

export interface VaultIntegration {
  connection_status: 'connected' | 'disconnected' | 'error' | 'maintenance';
  api_health: {
    status: 'healthy' | 'degraded' | 'down';
    response_time: number;
    error_rate: number;
    last_check: Date;
  };
  accounts_summary: {
    total_accounts: number;
    total_balance: number;
    available_balance: number;
    reserved_balance: number;
    currency_breakdown: Record<string, number>;
  };
  recent_transactions: Transaction[];
  pending_workflows: FundingWorkflow[];
  compliance_alerts: ComplianceIssue[];
  system_limits: {
    daily_transaction_limit: number;
    daily_volume_limit: number;
    concurrent_transactions_limit: number;
    api_rate_limit: number;
  };
}

export interface VaultConfig {
  api_endpoint: string;
  api_version: string;
  environment: 'sandbox' | 'production';
  authentication: {
    method: 'api_key' | 'oauth2' | 'jwt';
    credentials_encrypted: boolean;
    token_expiry?: Date;
  };
  security_settings: {
    encryption_enabled: boolean;
    mfa_required: boolean;
    ip_whitelist: string[];
    session_timeout: number;
  };
  integration_settings: {
    auto_sync_enabled: boolean;
    sync_interval: number;
    retry_policy: {
      max_retries: number;
      backoff_strategy: 'exponential' | 'linear' | 'fixed';
      base_delay: number;
    };
  };
} 