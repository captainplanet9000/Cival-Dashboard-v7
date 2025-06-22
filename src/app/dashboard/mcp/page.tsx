'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {   Zap,  Server,  Database,  Network,  Activity,  CheckCircle2,  AlertCircle,  Clock,  ArrowRight,  RefreshCw,  Settings,  Monitor,  Cloud,  GitBranch,  Workflow,  MessageSquare,  BarChart3,  Shield,  Bot,  HardDrive,  Cpu,  Globe,  Link,  PlayCircle,  PauseCircle,  StopCircle} from 'lucide-react';

// MCP Server Infrastructure
const mcpServers = [
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
    dependencies: ['Redis', 'PostgreSQL', 'RabbitMQ']
  },
  {
    id: 'mcp-data-pipeline',
    name: 'Data Pipeline Manager',
    type: 'Data Processing',
    status: 'running',
    uptime: '12d 15h 23m',
    version: 'v1.8.2',
    endpoint: 'localhost:8001',
    connections: 18,
    throughput: '850 req/min',
    latency: '78ms',
    errorRate: 0.01,
    resources: { cpu: 45.2, memory: 82.3, disk: 56.7 },
    protocols: ['HTTP/2', 'Kafka', 'Stream Processing'],
    dependencies: ['Kafka', 'ClickHouse', 'Redis']
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
    dependencies: ['Google Pub/Sub', 'Firestore', 'Vertex AI']
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
    dependencies: ['PostgreSQL', 'Redis', 'MinIO']
  },
  {
    id: 'mcp-trading-gateway',
    name: 'Trading Gateway',
    type: 'Market Integration',
    status: 'running',
    uptime: '7d 11h 33m',
    version: 'v1.9.7',
    endpoint: 'localhost:8004',
    connections: 15,
    throughput: '420 req/min',
    latency: '125ms',
    errorRate: 0.05,
    resources: { cpu: 28.1, memory: 45.6, disk: 23.8 },
    protocols: ['FIX', 'WebSocket', 'REST'],
    dependencies: ['Market APIs', 'Price Feeds', 'Order Management']
  },
  {
    id: 'mcp-security',
    name: 'Security & Compliance',
    type: 'Security',
    status: 'running',
    uptime: '25d 2h 18m',
    version: 'v4.1.2',
    endpoint: 'localhost:8005',
    connections: 28,
    throughput: '680 req/min',
    latency: '22ms',
    errorRate: 0.00,
    resources: { cpu: 15.3, memory: 38.7, disk: 31.2 },
    protocols: ['TLS', 'OAuth2', 'JWT'],
    dependencies: ['Vault', 'Auth0', 'Compliance APIs']
  }
];

// Data Flow Connections
const dataFlows = [
  {
    id: 'flow-1',
    name: 'Market Data Ingestion',
    source: 'Trading Gateway',
    target: 'Data Pipeline',
    type: 'real-time',
    volume: '15.2K msgs/sec',
    status: 'active',
    latency: '8ms',
    protocol: 'WebSocket'
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
    protocol: 'gRPC'
  },
  {
    id: 'flow-3',
    name: 'Persistence Writes',
    source: 'Data Pipeline',
    target: 'Persistence Layer',
    type: 'batch',
    volume: '8.7K writes/min',
    status: 'active',
    latency: '45ms',
    protocol: 'PostgreSQL'
  },
  {
    id: 'flow-4',
    name: 'Security Audit',
    source: 'Core Orchestrator',
    target: 'Security & Compliance',
    type: 'audit',
    volume: '120 events/min',
    status: 'active',
    latency: '5ms',
    protocol: 'HTTP/2'
  }
];

// Active Workflows
const activeWorkflows = [
  {
    id: 'wf-001',
    name: 'High-Frequency Trading Strategy',
    status: 'running',
    progress: 87,
    agents: ['Alpha Trading Bot', 'Risk Guardian'],
    startTime: '09:30:00',
    runtime: '4h 23m',
    actions: 1247,
    pnl: '+$15,847.32'
  },
  {
    id: 'wf-002', 
    name: 'Market Research & Analysis',
    status: 'running',
    progress: 65,
    agents: ['Market Research Assistant', 'Central Coordinator'],
    startTime: '08:15:00',
    runtime: '5h 38m',
    actions: 892,
    pnl: 'N/A'
  },
  {
    id: 'wf-003',
    name: 'Risk Assessment Pipeline',
    status: 'paused',
    progress: 42,
    agents: ['Risk Guardian'],
    startTime: '10:45:00',
    runtime: '2h 8m',
    actions: 156,
    pnl: 'N/A'
  }
];

// System Metrics
const systemMetrics = {
  totalRequests: 847520,
  avgResponseTime: 42,
  errorRate: 0.012,
  uptime: 99.94,
  dataProcessed: '2.4TB',
  activeConnections: 159,
  queueDepth: 23,
  cacheHitRate: 94.8
};

export default function MCPPage() {
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle2 className="h-4 w-4 text-status-online" />;
      case 'paused': return <PauseCircle className="h-4 w-4 text-status-warning" />;
      case 'stopped': return <StopCircle className="h-4 w-4 text-status-error" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-status-online';
      case 'active': return 'text-status-online';
      case 'paused': return 'text-status-warning';
      case 'stopped': return 'text-status-error';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MCP Server Infrastructure</h1>
          <p className="text-muted-foreground">
            Monitor and manage the Model Context Protocol server infrastructure and data flows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button variant="outline">
            <Monitor className="mr-2 h-4 w-4" />
            Monitoring
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Server className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Total Requests</p>
                <p className="text-2xl font-bold">{systemMetrics.totalRequests.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold">{systemMetrics.avgResponseTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-status-online" />
              <div className="ml-2">
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-2xl font-bold">{systemMetrics.uptime}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium">Data Processed</p>
                <p className="text-2xl font-bold">{systemMetrics.dataProcessed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MCP Servers */}
      <Card>
        <CardHeader>
          <CardTitle>MCP Server Infrastructure</CardTitle>
          <CardDescription>
            Core servers providing the backbone for agent coordination and data flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mcpServers.map((server) => (
              <div key={server.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Server className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-semibold">{server.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({server.type})</span>
                    </div>
                                         {getStatusIcon(server.status)}                     <span className={`text-xs px-2 py-1 rounded ${server.status === 'running' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>                       {server.version}                     </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <PlayCircle className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <PauseCircle className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-6 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-sm font-medium">{server.uptime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Connections</p>
                    <p className="text-sm font-medium">{server.connections}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Throughput</p>
                    <p className="text-sm font-medium">{server.throughput}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Latency</p>
                    <p className="text-sm font-medium">{server.latency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Error Rate</p>
                    <p className="text-sm font-medium">{(server.errorRate * 100).toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Endpoint</p>
                    <p className="text-sm font-medium">{server.endpoint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Resource Usage:</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">CPU</span>
                        <span className="text-xs font-medium">{server.resources.cpu}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div 
                          className="bg-primary h-1 rounded-full" 
                          style={{ width: `${server.resources.cpu}%` }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Memory</span>
                        <span className="text-xs font-medium">{server.resources.memory}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full" 
                          style={{ width: `${server.resources.memory}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Protocols & Dependencies:</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {server.protocols.map((protocol, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          {protocol}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {server.dependencies.map((dep, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Flow Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow Management</CardTitle>
          <CardDescription>
            Real-time monitoring of data flows between MCP servers and external systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dataFlows.map((flow) => (
              <div key={flow.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-4">
                  <Network className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="font-medium">{flow.name}</span>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>{flow.source}</span>
                      <ArrowRight className="h-3 w-3 mx-2" />
                      <span>{flow.target}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{flow.volume}</p>
                    <p className="text-xs text-muted-foreground">{flow.latency} latency</p>
                  </div>
                                     <span className={`text-xs px-2 py-1 rounded ${flow.status === 'active' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>                     {flow.protocol}                   </span>
                  <div className={`h-2 w-2 rounded-full ${flow.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active Workflows */}
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
          <CardDescription>
            Currently running workflows orchestrated by the MCP infrastructure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeWorkflows.map((workflow) => (
              <div key={workflow.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Workflow className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-semibold">{workflow.name}</span>
                      <div className="text-sm text-muted-foreground">
                        Started: {workflow.startTime} • Runtime: {workflow.runtime}
                      </div>
                    </div>
                    {getStatusIcon(workflow.status)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{workflow.actions} actions</p>
                    {workflow.pnl !== 'N/A' && (
                      <p className="text-sm text-trading-profit">{workflow.pnl}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Progress</span>
                    <span className="text-sm font-medium">{workflow.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${workflow.progress}%` }}
                    ></div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {workflow.agents.map((agent, index) => (
                      <span key={index} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        <Bot className="inline h-3 w-3 mr-1" />
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common MCP infrastructure management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Bot className="h-6 w-6 mb-2" />
              <span>Manage Agents</span>
              <span className="text-xs text-muted-foreground">Go to Agents tab</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Database className="h-6 w-6 mb-2" />
              <span>Data Pipeline</span>
              <span className="text-xs text-muted-foreground">Configure flows</span>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col items-center justify-center">
              <Shield className="h-6 w-6 mb-2" />
              <span>Security Config</span>
              <span className="text-xs text-muted-foreground">Manage access</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 