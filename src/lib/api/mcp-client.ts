import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { 
  MCPServerStatus, 
  MCPTool, 
  MCPToolCallRequest, 
  MCPToolCallResponse,
  AgentCoordinationState,
  WorkflowState,
  WorkflowInstance,
  ToolInstance
} from '../types/mcp';
import type { ApiResponse, ApiError } from '../types/common';

class MCPClient {
  private client: AxiosInstance;
  private baseURL: string;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('mcp-auth-token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
          code: error.response?.status?.toString() || 'NETWORK_ERROR',
          message: error.response?.data?.message || error.message || 'Network error occurred',
          details: error.response?.data?.details || {},
        };
        
        if (process.env.NODE_ENV === 'development') {
          apiError.stack = error.stack;
        }
        
        return Promise.reject(apiError);
      }
    );
  }

  // Server Management
  async getServers(): Promise<MCPServerStatus[]> {
    const response = await this.client.get<ApiResponse<MCPServerStatus[]>>('/api/mcp/servers');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async getServerStatus(serverId: string): Promise<MCPServerStatus> {
    const response = await this.client.get<ApiResponse<MCPServerStatus>>(`/api/mcp/servers/${serverId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async startServer(serverId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/servers/${serverId}/start`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async stopServer(serverId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/servers/${serverId}/stop`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async restartServer(serverId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/servers/${serverId}/restart`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Tool Management
  async getAvailableTools(serverId?: string): Promise<MCPTool[]> {
    const url = serverId ? `/api/mcp/servers/${serverId}/tools` : '/api/mcp/tools';
    const response = await this.client.get<ApiResponse<MCPTool[]>>(url);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || [];
  }

  async callTool(request: MCPToolCallRequest): Promise<MCPToolCallResponse> {
    const response = await this.client.post<ApiResponse<MCPToolCallResponse>>(
      '/api/mcp/tools/call',
      request
    );
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async getToolInstance(instanceId: string): Promise<ToolInstance> {
    const response = await this.client.get<ApiResponse<ToolInstance>>(`/api/mcp/tools/instances/${instanceId}`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async cancelToolInstance(instanceId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/tools/instances/${instanceId}/cancel`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Agent Coordination
  async getAgentCoordinationState(): Promise<AgentCoordinationState> {
    const response = await this.client.get<ApiResponse<AgentCoordinationState>>('/api/mcp/agents/coordination');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async scaleAgents(targetCount: number): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>('/api/mcp/agents/scale', {
      target_count: targetCount
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // Workflow Management
  async getWorkflowState(): Promise<WorkflowState> {
    const response = await this.client.get<ApiResponse<WorkflowState>>('/api/mcp/workflows');
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async startWorkflow(templateId: string, parameters: Record<string, any>): Promise<WorkflowInstance> {
    const response = await this.client.post<ApiResponse<WorkflowInstance>>('/api/mcp/workflows/start', {
      template_id: templateId,
      parameters
    });
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data!;
  }

  async pauseWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/workflows/${workflowId}/pause`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async resumeWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/workflows/${workflowId}/resume`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  async stopWorkflow(workflowId: string): Promise<boolean> {
    const response = await this.client.post<ApiResponse<boolean>>(`/api/mcp/workflows/${workflowId}/stop`);
    if (!response.data.success) {
      throw response.data.error;
    }
    return response.data.data || false;
  }

  // WebSocket Connection for Real-time Updates
  connectWebSocket(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.wsConnection?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const wsURL = this.baseURL.replace(/^http/, 'ws') + '/ws/mcp';
    this.wsConnection = new WebSocket(wsURL);

    this.wsConnection.onopen = () => {
      console.log('MCP WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.wsConnection.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.wsConnection.onerror = (error) => {
      console.error('MCP WebSocket error:', error);
      onError?.(error);
    };

    this.wsConnection.onclose = () => {
      console.log('MCP WebSocket disconnected');
      this.attemptReconnect(onMessage, onError);
    };
  }

  private attemptReconnect(onMessage?: (message: any) => void, onError?: (error: Event) => void): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect MCP WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectWebSocket(onMessage, onError);
      }, this.reconnectInterval);
    } else {
      console.error('Max reconnection attempts reached for MCP WebSocket');
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
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get<ApiResponse<{ status: string }>>('/api/health');
      return response.data.success && response.data.data?.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Configuration
  setAuthToken(token: string): void {
    localStorage.setItem('mcp-auth-token', token);
  }

  clearAuthToken(): void {
    localStorage.removeItem('mcp-auth-token');
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
export const mcpClient = new MCPClient(
  process.env.NEXT_PUBLIC_MCP_API_URL || 'http://localhost:8000'
);

export default MCPClient; 