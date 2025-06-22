/**
 * MCP Server Manager Component
 * Comprehensive management interface for all MCP servers
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Server, 
  Play, 
  Pause, 
  RefreshCw, 
  Settings, 
  Monitor,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Zap,
  Network,
  Clock,
  BarChart3,
  Download,
  Upload,
  Trash2,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { mcpRegistry, MCPServerConfig, MCPServerMetrics } from '@/lib/mcp/registry';

interface MCPServerManagerProps {
  className?: string;
}

export function MCPServerManager({ className = '' }: MCPServerManagerProps) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [serverMetrics, setServerMetrics] = useState<Map<string, MCPServerMetrics>>(new Map());
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'monitoring' | 'config'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOfflineServers, setShowOfflineServers] = useState(true);

  useEffect(() => {
    loadServers();
    loadMetrics();

    const interval = autoRefresh ? setInterval(() => {
      loadServers();
      loadMetrics();
    }, 10000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadServers = () => {
    setServers(mcpRegistry.getAllServers());
  };

  const loadMetrics = async () => {
    const metrics = new Map();
    const onlineServers = mcpRegistry.getServersByStatus('online');
    
    for (const server of onlineServers) {
      try {
        const serverMetrics = await mcpRegistry.getServerMetrics(server.id);
        if (serverMetrics) {
          metrics.set(server.id, serverMetrics);
        }
      } catch (error) {
        console.error(`Failed to load metrics for ${server.id}:`, error);
      }
    }
    
    setServerMetrics(metrics);
  };

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      switch (action) {
        case 'start':
          await mcpRegistry.startServer(serverId);
          break;
        case 'stop':
          await mcpRegistry.stopServer(serverId);
          break;
        case 'restart':
          await mcpRegistry.restartServer(serverId);
          break;
      }
      loadServers();
    } catch (error) {
      console.error(`Failed to ${action} server ${serverId}:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'maintenance':
        return <Settings className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'market_data':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'trading_ops':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'intelligence':
        return <Database className="h-4 w-4 text-purple-500" />;
      case 'communication':
        return <Network className="h-4 w-4 text-orange-500" />;
      case 'devops':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Server className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const registryStats = mcpRegistry.getRegistryStats();
  const filteredServers = showOfflineServers 
    ? servers 
    : servers.filter(s => s.status !== 'offline');

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: Monitor },
          { id: 'servers', label: 'Server Management', icon: Server },
          { id: 'monitoring', label: 'Monitoring', icon: Activity },
          { id: 'config', label: 'Configuration', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Registry Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{registryStats.total}</div>
                <p className="text-xs text-muted-foreground">Registered MCP servers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Online</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{registryStats.online}</div>
                <p className="text-xs text-muted-foreground">
                  {((registryStats.online / registryStats.total) * 100).toFixed(1)}% availability
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Offline</CardTitle>
                <XCircle className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{registryStats.offline}</div>
                <p className="text-xs text-muted-foreground">Inactive servers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Errors</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{registryStats.error}</div>
                <p className="text-xs text-muted-foreground">Servers with issues</p>
              </CardContent>
            </Card>
          </div>

          {/* Server Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Server Types Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(registryStats.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(type)}
                      <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Status Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Server Status Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowOfflineServers(!showOfflineServers)}
                  >
                    {showOfflineServers ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showOfflineServers ? 'Hide Offline' : 'Show Offline'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                    Auto Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredServers.slice(0, 6).map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(server.status)}
                      {getTypeIcon(server.type)}
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {server.endpoint} • {server.capabilities.length} capabilities
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        server.status === 'online' ? 'default' :
                        server.status === 'error' ? 'destructive' : 'outline'
                      }>
                        {server.status}
                      </Badge>
                      {server.status === 'online' && (
                        <span className="text-sm text-green-600">
                          {formatUptime(server.monitoring.uptime)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Server Management Tab */}
      {activeTab === 'servers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Server Management</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Server
              </Button>
              <Button size="sm" variant="outline" onClick={loadServers}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredServers.map((server) => (
              <Card key={server.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(server.status)}
                      {getTypeIcon(server.type)}
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                    </div>
                    <Badge variant={
                      server.status === 'online' ? 'default' :
                      server.status === 'error' ? 'destructive' : 'outline'
                    }>
                      {server.status.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Endpoint:</span>
                        <div className="font-medium">{server.endpoint}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Version:</span>
                        <div className="font-medium">v{server.version}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Environment:</span>
                        <div className="font-medium capitalize">{server.environment}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <div className="font-medium">
                          {server.status === 'online' ? formatUptime(server.monitoring.uptime) : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {server.capabilities.slice(0, 3).map((capability) => (
                          <Badge key={capability} variant="outline" className="text-xs">
                            {capability.replace('_', ' ')}
                          </Badge>
                        ))}
                        {server.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{server.capabilities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {server.status === 'online' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Response Time:</span>
                          <span className="font-medium">
                            {server.monitoring.avg_response_time.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Requests:</span>
                          <span className="font-medium">
                            {server.monitoring.total_requests.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Error Rate:</span>
                          <span className="font-medium">
                            {((server.monitoring.error_rate / server.monitoring.total_requests) * 100 || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {server.status === 'offline' ? (
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleServerAction(server.id, 'start')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="flex-1"
                          onClick={() => handleServerAction(server.id, 'stop')}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Stop
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleServerAction(server.id, 'restart')}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Restart
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedServer(selectedServer === server.id ? null : server.id)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>

                    {selectedServer === server.id && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="text-sm font-medium">Server Configuration</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Auto Start:</span>
                            <span className="ml-2">{server.auto_start ? 'Yes' : 'No'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Restart Policy:</span>
                            <span className="ml-2">{server.restart_policy}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Retries:</span>
                            <span className="ml-2">{server.max_retries}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Timeout:</span>
                            <span className="ml-2">{server.timeout}ms</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            Edit Config
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1">
                            View Logs
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Server Monitoring</h3>
            <Button size="sm" variant="outline" onClick={loadMetrics}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh Metrics
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mcpRegistry.getServersByStatus('online').map((server) => {
              const metrics = serverMetrics.get(server.id);
              return (
                <Card key={server.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {getTypeIcon(server.type)}
                      {server.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">CPU Usage</div>
                            <div className="text-lg font-semibold">{metrics.cpu_usage.toFixed(1)}%</div>
                            <Progress value={metrics.cpu_usage} className="h-2 mt-1" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Memory Usage</div>
                            <div className="text-lg font-semibold">{metrics.memory_usage.toFixed(1)}%</div>
                            <Progress value={metrics.memory_usage} className="h-2 mt-1" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Active Connections</div>
                            <div className="font-semibold">{metrics.active_connections}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Queue Length</div>
                            <div className="font-semibold">{metrics.queue_length}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Response Time (P95)</div>
                            <div className="font-semibold">{metrics.response_time_p95.toFixed(0)}ms</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Requests/Hour</div>
                            <div className="font-semibold text-green-600">{metrics.requests_last_hour}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Errors/Hour</div>
                            <div className="font-semibold text-red-600">{metrics.errors_last_hour}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <div>No metrics available</div>
                        <div className="text-xs">Server may not support metrics endpoint</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Configuration Management</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-1" />
                Export Config
              </Button>
              <Button size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-1" />
                Import Config
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registry Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Health Check Interval</label>
                    <input 
                      type="number" 
                      defaultValue={30}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Seconds"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Default Timeout</label>
                    <input 
                      type="number" 
                      defaultValue={30000}
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="Milliseconds"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="auto-restart" defaultChecked />
                  <label htmlFor="auto-restart" className="text-sm">Enable automatic server restart on failure</label>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="monitoring" defaultChecked />
                  <label htmlFor="monitoring" className="text-sm">Enable performance monitoring</label>
                </div>

                <div className="flex gap-2">
                  <Button size="sm">Save Configuration</Button>
                  <Button size="sm" variant="outline">Reset to Defaults</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Server Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Market Data Server', type: 'market_data', description: 'Standard market data provider template' },
                  { name: 'Trading Gateway', type: 'trading_ops', description: 'Order execution and portfolio management' },
                  { name: 'Risk Engine', type: 'trading_ops', description: 'Risk management and compliance checking' },
                  { name: 'Intelligence Service', type: 'intelligence', description: 'AI/ML and data intelligence services' }
                ].map((template) => (
                  <div key={template.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTypeIcon(template.type)}
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}