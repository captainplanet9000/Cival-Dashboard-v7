// Agent Management Types for Google SDK Integration

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  icon: any; // Lucide React icon component
  capabilities: string[];
  sdkIntegrations: string[];
  memorySize: string;
  computeRequirements: 'Low' | 'Medium' | 'High';
}

export interface SharedMemory {
  totalContexts: number;
  sharedWith: string[];
  lastSync: string;
}

export interface AgentPerformance {
  successRate: number;
  averageResponseTime: string;
  errorRate: number;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'pending' | 'error';
  uptime: string;
  memoryUsage: string;
  cpuUsage: number;
  messagesProcessed: number;
  lastActivity: string;
  connectedAgents: string[];
  googleSdkModules: string[];
  sharedMemory: SharedMemory;
  performance: AgentPerformance;
  template?: AgentTemplate;
}

export interface AgentCommunication {
  id: number;
  timestamp: string;
  from: string;
  to: string;
  type: string;
  message: string;
  response?: string;
  status: 'pending' | 'completed' | 'failed' | 'broadcasting';
  memoryShared: boolean;
  contextId?: string;
}

export interface AgentHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  uptime: string;
  memoryUsage: number;
  cpuUsage: number;
  messagesProcessed: number;
  lastActivity: Date;
  errors: string[];
}

export interface GoogleSDKStatus {
  vertexAI: 'Connected' | 'Disconnected';
  pubSub: 'Active' | 'Inactive';
  cloudFunctions: 'Deployed' | 'Not Deployed';
  firestore: 'Synced' | 'Not Synced';
  lastCheck: string;
}

export interface AgentMemoryContext {
  contextId: string;
  data: any;
  timestamp: string;
  sharedBy: string;
  accessibleTo: string[];
  tags: string[];
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  agents: string[];
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  completedAt?: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  action: string;
  parameters: Record<string, any>;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: string;
}

export interface AgentCapability {
  name: string;
  description: string;
  category: 'intelligence' | 'communication' | 'analysis' | 'execution' | 'monitoring';
  requirements: {
    memory: string;
    cpu: string;
    sdkModules: string[];
  };
}

export interface AgentConfiguration {
  agentId: string;
  settings: {
    maxMemoryUsage: string;
    maxCpuUsage: number;
    messageQueueSize: number;
    retryAttempts: number;
    timeoutDuration: number;
  };
  permissions: {
    canAccessSharedMemory: boolean;
    canCommunicateWith: string[];
    allowedFunctions: string[];
    restrictedOperations: string[];
  };
  monitoring: {
    enableHealthChecks: boolean;
    healthCheckInterval: number;
    alertThresholds: {
      memoryUsage: number;
      cpuUsage: number;
      errorRate: number;
      responseTime: number;
    };
  };
}

export interface AgentMetrics {
  agentId: string;
  timestamp: string;
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    messagesPerSecond: number;
    responseTime: number;
    errorRate: number;
    successRate: number;
  };
  google_sdk: {
    vertexAIRequests: number;
    pubSubMessages: number;
    cloudFunctionCalls: number;
    firestoreOperations: number;
  };
}

export interface AgentAlert {
  id: string;
  agentId: string;
  type: 'performance' | 'error' | 'health' | 'security' | 'resource';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  actions: string[];
}

// Agent-to-Agent Communication Protocol
export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  messageType: 'request' | 'response' | 'notification' | 'sync';
  content: {
    action: string;
    payload: any;
    context?: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
  metadata: {
    timestamp: string;
    correlationId?: string;
    replyTo?: string;
    ttl?: number;
  };
  delivery: {
    status: 'pending' | 'sent' | 'delivered' | 'processed' | 'failed';
    attempts: number;
    lastAttempt?: string;
    error?: string;
  };
}

export interface AgentCoordination {
  coordinatorId: string;
  participants: string[];
  task: {
    id: string;
    name: string;
    description: string;
    requirements: AgentCapability[];
  };
  assignments: {
    agentId: string;
    role: string;
    responsibilities: string[];
    dependencies: string[];
  }[];
  communication: {
    protocol: 'broadcast' | 'mesh' | 'hub-spoke';
    messageFormat: 'json' | 'protobuf' | 'custom';
    encryption: boolean;
  };
  synchronization: {
    sharedState: Record<string, any>;
    checkpoints: string[];
    lastSync: string;
  };
}

// Google Cloud Integration Types
export interface VertexAIDeployment {
  agentId: string;
  modelName: string;
  endpointId: string;
  version: string;
  status: 'deploying' | 'deployed' | 'failed' | 'updating';
  resourcePool: {
    machineType: string;
    replicaCount: number;
    acceleratorType?: string;
    acceleratorCount?: number;
  };
  monitoring: {
    predictionsPerSecond: number;
    latency: number;
    errorRate: number;
  };
}

export interface PubSubConfiguration {
  agentId: string;
  topics: {
    incoming: string;
    outgoing: string;
    broadcast: string;
  };
  subscriptions: {
    name: string;
    filter?: string;
    deadLetterTopic?: string;
  }[];
  messageRetention: string;
  acknowledgeDeadline: number;
}

export interface CloudFunctionDeployment {
  agentId: string;
  functions: {
    name: string;
    runtime: string;
    trigger: 'http' | 'pubsub' | 'storage' | 'firestore';
    memoryMB: number;
    timeoutSeconds: number;
    environmentVariables: Record<string, string>;
    url?: string;
  }[];
  status: 'deploying' | 'deployed' | 'failed';
}

export interface FirestoreSchema {
  agentId: string;
  collections: {
    name: string;
    documents: {
      id: string;
      fields: Record<string, any>;
    }[];
    indexes: {
      fieldPath: string;
      order: 'asc' | 'desc';
    }[];
  }[];
  rules: string;
}

// Export utility types
export type AgentStatus = Agent['status'];
export type CommunicationStatus = AgentCommunication['status'];
export type WorkflowStatus = AgentWorkflow['status'];
export type MessageType = AgentMessage['messageType'];
export type AlertSeverity = AgentAlert['severity']; 