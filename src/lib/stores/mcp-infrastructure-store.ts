import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Agent, AgentCommunication, AgentWorkflow } from '@/types/agent';

// MCP Infrastructure Types
export interface MCPServer {
  id: string;
  name: string;
  type: 'Core Infrastructure' | 'Data Processing' | 'Agent Management' | 'Data Storage' | 'Market Integration' | 'Security';
  status: 'running' | 'stopped' | 'pending' | 'error';
  uptime: string;
  version: string;
  endpoint: string;
  connections: number;
  throughput: string;
  latency: string;
  errorRate: number;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  protocols: string[];
  dependencies: string[];
  lastHealthCheck: string;
  configuration: Record<string, any>;
}

export interface DataFlow {
  id: string;
  name: string;
  source: string;
  target: string;
  type: 'real-time' | 'command' | 'batch' | 'audit' | 'sync';
  volume: string;
  status: 'active' | 'paused' | 'error';
  latency: string;
  protocol: string;
  lastActivity: string;
  metrics: {
    bytesTransferred: number;
    messagesProcessed: number;
    errorsCount: number;
    avgLatency: number;
  };
}

export interface SystemMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
  dataProcessed: string;
  activeConnections: number;
  queueDepth: number;
  cacheHitRate: number;
  lastUpdated: string;
}

export interface WorkflowExecution {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  agents: string[];
  startTime: string;
  runtime: string;
  actions: number;
  pnl?: string;
  stepDetails: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
    stepStatus: 'pending' | 'running' | 'completed' | 'failed';
  };
  metadata: {
    strategy?: string;
    riskLevel?: string;
    allocatedCapital?: number;
  };
}

export interface MCPInfrastructureState {
  // Server Management
  servers: MCPServer[];
  selectedServer: string | null;
  
  // Data Flow Management
  dataFlows: DataFlow[];
  flowMetrics: Record<string, any>;
  
  // System Monitoring
  systemMetrics: SystemMetrics;
  alertThresholds: {
    cpuThreshold: number;
    memoryThreshold: number;
    errorRateThreshold: number;
    latencyThreshold: number;
  };
  
  // Workflow Orchestration
  activeWorkflows: WorkflowExecution[];
  workflowTemplates: Record<string, any>;
  
  // Agent Coordination (bridge with agents store)
  agentRegistrations: Record<string, Agent>;
  agentCommunications: AgentCommunication[];
  communicationQueues: Record<string, AgentCommunication[]>;
  
  // Configuration & Settings
  configuration: {
    autoScaling: boolean;
    loadBalancing: boolean;
    failoverEnabled: boolean;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
  };
  
  // Persistence Management
  persistenceSettings: {
    retentionPeriod: number; // days
    compressionEnabled: boolean;
    backupFrequency: 'hourly' | 'daily' | 'weekly';
    encryptionEnabled: boolean;
  };
  
  // Actions
  actions: {
    // Server Management
    updateServerStatus: (serverId: string, status: MCPServer['status']) => void;
    updateServerMetrics: (serverId: string, metrics: Partial<MCPServer['resources']>) => void;
    addServer: (server: MCPServer) => void;
    removeServer: (serverId: string) => void;
    restartServer: (serverId: string) => Promise<void>;
    setSelectedServer: (serverId: string | null) => void;
    
    // Data Flow Management
    updateDataFlow: (flowId: string, updates: Partial<DataFlow>) => void;
    addDataFlow: (flow: DataFlow) => void;
    pauseDataFlow: (flowId: string) => void;
    resumeDataFlow: (flowId: string) => void;
    deleteDataFlow: (flowId: string) => void;
    
    // System Monitoring
    updateSystemMetrics: (metrics: Partial<SystemMetrics>) => void;
    setAlertThresholds: (thresholds: Partial<MCPInfrastructureState['alertThresholds']>) => void;
    
    // Workflow Management
    startWorkflow: (workflow: WorkflowExecution) => void;
    pauseWorkflow: (workflowId: string) => void;
    resumeWorkflow: (workflowId: string) => void;
    stopWorkflow: (workflowId: string) => void;
    updateWorkflowProgress: (workflowId: string, progress: number, stepDetails?: Partial<WorkflowExecution['stepDetails']>) => void;
    
    // Agent Coordination
    registerAgent: (agent: Agent) => void;
    unregisterAgent: (agentId: string) => void;
    updateAgentStatus: (agentId: string, status: Agent['status']) => void;
    addCommunication: (communication: AgentCommunication) => void;
    processCommunicationQueue: (agentId: string) => void;
    
    // Configuration
    updateConfiguration: (config: Partial<MCPInfrastructureState['configuration']>) => void;
    updatePersistenceSettings: (settings: Partial<MCPInfrastructureState['persistenceSettings']>) => void;
    
    // Data Persistence
    saveToDatabase: () => Promise<void>;
    loadFromDatabase: () => Promise<void>;
    exportConfiguration: () => string;
    importConfiguration: (config: string) => void;
    
    // Health & Diagnostics
    performHealthCheck: () => Promise<Record<string, boolean>>;
    generateSystemReport: () => Promise<any>;
    optimizePerformance: () => Promise<void>;
  };
}

export const useMCPInfrastructureStore = create<MCPInfrastructureState>()(
  persist(
    (set, get) => ({
      // Initial State
      servers: [
        {
          id: 'mcp-core',
          name: 'MCP Core Orchestrator',
          type: 'Core Infrastructure',
          status: 'running',
          uptime: '15d 8h 42m',
          version: 'v2.1.4',
          endpoint: 'localhost:8000',
          connections: 24,
          throughput: '1.2K req/min',
          latency: '45ms',
          errorRate: 0.02,
          resources: { cpu: 23.4, memory: 67.8, disk: 42.1 },
          protocols: ['HTTP/2', 'WebSocket', 'gRPC'],
          dependencies: ['Redis', 'PostgreSQL', 'RabbitMQ'],
          lastHealthCheck: new Date().toISOString(),
          configuration: {}
        },
        {
          id: 'mcp-agent-coordinator',
          name: 'Agent Coordination Hub',
          type: 'Agent Management',
          status: 'running',
          uptime: '8d 22h 17m',
          version: 'v3.0.1',
          endpoint: 'localhost:8002',
          connections: 32,
          throughput: '2.1K req/min',
          latency: '35ms',
          errorRate: 0.00,
          resources: { cpu: 34.7, memory: 58.9, disk: 28.4 },
          protocols: ['WebSocket', 'Pub/Sub', 'RPC'],
          dependencies: ['Google Pub/Sub', 'Firestore', 'Vertex AI'],
          lastHealthCheck: new Date().toISOString(),
          configuration: {}
        },
        {
          id: 'mcp-persistence',
          name: 'Persistence Layer',
          type: 'Data Storage',
          status: 'running',
          uptime: '20d 4h 55m',
          version: 'v2.5.0',
          endpoint: 'localhost:8003',
          connections: 42,
          throughput: '3.4K req/min',
          latency: '12ms',
          errorRate: 0.00,
          resources: { cpu: 18.9, memory: 71.2, disk: 78.5 },
          protocols: ['PostgreSQL', 'Redis', 'S3'],
          dependencies: ['PostgreSQL', 'Redis', 'MinIO'],
          lastHealthCheck: new Date().toISOString(),
          configuration: {}
        }
      ],
      selectedServer: null,
      
      dataFlows: [
        {
          id: 'flow-1',
          name: 'Market Data Ingestion',
          source: 'Trading Gateway',
          target: 'Data Pipeline',
          type: 'real-time',
          volume: '15.2K msgs/sec',
          status: 'active',
          latency: '8ms',
          protocol: 'WebSocket',
          lastActivity: new Date().toISOString(),
          metrics: {
            bytesTransferred: 1024000,
            messagesProcessed: 15200,
            errorsCount: 2,
            avgLatency: 8
          }
        },
        {
          id: 'flow-2',
          name: 'Agent Commands',
          source: 'Agent Coordinator',
          target: 'Trading Gateway',
          type: 'command',
          volume: '240 req/min',
          status: 'active',
          latency: '15ms',
          protocol: 'gRPC',
          lastActivity: new Date().toISOString(),
          metrics: {
            bytesTransferred: 24000,
            messagesProcessed: 240,
            errorsCount: 0,
            avgLatency: 15
          }
        }
      ],
      flowMetrics: {},
      
      systemMetrics: {
        totalRequests: 847520,
        avgResponseTime: 42,
        errorRate: 0.012,
        uptime: 99.94,
        dataProcessed: '2.4TB',
        activeConnections: 159,
        queueDepth: 23,
        cacheHitRate: 94.8,
        lastUpdated: new Date().toISOString()
      },
      
      alertThresholds: {
        cpuThreshold: 80,
        memoryThreshold: 85,
        errorRateThreshold: 5,
        latencyThreshold: 1000
      },
      
      activeWorkflows: [
        {
          id: 'wf-001',
          name: 'High-Frequency Trading Strategy',
          status: 'running',
          progress: 87,
          agents: ['Alpha Trading Bot', 'Risk Guardian'],
          startTime: '09:30:00',
          runtime: '4h 23m',
          actions: 1247,
          pnl: '+$15,847.32',
          stepDetails: {
            currentStep: 8,
            totalSteps: 10,
            stepName: 'Position Optimization',
            stepStatus: 'running'
          },
          metadata: {
            strategy: 'momentum_scalping',
            riskLevel: 'medium',
            allocatedCapital: 100000
          }
        }
      ],
      workflowTemplates: {},
      
      agentRegistrations: {},
      agentCommunications: [],
      communicationQueues: {},
      
      configuration: {
        autoScaling: true,
        loadBalancing: true,
        failoverEnabled: true,
        debugMode: false,
        logLevel: 'info'
      },
      
      persistenceSettings: {
        retentionPeriod: 30,
        compressionEnabled: true,
        backupFrequency: 'daily',
        encryptionEnabled: true
      },
      
      // Actions Implementation
      actions: {
        // Server Management
        updateServerStatus: (serverId, status) => set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId ? { ...server, status } : server
          )
        })),
        
        updateServerMetrics: (serverId, metrics) => set((state) => ({
          servers: state.servers.map(server =>
            server.id === serverId 
              ? { ...server, resources: { ...server.resources, ...metrics }, lastHealthCheck: new Date().toISOString() }
              : server
          )
        })),
        
        addServer: (server) => set((state) => ({
          servers: [...state.servers, server]
        })),
        
        removeServer: (serverId) => set((state) => ({
          servers: state.servers.filter(server => server.id !== serverId)
        })),
        
        restartServer: async (serverId) => {
          const { updateServerStatus } = get().actions;
          updateServerStatus(serverId, 'pending');
          
          // Simulate restart process
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          updateServerStatus(serverId, 'running');
        },
        
        setSelectedServer: (serverId) => set({ selectedServer: serverId }),
        
        // Data Flow Management
        updateDataFlow: (flowId, updates) => set((state) => ({
          dataFlows: state.dataFlows.map(flow =>
            flow.id === flowId ? { ...flow, ...updates } : flow
          )
        })),
        
        addDataFlow: (flow) => set((state) => ({
          dataFlows: [...state.dataFlows, flow]
        })),
        
        pauseDataFlow: (flowId) => set((state) => ({
          dataFlows: state.dataFlows.map(flow =>
            flow.id === flowId ? { ...flow, status: 'paused' } : flow
          )
        })),
        
        resumeDataFlow: (flowId) => set((state) => ({
          dataFlows: state.dataFlows.map(flow =>
            flow.id === flowId ? { ...flow, status: 'active' } : flow
          )
        })),
        
        deleteDataFlow: (flowId) => set((state) => ({
          dataFlows: state.dataFlows.filter(flow => flow.id !== flowId)
        })),
        
        // System Monitoring
        updateSystemMetrics: (metrics) => set((state) => ({
          systemMetrics: { ...state.systemMetrics, ...metrics, lastUpdated: new Date().toISOString() }
        })),
        
        setAlertThresholds: (thresholds) => set((state) => ({
          alertThresholds: { ...state.alertThresholds, ...thresholds }
        })),
        
        // Workflow Management
        startWorkflow: (workflow) => set((state) => ({
          activeWorkflows: [...state.activeWorkflows, workflow]
        })),
        
        pauseWorkflow: (workflowId) => set((state) => ({
          activeWorkflows: state.activeWorkflows.map(wf =>
            wf.id === workflowId ? { ...wf, status: 'paused' } : wf
          )
        })),
        
        resumeWorkflow: (workflowId) => set((state) => ({
          activeWorkflows: state.activeWorkflows.map(wf =>
            wf.id === workflowId ? { ...wf, status: 'running' } : wf
          )
        })),
        
        stopWorkflow: (workflowId) => set((state) => ({
          activeWorkflows: state.activeWorkflows.filter(wf => wf.id !== workflowId)
        })),
        
        updateWorkflowProgress: (workflowId, progress, stepDetails) => set((state) => ({
          activeWorkflows: state.activeWorkflows.map(wf =>
            wf.id === workflowId 
              ? { 
                  ...wf, 
                  progress, 
                  stepDetails: stepDetails ? { ...wf.stepDetails, ...stepDetails } : wf.stepDetails 
                }
              : wf
          )
        })),
        
        // Agent Coordination
        registerAgent: (agent) => set((state) => ({
          agentRegistrations: { ...state.agentRegistrations, [agent.id]: agent }
        })),
        
        unregisterAgent: (agentId) => set((state) => {
          const { [agentId]: removed, ...rest } = state.agentRegistrations;
          return { agentRegistrations: rest };
        }),
        
        updateAgentStatus: (agentId, status) => set((state) => ({
          agentRegistrations: {
            ...state.agentRegistrations,
            [agentId]: state.agentRegistrations[agentId] 
              ? { ...state.agentRegistrations[agentId], status }
              : state.agentRegistrations[agentId]
          }
        })),
        
        addCommunication: (communication) => set((state) => ({
          agentCommunications: [communication, ...state.agentCommunications].slice(0, 100) // Keep last 100
        })),
        
        processCommunicationQueue: (agentId) => set((state) => {
          const queue = state.communicationQueues[agentId] || [];
          const { [agentId]: removed, ...rest } = state.communicationQueues;
          return {
            communicationQueues: rest,
            agentCommunications: [...queue, ...state.agentCommunications]
          };
        }),
        
        // Configuration
        updateConfiguration: (config) => set((state) => ({
          configuration: { ...state.configuration, ...config }
        })),
        
        updatePersistenceSettings: (settings) => set((state) => ({
          persistenceSettings: { ...state.persistenceSettings, ...settings }
        })),
        
        // Data Persistence
        saveToDatabase: async () => {
          const state = get();
          try {
            // In real implementation, save to database
            console.log('Saving MCP infrastructure state to database...', state);
            
            // Mock database save
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('MCP infrastructure state saved successfully');
          } catch (error) {
            console.error('Failed to save MCP infrastructure state:', error);
            throw error;
          }
        },
        
        loadFromDatabase: async () => {
          try {
            // In real implementation, load from database
            console.log('Loading MCP infrastructure state from database...');
            
            // Mock database load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('MCP infrastructure state loaded successfully');
          } catch (error) {
            console.error('Failed to load MCP infrastructure state:', error);
            throw error;
          }
        },
        
        exportConfiguration: () => {
          const state = get();
          return JSON.stringify({
            servers: state.servers,
            dataFlows: state.dataFlows,
            configuration: state.configuration,
            persistenceSettings: state.persistenceSettings,
            alertThresholds: state.alertThresholds
          }, null, 2);
        },
        
        importConfiguration: (config) => {
          try {
            const parsed = JSON.parse(config);
            set((state) => ({
              ...state,
              ...parsed,
              systemMetrics: { ...state.systemMetrics, lastUpdated: new Date().toISOString() }
            }));
          } catch (error) {
            console.error('Failed to import configuration:', error);
            throw error;
          }
        },
        
        // Health & Diagnostics
        performHealthCheck: async () => {
          const state = get();
          const results: Record<string, boolean> = {};
          
          // Check each server
          for (const server of state.servers) {
            try {
              // Mock health check
              await new Promise(resolve => setTimeout(resolve, 100));
              results[server.id] = server.status === 'running';
            } catch (error) {
              results[server.id] = false;
            }
          }
          
          return results;
        },
        
        generateSystemReport: async () => {
          const state = get();
          
          return {
            timestamp: new Date().toISOString(),
            overview: {
              totalServers: state.servers.length,
              runningServers: state.servers.filter(s => s.status === 'running').length,
              totalDataFlows: state.dataFlows.length,
              activeDataFlows: state.dataFlows.filter(f => f.status === 'active').length,
              activeWorkflows: state.activeWorkflows.length
            },
            systemMetrics: state.systemMetrics,
            serverDetails: state.servers.map(server => ({
              id: server.id,
              name: server.name,
              status: server.status,
              resources: server.resources,
              lastHealthCheck: server.lastHealthCheck
            })),
            dataFlowSummary: state.dataFlows.map(flow => ({
              id: flow.id,
              name: flow.name,
              status: flow.status,
              metrics: flow.metrics
            })),
            alerts: state.servers
              .filter(server => 
                server.resources.cpu > state.alertThresholds.cpuThreshold ||
                server.resources.memory > state.alertThresholds.memoryThreshold
              )
              .map(server => ({
                serverId: server.id,
                message: `High resource usage detected`,
                cpu: server.resources.cpu,
                memory: server.resources.memory
              }))
          };
        },
        
        optimizePerformance: async () => {
          const { updateConfiguration } = get().actions;
          
          // Mock performance optimization
          console.log('Starting performance optimization...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Update configuration for better performance
          updateConfiguration({
            autoScaling: true,
            loadBalancing: true
          });
          
          console.log('Performance optimization completed');
        }
      }
    }),
    {
      name: 'mcp-infrastructure-storage',
      partialize: (state) => ({
        servers: state.servers,
        dataFlows: state.dataFlows,
        systemMetrics: state.systemMetrics,
        configuration: state.configuration,
        persistenceSettings: state.persistenceSettings,
        alertThresholds: state.alertThresholds,
        agentRegistrations: state.agentRegistrations
      })
    }
  )
); 