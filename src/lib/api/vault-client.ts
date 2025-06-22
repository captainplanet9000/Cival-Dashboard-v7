import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  VaultAccount,
  VaultIntegration,
  VaultDashboardData,
  Transaction,
  TransactionRequest,
  AccountCreationRequest,
  FundingWorkflow,
  ComplianceAlert
} from '../types/vault';
import type { ApiResponse, ApiError, PaginatedResponse, FilterOptions } from '../types/common';

class VaultBankingClient {
  private client: AxiosInstance;
  private baseURL: string;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  constructor(baseURL: string = 'https://api.vault.banking') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add API key and authentication
        const apiKey = process.env.NEXT_PUBLIC_VAULT_API_KEY || localStorage.getItem('vault-api-key');
        const authToken = localStorage.getItem('vault-auth-token');
        
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
        
        if (authToken) {
          config.headers.Authorization = `Bearer ${authToken}`;
        }

        // Add idempotency key for POST/PUT requests
        if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
          config.headers['Idempotency-Key'] = this.generateIdempotencyKey();
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => response,
      (error) => {
        const apiError: ApiError = {
          code: error.response?.data?.error?.code || error.response?.status?.toString() || 'NETWORK_ERROR',
          message: error.response?.data?.error?.message || error.message || 'Network error occurred',
          details: error.response?.data?.error?.details || {},
        };

        // Handle specific Vault Banking error codes
        if (error.response?.status === 429) {
          apiError.message = 'Rate limit exceeded. Please try again later.';
        } else if (error.response?.status === 403) {
          apiError.message = 'Insufficient permissions or compliance restrictions.';
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  private generateIdempotencyKey(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Account Management
  async getAccounts(): Promise<VaultAccount[]> {
    const response = await this.client.get<ApiResponse<VaultAccount[]>>('/accounts');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async getAccount(accountId: string): Promise<VaultAccount> {
    const response = await this.client.get<ApiResponse<VaultAccount>>(`/accounts/${accountId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async createAccount(request: AccountCreationRequest): Promise<VaultAccount> {
    const response = await this.client.post<ApiResponse<VaultAccount>>('/accounts', request);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async updateAccount(accountId: string, updates: Partial<VaultAccount>): Promise<VaultAccount> {
    const response = await this.client.patch<ApiResponse<VaultAccount>>(`/accounts/${accountId}`, updates);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async freezeAccount(accountId: string, reason: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/accounts/${accountId}/freeze`, {
      reason
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async unfreezeAccount(accountId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/accounts/${accountId}/unfreeze`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Transaction Management
  async getTransactions(filters?: FilterOptions): Promise<PaginatedResponse<Transaction>> {
    const params = new URLSearchParams();
    
    if (filters?.date_range) {
      params.append('start_date', filters.date_range.start.toISOString());
      params.append('end_date', filters.date_range.end.toISOString());
    }
    
    if (filters?.status?.length) {
      filters.status.forEach(status => params.append('status', status));
    }
    
    if (filters?.amount_range) {
      params.append('min_amount', filters.amount_range.min.toString());
      params.append('max_amount', filters.amount_range.max.toString());
    }

    const response = await this.client.get<ApiResponse<PaginatedResponse<Transaction>>>(
      `/transactions?${params.toString()}`
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const response = await this.client.get<ApiResponse<Transaction>>(`/transactions/${transactionId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async createTransaction(request: TransactionRequest): Promise<Transaction> {
    const response = await this.client.post<ApiResponse<Transaction>>('/transactions', request);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async cancelTransaction(transactionId: string, reason: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/transactions/${transactionId}/cancel`, {
      reason
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Transfer Operations
  async createTransfer(request: {
    from_account: string;
    to_account: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
  }): Promise<Transaction> {
    const transactionRequest: TransactionRequest = {
      type: 'transfer',
      ...request
    };
    return this.createTransaction(transactionRequest);
  }

  async createDeposit(request: {
    to_account: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
  }): Promise<Transaction> {
    const transactionRequest: TransactionRequest = {
      type: 'deposit',
      ...request
    };
    return this.createTransaction(transactionRequest);
  }

  async createWithdrawal(request: {
    from_account: string;
    amount: number;
    currency: string;
    description: string;
    reference?: string;
  }): Promise<Transaction> {
    const transactionRequest: TransactionRequest = {
      type: 'withdrawal',
      ...request
    };
    return this.createTransaction(transactionRequest);
  }

  // Funding Workflows
  async getFundingWorkflows(): Promise<FundingWorkflow[]> {
    const response = await this.client.get<ApiResponse<FundingWorkflow[]>>('/funding/workflows');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async createFundingWorkflow(workflow: Omit<FundingWorkflow, 'id' | 'created_at' | 'updated_at'>): Promise<FundingWorkflow> {
    const response = await this.client.post<ApiResponse<FundingWorkflow>>('/funding/workflows', workflow);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async approveFundingWorkflow(workflowId: string, comments?: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/funding/workflows/${workflowId}/approve`, {
      comments
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async rejectFundingWorkflow(workflowId: string, reason: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/funding/workflows/${workflowId}/reject`, {
      reason
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Compliance and Alerts
  async getComplianceAlerts(): Promise<ComplianceAlert[]> {
    const response = await this.client.get<ApiResponse<ComplianceAlert[]>>('/compliance/alerts');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async acknowledgeComplianceAlert(alertId: string, userId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/compliance/alerts/${alertId}/acknowledge`, {
      user_id: userId
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async runComplianceCheck(accountId: string): Promise<any> {
    const response = await this.client.post<ApiResponse<any>>(`/compliance/accounts/${accountId}/check`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data;
  }

  // Dashboard Data
  async getDashboardData(): Promise<VaultDashboardData> {
    const response = await this.client.get<ApiResponse<VaultDashboardData>>('/dashboard');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async getIntegrationStatus(): Promise<VaultIntegration> {
    const response = await this.client.get<ApiResponse<VaultIntegration>>('/integration/status');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  // WebSocket Connection for Real-time Updates
  connectWebSocket(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsURL = this.baseURL.replace(/^http/, 'ws') + '/ws';
    const authToken = localStorage.getItem('vault-auth-token');
    const wsUrlWithAuth = authToken ? `${wsURL}?token=${authToken}` : wsURL;
    
    this.wsConnection = new WebSocket(wsUrlWithAuth);

    this.wsConnection.onopen = () => {
      console.log('Vault Banking WebSocket connected');
      this.reconnectAttempts = 0;
      
      // Subscribe to relevant events
      this.sendWebSocketMessage({
        type: 'subscribe',
        topics: ['transactions', 'accounts', 'compliance_alerts', 'funding_workflows']
      });
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Error parsing Vault WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('Vault Banking WebSocket error:', error);
      onError?.(error);
    };

    this.wsConnection.onclose = () => {
      console.log('Vault Banking WebSocket disconnected');
      this.attemptReconnect(onMessage, onError);
    };
  }

  private attemptReconnect(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect Vault WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket(onMessage, onError);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached for Vault Banking WebSocket');
    }
  }

  disconnectWebSocket(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  sendWebSocketMessage(message: any): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    } else {
      console.warn('Vault WebSocket not connected, cannot send message');
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string }>>('/health');
      return response.data.success && response.data.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Configuration
  setAuthToken(token: string): void {
    localStorage.setItem('vault-auth-token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('vault-auth-token');
  }

  setApiKey(apiKey: string): void {
    localStorage.setItem('vault-api-key', apiKey);
  }

  clearApiKey(): void {
    localStorage.removeItem('vault-api-key');
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (!this.wsConnection) {
      return 'disconnected';
    }

    switch (this.wsConnection.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

// Create and export singleton instance
export const vaultClient = new VaultBankingClient(
  process.env.NEXT_PUBLIC_VAULT_API_URL || 'https://api.vault.banking'
);

export default VaultBankingClient; 