export interface VaultAccount {
  id: string;
  vault_account_id: string;
  name: string;
  account_type: 'master' | 'trading' | 'reserve' | 'settlement' | 'strategy';
  currency: string;
  balance: number;
  available_balance: number;
  reserved_balance: number;
  risk_level: 'low' | 'medium' | 'high';
  metadata: Record<string, any>;
  parent_account_id?: string;
  sub_accounts: VaultAccount[];
  compliance_status: ComplianceStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ComplianceStatus {
  status: 'compliant' | 'pending' | 'non_compliant' | 'under_review';
  last_check: Date;
  issues: ComplianceIssue[];
  next_review: Date;
  kyc_status: 'verified' | 'pending' | 'rejected';
  aml_status: 'clear' | 'flagged' | 'under_investigation';
}

export interface ComplianceIssue {
  id: string;
  type: 'kyc' | 'aml' | 'transaction_limit' | 'documentation' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution_required: boolean;
  deadline?: Date;
  created_at: Date;
}

export interface Transaction {
  id: string;
  transaction_id: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'fee' | 'adjustment' | 'trading';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  from_account?: string;
  to_account?: string;
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  description: string;
  reference?: string;
  metadata: Record<string, any>;
  risk_score: number;
  compliance_check: ComplianceCheck;
  created_at: Date;
  processed_at?: Date;
  completed_at?: Date;
}

export interface ComplianceCheck {
  id: string;
  status: 'approved' | 'pending' | 'flagged' | 'rejected';
  risk_score: number;
  checks_performed: string[];
  flags: ComplianceFlag[];
  approval_required: boolean;
  approved_by?: string;
  approved_at?: Date;
}

export interface ComplianceFlag {
  type: 'aml' | 'transaction_limit' | 'velocity' | 'pattern' | 'jurisdiction' | 'sanctions';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  auto_resolvable: boolean;
}

export interface FundingWorkflow {
  id: string;
  name: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'rebalance';
  status: 'draft' | 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  from_account?: string;
  to_account?: string;
  approval_chain: ApprovalStep[];
  schedule?: FundingSchedule;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovalStep {
  id: string;
  step_order: number;
  approver_role: string;
  approver_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  approved_at?: Date;
  required_amount_threshold?: number;
}

export interface FundingSchedule {
  type: 'one_time' | 'recurring';
  scheduled_date: Date;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    interval: number;
    end_date?: Date;
    max_occurrences?: number;
  };
}

export interface VaultIntegration {
  connection_status: 'connected' | 'disconnected' | 'error' | 'connecting';
  last_sync: Date;
  sync_status: 'success' | 'partial' | 'failed';
  api_health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    response_time: number; // milliseconds
    error_rate: number; // percentage
  };
  accounts: VaultAccount[];
  pending_transactions: Transaction[];
  recent_transactions: Transaction[];
  compliance_alerts: ComplianceAlert[];
}

export interface ComplianceAlert {
  id: string;
  type: 'aml_flag' | 'transaction_limit' | 'account_freeze' | 'document_expiry' | 'regulatory_update';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  account_id?: string;
  transaction_id?: string;
  action_required: boolean;
  deadline?: Date;
  created_at: Date;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
}

export interface TransactionRequest {
  type: 'transfer' | 'deposit' | 'withdrawal';
  from_account?: string;
  to_account?: string;
  amount: number;
  currency: string;
  description: string;
  reference?: string;
  metadata?: Record<string, any>;
  scheduled_date?: Date;
  approval_required?: boolean;
}

export interface AccountCreationRequest {
  name: string;
  account_type: 'trading' | 'reserve' | 'settlement' | 'strategy';
  currency: string;
  initial_balance?: number;
  risk_level: 'low' | 'medium' | 'high';
  parent_account_id?: string;
  metadata?: Record<string, any>;
}

export interface VaultDashboardData {
  total_balance: number;
  available_balance: number;
  reserved_balance: number;
  account_count: number;
  pending_transactions: number;
  compliance_score: number;
  recent_activity: Transaction[];
  account_breakdown: AccountBreakdown[];
  risk_distribution: RiskDistribution[];
}

export interface AccountBreakdown {
  account_type: string;
  count: number;
  total_balance: number;
  percentage: number;
}

export interface RiskDistribution {
  risk_level: string;
  count: number;
  total_balance: number;
  percentage: number;
}