// MCP Server Types for Cival Dashboard
export interface MCPServerStatus {
  id: string;
  name: string;
  type: 'trading-operations' | 'agent-coordination' | 'data-processing' | 'risk-management';
  status: 'running' | 'stopped' | 'error' | 'starting';
  endpoint: string;
  version: string;
  uptime: string;
  health: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_latency: number;
  };
  metrics: {
    requests_per_minute: number;
    error_rate: number;
    average_response_time: number;
    active_connections: number;
  };
  available_tools: MCPTool[];
  last_health_check: Date;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: MCPToolParameter[];
  returns: string;
  category: 'trading' | 'analysis' | 'risk' | 'data' | 'system';
  usage_count: number;
  average_execution_time: number;
  success_rate: number;
}

export interface MCPToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  default_value?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum_values?: string[];
  };
}

export interface MCPToolCall {
  id: string;
  tool_name: string;
  server_id: string;
  parameters: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  execution_time?: number;
  called_at: Date;
  completed_at?: Date;
  caller_id?: string;
}

export interface AgentCoordinationState {
  active_agents: number;
  total_agents: number;
  queued_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  average_task_time: number;
  resource_utilization: {
    cpu_usage: number;
    memory_usage: number;
    agent_pools: AgentPoolStatus[];
  };
  communication_metrics: {
    messages_per_minute: number;
    average_latency: number;
    failed_communications: number;
  };
}

export interface AgentPoolStatus {
  pool_name: string;
  agent_type: string;
  min_agents: number;
  max_agents: number;
  current_agents: number;
  scaling_policy: 'manual' | 'auto' | 'scheduled';
  last_scaled: Date;
  performance_metrics: {
    tasks_completed: number;
    average_success_rate: number;
    average_response_time: number;
  };
}

export interface WorkflowState {
  active_workflows: WorkflowExecution[];
  scheduled_workflows: ScheduledWorkflow[];
  workflow_templates: WorkflowTemplate[];
  execution_history: WorkflowExecutionHistory[];
}

export interface WorkflowExecution {
  id: string;
  name: string;
  template_id: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step: number;
  total_steps: number;
  steps: WorkflowStep[];
  started_at: Date;
  estimated_completion?: Date;
  completed_at?: Date;
  result?: any;
  error?: string;
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'tool_call' | 'agent_task' | 'condition' | 'loop' | 'parallel';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  tool_name?: string;
  agent_id?: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  started_at?: Date;
  completed_at?: Date;
  retry_count: number;
  max_retries: number;
}

export interface ScheduledWorkflow {
  id: string;
  name: string;
  template_id: string;
  schedule: {
    type: 'cron' | 'interval' | 'once';
    expression: string;
    timezone: string;
  };
  enabled: boolean;
  next_run: Date;
  last_run?: Date;
  run_count: number;
  success_count: number;
  failure_count: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trading' | 'analysis' | 'risk' | 'maintenance' | 'reporting';
  version: string;
  steps: WorkflowStep[];
  default_parameters: Record<string, any>;
  required_permissions: string[];
  estimated_duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowExecutionHistory {
  execution_id: string;
  workflow_name: string;
  status: 'completed' | 'failed' | 'cancelled';
  duration: number;
  steps_completed: number;
  total_steps: number;
  success_rate: number;
  executed_at: Date;
  triggered_by: 'manual' | 'scheduled' | 'event';
}

export interface MCPAction {
  type: 'start' | 'stop' | 'restart' | 'pause' | 'resume' | 'configure';
  server_id?: string;
  workflow_id?: string;
  parameters?: Record<string, any>;
}

export interface MCPEvent {
  id: string;
  type: 'server_status_change' | 'tool_call_completed' | 'workflow_state_change' | 'agent_communication' | 'system_alert';
  server_id?: string;
  workflow_id?: string;
  agent_id?: string;
  data: Record<string, any>;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ToolInstance {
  id: string;
  server_id: string;
  tool_name: string;
  parameters: Record<string, any>;
  result?: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp: Date;
  execution_time?: number;
  error?: string;
} 