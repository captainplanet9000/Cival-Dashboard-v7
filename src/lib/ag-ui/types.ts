/**
 * AG UI Protocol Types for Trading Dashboard
 * Implements the open, lightweight, event-based protocol for AI agent-human interaction
 */

// Core AG UI Event Types
export interface AGUIBaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  source: 'agent' | 'human' | 'system';
  metadata?: Record<string, any>;
}

// Standard AG UI Event Types for Trading
export interface AGUITextEvent extends AGUIBaseEvent {
  type: 'text';
  content: string;
  role: 'assistant' | 'user' | 'system';
}

export interface AGUIThinkingEvent extends AGUIBaseEvent {
  type: 'thinking';
  content: string;
  visible: boolean;
}

export interface AGUIToolCallEvent extends AGUIBaseEvent {
  type: 'tool_call';
  tool_name: string;
  arguments: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

export interface AGUIStateEvent extends AGUIBaseEvent {
  type: 'state';
  key: string;
  value: any;
  action: 'set' | 'update' | 'delete';
}

export interface AGUIContextEvent extends AGUIBaseEvent {
  type: 'context';
  context: {
    market_data?: any;
    portfolio?: any;
    agent_status?: any;
    trading_session?: any;
  };
}

export interface AGUIGenerativeUIEvent extends AGUIBaseEvent {
  type: 'generative_ui';
  component_type: 'chart' | 'table' | 'card' | 'form' | 'alert';
  props: Record<string, any>;
  delta?: boolean;
}

export interface AGUIErrorEvent extends AGUIBaseEvent {
  type: 'error';
  error: string;
  code?: string;
  recoverable: boolean;
}

export interface AGUIConfirmationEvent extends AGUIBaseEvent {
  type: 'confirmation';
  message: string;
  options: Array<{
    id: string;
    label: string;
    value: any;
    style?: 'primary' | 'secondary' | 'danger';
  }>;
  timeout?: number;
}

export interface AGUIUserActionEvent extends AGUIBaseEvent {
  type: 'user_action';
  action: string;
  value: any;
  original_event_id?: string;
  data?: Record<string, any>;
}

export interface AGUIProgressEvent extends AGUIBaseEvent {
  type: 'progress';
  current: number;
  total: number;
  message?: string;
  stage?: string;
}

export interface AGUIStreamEvent extends AGUIBaseEvent {
  type: 'stream';
  content: string;
  delta: boolean;
  complete: boolean;
}

// Trading-Specific Event Types
export interface AGUITradingSignalEvent extends AGUIBaseEvent {
  type: 'trading_signal';
  signal: {
    symbol: string;
    action: 'buy' | 'sell' | 'hold';
    confidence: number;
    price: number;
    quantity?: number;
    reasoning: string[];
    risk_level: 'low' | 'medium' | 'high';
  };
}

export interface AGUIMarketAnalysisEvent extends AGUIBaseEvent {
  type: 'market_analysis';
  analysis: {
    symbol: string;
    timeframe: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    key_levels: {
      support: number[];
      resistance: number[];
    };
    indicators: Record<string, number>;
    summary: string;
  };
}

export interface AGUIRiskAssessmentEvent extends AGUIBaseEvent {
  type: 'risk_assessment';
  assessment: {
    overall_risk: number; // 1-10 scale
    position_risk: number;
    portfolio_risk: number;
    recommendations: string[];
    limits: {
      max_position_size: number;
      stop_loss: number;
      take_profit: number;
    };
  };
}

// Phase 8: Knowledge Management Events
export interface AGUIKnowledgeAccessEvent extends AGUIBaseEvent {
  type: 'knowledge_access';
  action: 'search' | 'access' | 'recommend' | 'learn';
  resource?: {
    id: string;
    title: string;
    type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
    summary?: string;
    relevance_score?: number;
  };
  query?: string;
  results_count?: number;
  agent_id: string;
}

export interface AGUIGoalManagementEvent extends AGUIBaseEvent {
  type: 'goal_management';
  action: 'create' | 'update' | 'complete' | 'analyze' | 'recommend';
  goal?: {
    id: string;
    name: string;
    type: string;
    progress: number;
    target_value: number;
    current_value: number;
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  };
  natural_language_input?: string;
  ai_analysis?: {
    confidence_score: number;
    feasibility: string;
    success_criteria: string[];
    risk_factors: string[];
  };
  agent_id: string;
}

export interface AGUILearningProgressEvent extends AGUIBaseEvent {
  type: 'learning_progress';
  agent_id: string;
  skill_area: string;
  progress: {
    current_level: 'beginner' | 'intermediate' | 'advanced';
    completion_percentage: number;
    resources_completed: number;
    time_spent_minutes: number;
  };
  recommendations: Array<{
    resource_id: string;
    title: string;
    reason: string;
    estimated_time: number;
  }>;
}

export interface AGUIKnowledgeRecommendationEvent extends AGUIBaseEvent {
  type: 'knowledge_recommendation';
  agent_id: string;
  recommendation_type: 'skill_gap' | 'performance_improvement' | 'goal_related' | 'trending';
  recommendations: Array<{
    resource_id: string;
    title: string;
    reason: string;
    confidence: number;
    estimated_impact: string;
  }>;
  context?: {
    current_goal?: string;
    performance_issues?: string[];
    skill_gaps?: string[];
  };
}

export interface AGUIResourceUploadEvent extends AGUIBaseEvent {
  type: 'resource_upload';
  action: 'upload_started' | 'upload_completed' | 'upload_failed' | 'processing_started' | 'processing_completed';
  resource: {
    id: string;
    title: string;
    type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
    size: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
  };
  progress?: number;
  error?: string;
  uploaded_by: string;
}

// Union type for all possible events
export type AGUIEvent = 
  | AGUITextEvent
  | AGUIThinkingEvent
  | AGUIToolCallEvent
  | AGUIStateEvent
  | AGUIContextEvent
  | AGUIGenerativeUIEvent
  | AGUIErrorEvent
  | AGUIConfirmationEvent
  | AGUIUserActionEvent
  | AGUIProgressEvent
  | AGUIStreamEvent
  | AGUITradingSignalEvent
  | AGUIMarketAnalysisEvent
  | AGUIRiskAssessmentEvent
  | AGUIKnowledgeAccessEvent
  | AGUIGoalManagementEvent
  | AGUILearningProgressEvent
  | AGUIKnowledgeRecommendationEvent
  | AGUIResourceUploadEvent;

// AG UI Client Configuration
export interface AGUIClientConfig {
  endpoint: string;
  transport: 'sse' | 'websocket';
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  headers?: Record<string, string>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// AG UI Agent Interface
export interface AGUIAgent {
  id: string;
  name: string;
  type: 'trading' | 'analysis' | 'risk' | 'execution' | 'research';
  status: 'online' | 'offline' | 'busy' | 'error';
  capabilities: string[];
  lastActivity: Date;
}

// AG UI Session State
export interface AGUISession {
  id: string;
  agents: AGUIAgent[];
  events: AGUIEvent[];
  state: Record<string, any>;
  context: Record<string, any>;
  startTime: Date;
  lastActivity: Date;
}