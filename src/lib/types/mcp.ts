export interface MCPServerStatus {
  id: string;
  name: string;
  type: 'trading-operations' | 'agent-coordination' | 'data-processing' | 'risk-management';
  status: 'running' | 'stopped' | 'error' | 'starting' | 'stopping';
  endpoint: string;
  health: MCPHealthStatus;
  availableTools: MCPTool[];
  performance: MCPPerformanceMetrics;
  lastAction?: Date;
  created_at: Date;
}

export interface MCPHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number; // seconds
  response_time: number; // milliseconds
  memory_usage: number; // MB
  cpu_usage: number; // percentage
  active_connections: number;
  last_health_check: Date;
  error_count: number;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, MCPToolParameter>;
  returns: MCPToolReturn;
  usage_count: number;
  average_execution_time: number; // milliseconds
  success_rate: number; // percentage
}

export interface MCPToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface MCPToolReturn {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  schema?: Record<string, any>;
}

export interface MCPPerformanceMetrics {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  average_response_time: number; // milliseconds
  requests_per_minute: number;
  error_rate: number; // percentage
  peak_memory_usage: number; // MB
  peak_cpu_usage: number; // percentage
}

export interface MCPAction {
  type: 'start' | 'stop' | 'restart' | 'call_tool' | 'configure';
  server_id: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  timestamp: Date;
}

export interface ToolInstance {
  id: string;
  server_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  execution_time?: number; // milliseconds
  error_message?: string;
}

export interface AgentCoordinationState {
  active_agents: number;
  queued_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  average_task_time: number; // milliseconds
  resource_utilization: {
    cpu: number; // percentage
    memory: number; // percentage
    network: number; // percentage
  };
  performance: Record<string, number>;
  scaling_status: 'stable' | 'scaling_up' | 'scaling_down';
}

export interface WorkflowState {
  active_workflows: WorkflowInstance[];
  scheduled_tasks: ScheduledTask[];
  workflow_templates: WorkflowTemplate[];
}

export interface WorkflowInstance {
  id: string;
  template_id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number; // percentage
  started_at: Date;
  estimated_completion?: Date;
  steps: WorkflowStep[];
  context: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool_call' | 'condition' | 'loop' | 'parallel';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  server_id?: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  result?: any;
  execution_time?: number;
  error_message?: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  workflow_template_id: string;
  schedule: string; // cron expression
  next_run: Date;
  last_run?: Date;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStepTemplate[];
  parameters: Record<string, MCPToolParameter>;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowStepTemplate {
  id: string;
  name: string;
  type: 'tool_call' | 'condition' | 'loop' | 'parallel';
  server_id?: string;
  tool_name?: string;
  parameters?: Record<string, any>;
  condition?: string; // JavaScript expression
  loop_config?: {
    items: string; // JavaScript expression
    max_iterations: number;
  };
  parallel_steps?: WorkflowStepTemplate[];
}

export interface MCPToolCallRequest {
  server_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
  timeout?: number; // milliseconds
}

export interface MCPToolCallResponse {
  success: boolean;
  result?: any;
  error?: string;
  execution_time: number; // milliseconds
  server_status: 'healthy' | 'degraded' | 'unhealthy';
} 