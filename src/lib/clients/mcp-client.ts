import { MCPServerStatus, MCPTool, MCPToolCall, MCPEvent, AgentCoordinationState, WorkflowState } from '@/types/mcp';
import { APIResponse } from '@/types/common';
import redisService from '@/lib/services/redis-service';

export class MCPClient {
  private baseUrl: string;
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  // WebSocket connection management
  async connectWebSocket(): Promise<void> {
    const wsUrl = this.baseUrl.replace('http', 'ws') + '/ws';
    
    try {
      this.wsConnection = new WebSocket(wsUrl);
      
      this.wsConnection.onopen = () => {
        console.log('MCP WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected' });
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('MCP WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
        this.handleReconnection();
      };

      this.wsConnection.onerror = (error) => {
        console.error('MCP WebSocket error:', error);
        this.emit('connection', { status: 'error', error });
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'server_status':
        this.emit('server_status', data.payload);
        break;
      case 'tool_call_update':
        this.emit('tool_call_update', data.payload);
        break;
      case 'workflow_update':
        this.emit('workflow_update', data.payload);
        break;
      case 'agent_communication':
        this.emit('agent_communication', data.payload);
        break;
      case 'system_event':
        this.emit('system_event', data.payload);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      setTimeout(() => {
        console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connectWebSocket();
      }, delay);
    }
  }

  disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  // Event handling
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // API methods
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`MCP API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Server management
  async getServers(): Promise<MCPServerStatus[]> {
    const response = await this.request<MCPServerStatus[]>('/api/mcp/servers');
    return response.data || [];
  }

  async getServerStatus(serverId: string): Promise<MCPServerStatus | null> {
    try {
      const response = await this.request<MCPServerStatus>(`/api/mcp/servers/${serverId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get server status for ${serverId}:`, error);
      return null;
    }
  }

  async startServer(serverId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/servers/${serverId}/start`, { method: 'POST' });
      return true;
    } catch (error) {
      console.error(`Failed to start server ${serverId}:`, error);
      return false;
    }
  }

  async stopServer(serverId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/servers/${serverId}/stop`, { method: 'POST' });
      return true;
    } catch (error) {
      console.error(`Failed to stop server ${serverId}:`, error);
      return false;
    }
  }

  async restartServer(serverId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/servers/${serverId}/restart`, { method: 'POST' });
      return true;
    } catch (error) {
      console.error(`Failed to restart server ${serverId}:`, error);
      return false;
    }
  }

  // Tool management
  async getAvailableTools(serverId?: string): Promise<MCPTool[]> {
    const endpoint = serverId ? `/api/mcp/tools?server=${serverId}` : '/api/mcp/tools';
    const response = await this.request<MCPTool[]>(endpoint);
    return response.data || [];
  }

  async callTool(serverId: string, toolName: string, parameters: Record<string, any>): Promise<MCPToolCall> {
    const response = await this.request<MCPToolCall>('/api/mcp/tools/call', {
      method: 'POST',
      body: JSON.stringify({
        server_id: serverId,
        tool_name: toolName,
        parameters,
      }),
    });
    
    if (!response.data) {
      throw new Error('Tool call failed');
    }
    
    return response.data;
  }

  async getToolCallStatus(callId: string): Promise<MCPToolCall | null> {
    try {
      const response = await this.request<MCPToolCall>(`/api/mcp/tools/calls/${callId}`);
      return response.data || null;
    } catch (error) {
      console.error(`Failed to get tool call status for ${callId}:`, error);
      return null;
    }
  }

  async getToolCallHistory(serverId?: string, limit: number = 100): Promise<MCPToolCall[]> {
    const endpoint = serverId 
      ? `/api/mcp/tools/calls?server=${serverId}&limit=${limit}`
      : `/api/mcp/tools/calls?limit=${limit}`;
    
    const response = await this.request<MCPToolCall[]>(endpoint);
    return response.data || [];
  }

  // Agent coordination
  async getCoordinationState(): Promise<AgentCoordinationState | null> {
    try {
      const response = await this.request<AgentCoordinationState>('/api/mcp/coordination');
      return response.data || null;
    } catch (error) {
      console.error('Failed to get coordination state:', error);
      return null;
    }
  }

  async registerAgent(agentConfig: any): Promise<boolean> {
    try {
      await this.request('/api/mcp/agents/register', {
        method: 'POST',
        body: JSON.stringify(agentConfig),
      });
      return true;
    } catch (error) {
      console.error('Failed to register agent:', error);
      return false;
    }
  }

  async unregisterAgent(agentId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/agents/${agentId}/unregister`, {
        method: 'DELETE',
      });
      return true;
    } catch (error) {
      console.error(`Failed to unregister agent ${agentId}:`, error);
      return false;
    }
  }

  async sendAgentMessage(fromAgentId: string, toAgentId: string, message: any): Promise<boolean> {
    try {
      await this.request('/api/mcp/agents/message', {
        method: 'POST',
        body: JSON.stringify({
          from_agent_id: fromAgentId,
          to_agent_id: toAgentId,
          message,
        }),
      });
      return true;
    } catch (error) {
      console.error('Failed to send agent message:', error);
      return false;
    }
  }

  // Workflow management
  async getWorkflowState(): Promise<WorkflowState | null> {
    try {
      const response = await this.request<WorkflowState>('/api/mcp/workflows');
      return response.data || null;
    } catch (error) {
      console.error('Failed to get workflow state:', error);
      return null;
    }
  }

  async startWorkflow(templateId: string, parameters: Record<string, any>): Promise<string | null> {
    try {
      const response = await this.request<{ execution_id: string }>('/api/mcp/workflows/start', {
        method: 'POST',
        body: JSON.stringify({
          template_id: templateId,
          parameters,
        }),
      });
      return response.data?.execution_id || null;
    } catch (error) {
      console.error('Failed to start workflow:', error);
      return null;
    }
  }

  async pauseWorkflow(executionId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/workflows/${executionId}/pause`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error(`Failed to pause workflow ${executionId}:`, error);
      return false;
    }
  }

  async resumeWorkflow(executionId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/workflows/${executionId}/resume`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error(`Failed to resume workflow ${executionId}:`, error);
      return false;
    }
  }

  async cancelWorkflow(executionId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/workflows/${executionId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error(`Failed to cancel workflow ${executionId}:`, error);
      return false;
    }
  }

  // System events
  async getSystemEvents(limit: number = 100): Promise<MCPEvent[]> {
    const response = await this.request<MCPEvent[]>(`/api/mcp/events?limit=${limit}`);
    return response.data || [];
  }

  async acknowledgeEvent(eventId: string): Promise<boolean> {
    try {
      await this.request(`/api/mcp/events/${eventId}/acknowledge`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error(`Failed to acknowledge event ${eventId}:`, error);
      return false;
    }
  }

  // Health checks
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request('/api/mcp/health');
      return response.success;
    } catch (error) {
      console.error('MCP health check failed:', error);
      return false;
    }
  }

  // Caching helpers
  async cacheServerStatus(serverId: string, status: MCPServerStatus): Promise<void> {
    await redisService.cache(`mcp:server:${serverId}`, status, 300); // 5 minutes TTL
  }

  async getCachedServerStatus(serverId: string): Promise<MCPServerStatus | null> {
    return await redisService.getCached<MCPServerStatus>(`mcp:server:${serverId}`);
  }

  async cacheToolCall(call: MCPToolCall): Promise<void> {
    await redisService.cache(`mcp:tool_call:${call.id}`, call, 3600); // 1 hour TTL
  }

  async getCachedToolCall(callId: string): Promise<MCPToolCall | null> {
    return await redisService.getCached<MCPToolCall>(`mcp:tool_call:${callId}`);
  }
}

// Singleton instance
export const mcpClient = new MCPClient();
export default mcpClient; 