'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {   Bot,  Plus,  Settings,  MessageSquare,  Brain,  Network,  Cloud,  Zap,  Users,  Database,  Activity,  CheckCircle2,  AlertCircle,  Clock,  Trash2,  Edit,  Copy,  Play,  Pause,  RotateCcw,  Shield,  Code,  Globe,  Cpu,  HardDrive} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Agent types and configurations
const agentTemplates = [
  {
    id: 'trading-agent',
    name: 'Trading Agent',
    description: 'AI agent for executing trading strategies and market analysis',
    icon: Activity,
    capabilities: ['Market Analysis', 'Order Execution', 'Risk Management', 'Technical Analysis'],
    sdkIntegrations: ['Google Vertex AI', 'Google Cloud Functions', 'Firebase'],
    memorySize: '2GB',
    computeRequirements: 'Medium'
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'AI agent for market research, news analysis, and sentiment tracking',
    icon: Brain,
    capabilities: ['News Analysis', 'Sentiment Analysis', 'Market Research', 'Data Mining'],
    sdkIntegrations: ['Google Search API', 'Google NLP', 'Google News API'],
    memorySize: '4GB',
    computeRequirements: 'High'
  },
  {
    id: 'risk-agent',
    name: 'Risk Management Agent',
    description: 'AI agent focused on portfolio risk assessment and compliance',
    icon: Shield,
    capabilities: ['Risk Assessment', 'Compliance Check', 'Alert Generation', 'Portfolio Analysis'],
    sdkIntegrations: ['Google Vertex AI', 'Google Monitoring', 'Google Security'],
    memorySize: '1GB',
    computeRequirements: 'Low'
  },
  {
    id: 'coordinator-agent',
    name: 'Agent Coordinator',
    description: 'Meta-agent that coordinates communication between other agents',
    icon: Network,
    capabilities: ['Agent Communication', 'Workflow Orchestration', 'Task Distribution', 'Memory Sharing'],
    sdkIntegrations: ['Google Pub/Sub', 'Google Workflow', 'Google Cloud Messaging'],
    memorySize: '3GB',
    computeRequirements: 'Medium'
  }
];

// Existing agents
const existingAgents = [
  {
    id: 'agent-001',
    name: 'Alpha Trading Bot',
    type: 'Trading Agent',
    status: 'running',
    uptime: '72h 15m',
    memoryUsage: '1.2GB / 2GB',
    cpuUsage: 15.4,
    messagesProcessed: 2847,
    lastActivity: '2 minutes ago',
    connectedAgents: ['agent-003', 'agent-004'],
    googleSdkModules: ['Vertex AI', 'Cloud Functions', 'Firestore'],
    sharedMemory: {
      totalContexts: 156,
      sharedWith: ['agent-003'],
      lastSync: '5 minutes ago'
    },
    performance: {
      successRate: 94.2,
      averageResponseTime: '0.8s',
      errorRate: 0.3
    }
  },
  {
    id: 'agent-002',
    name: 'Market Research Assistant',
    type: 'Research Agent',
    status: 'running',
    uptime: '156h 42m',
    memoryUsage: '3.1GB / 4GB',
    cpuUsage: 22.8,
    messagesProcessed: 5691,
    lastActivity: '30 seconds ago',
    connectedAgents: ['agent-001', 'agent-004'],
    googleSdkModules: ['Search API', 'NLP API', 'News API'],
    sharedMemory: {
      totalContexts: 289,
      sharedWith: ['agent-001', 'agent-004'],
      lastSync: '1 minute ago'
    },
    performance: {
      successRate: 89.7,
      averageResponseTime: '1.2s',
      errorRate: 0.8
    }
  },
  {
    id: 'agent-003',
    name: 'Risk Guardian',
    type: 'Risk Management Agent',
    status: 'running',
    uptime: '89h 27m',
    memoryUsage: '0.8GB / 1GB',
    cpuUsage: 8.3,
    messagesProcessed: 1534,
    lastActivity: '1 minute ago',
    connectedAgents: ['agent-001', 'agent-004'],
    googleSdkModules: ['Vertex AI', 'Monitoring', 'Security API'],
    sharedMemory: {
      totalContexts: 78,
      sharedWith: ['agent-001', 'agent-004'],
      lastSync: '3 minutes ago'
    },
    performance: {
      successRate: 98.1,
      averageResponseTime: '0.4s',
      errorRate: 0.1
    }
  },
  {
    id: 'agent-004',
    name: 'Central Coordinator',
    type: 'Agent Coordinator',
    status: 'running',
    uptime: '201h 18m',
    memoryUsage: '2.1GB / 3GB',
    cpuUsage: 12.7,
    messagesProcessed: 8923,
    lastActivity: '15 seconds ago',
    connectedAgents: ['agent-001', 'agent-002', 'agent-003'],
    googleSdkModules: ['Pub/Sub', 'Workflow', 'Cloud Messaging'],
    sharedMemory: {
      totalContexts: 445,
      sharedWith: ['agent-001', 'agent-002', 'agent-003'],
      lastSync: 'Real-time'
    },
    performance: {
      successRate: 96.8,
      averageResponseTime: '0.6s',
      errorRate: 0.2
    }
  }
];

// Agent-to-agent communications
const agentCommunications = [
  {
    id: 1,
    timestamp: '14:23:45',
    from: 'Alpha Trading Bot',
    to: 'Risk Guardian',
    type: 'risk-check',
    message: 'Request risk assessment for TSLA position increase (+$50K)',
    response: 'APPROVED - Within risk parameters (VaR impact: +2.3%)',
    status: 'completed',
    memoryShared: true,
    contextId: 'ctx-789'
  },
  {
    id: 2,
    timestamp: '14:22:12',
    from: 'Market Research Assistant',
    to: 'Central Coordinator',
    type: 'market-update',
    message: 'Fed announcement detected: Interest rate decision at 2PM EST',
    response: 'Broadcasting to all trading agents with volatility warning',
    status: 'broadcasting',
    memoryShared: true,
    contextId: 'ctx-788'
  },
  {
    id: 3,
    timestamp: '14:20:38',
    from: 'Central Coordinator',
    to: 'Alpha Trading Bot',
    type: 'memory-sync',
    message: 'Shared memory context updated: Market sentiment analysis',
    response: 'Context received and integrated',
    status: 'completed',
    memoryShared: true,
    contextId: 'ctx-787'
  }
];

export default function AgentsPage() {
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [agentName, setAgentName] = useState('');

  const handleCreateAgent = () => {
    if (!selectedTemplate || !agentName) {
      toast.error('Please select a template and enter an agent name');
      return;
    }

    toast.success(`Creating agent: ${agentName}`);
    setShowCreateAgent(false);
    setSelectedTemplate('');
    setAgentName('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-status-online';
      case 'stopped': return 'text-status-error';
      case 'pending': return 'text-status-warning';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle2 className="h-4 w-4 text-status-online" />;
      case 'stopped': return <AlertCircle className="h-4 w-4 text-status-error" />;
      case 'pending': return <Clock className="h-4 w-4 text-status-warning" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and coordinate AI agents with Google SDK integration
          </p>
        </div>
        <div className="flex items-center gap-2">
                    <Button variant="outline">            <Cloud className="mr-2 h-4 w-4" />            Google Console          </Button>          <Button variant="outline">            <Database className="mr-2 h-4 w-4" />            Shared Memory          </Button>
          <Button onClick={() => setShowCreateAgent(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Google SDK Integration Status */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50">
                <CardHeader>          <div className="flex items-center gap-2">            <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />            <CardTitle className="text-lg text-blue-900 dark:text-blue-100">              Google Cloud SDK Integration            </CardTitle>          </div>        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Vertex AI</div>
              <div className="text-blue-700 dark:text-blue-300">✅ Connected</div>
            </div>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Pub/Sub</div>
              <div className="text-blue-700 dark:text-blue-300">✅ Active</div>
            </div>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Cloud Functions</div>
              <div className="text-blue-700 dark:text-blue-300">✅ Deployed</div>
            </div>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">Firestore</div>
              <div className="text-blue-700 dark:text-blue-300">✅ Synced</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Creation Modal */}
      {showCreateAgent && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50">
          <CardHeader>
            <CardTitle className="text-green-900 dark:text-green-100">Create New Agent</CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Choose a template and configure your AI agent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Agent Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Enter agent name..."
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Agent Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select an agent template" />
                </SelectTrigger>
                <SelectContent>
                  {agentTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="p-4 bg-muted/50 rounded-lg">
                {(() => {
                  const template = agentTemplates.find(t => t.id === selectedTemplate);
                  if (!template) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <template.icon className="h-5 w-5" />
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Memory:</span> {template.memorySize}
                        </div>
                        <div>
                          <span className="font-medium">Compute:</span> {template.computeRequirements}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Google SDK Integrations:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.sdkIntegrations.map((sdk, index) => (
                            <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {sdk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreateAgent} className="flex-1">
                <Bot className="mr-2 h-4 w-4" />
                Create Agent
              </Button>
              <Button variant="outline" onClick={() => setShowCreateAgent(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Active Agents</CardTitle>
          <CardDescription>
            Manage your AI agents and monitor their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {existingAgents.map((agent) => (
              <div key={agent.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Bot className="h-5 w-5 text-primary" />
                    <div>
                      <span className="font-semibold">{agent.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">({agent.type})</span>
                    </div>
                    {getStatusIcon(agent.status)}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Pause className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-sm font-medium">{agent.uptime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Memory Usage</p>
                    <p className="text-sm font-medium">{agent.memoryUsage}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CPU Usage</p>
                    <p className="text-sm font-medium">{agent.cpuUsage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Messages Processed</p>
                    <p className="text-sm font-medium">{agent.messagesProcessed.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Google SDK Modules:</p>
                    <div className="flex flex-wrap gap-1">
                                             {agent.googleSdkModules.map((module, index) => (                         <span key={index} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">                           <Cloud className="inline h-3 w-3 mr-1" />                           {module}                         </span>                       ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Connected Agents:</p>
                    <div className="flex flex-wrap gap-1">
                      {agent.connectedAgents.map((connectedId, index) => {
                        const connectedAgent = existingAgents.find(a => a.id === connectedId);
                        return (
                          <span key={index} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                            <Network className="inline h-3 w-3 mr-1" />
                            {connectedAgent?.name || connectedId}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded">
                    <div>
                      <p className="text-xs text-muted-foreground">Shared Memory</p>
                      <p className="text-sm font-medium">{agent.sharedMemory.totalContexts} contexts</p>
                      <p className="text-xs text-muted-foreground">Last sync: {agent.sharedMemory.lastSync}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Performance</p>
                      <p className="text-sm font-medium">{agent.performance.successRate}% success</p>
                      <p className="text-xs text-muted-foreground">Avg response: {agent.performance.averageResponseTime}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Agent-to-Agent Communications */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Communications</CardTitle>
          <CardDescription>
            Real-time agent-to-agent communication and memory sharing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {agentCommunications.map((comm) => (
              <div key={comm.id} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">{comm.from}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-sm font-medium">{comm.to}</span>
                                         {comm.memoryShared && (                       <Database className="h-4 w-4 text-purple-500" />                     )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-muted rounded">{comm.type}</span>
                    <span className="text-xs text-muted-foreground">{comm.timestamp}</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Message:</span>
                    <p className="text-muted-foreground">{comm.message}</p>
                  </div>
                  {comm.response && (
                    <div>
                      <span className="font-medium">Response:</span>
                      <p className="text-muted-foreground">{comm.response}</p>
                    </div>
                  )}
                                     {comm.contextId && (                     <div className="text-xs text-purple-600">                       <Database className="inline h-3 w-3 mr-1" />                       Shared Context: {comm.contextId}                     </div>                   )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}