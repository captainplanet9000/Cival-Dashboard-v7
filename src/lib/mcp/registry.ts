/**
 * MCP (Model Context Protocol) Server Registry
 * Manages all MCP server instances and their lifecycle
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  type: 'market_data' | 'trading_ops' | 'intelligence' | 'communication' | 'devops';
  category: string;
  version: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  endpoint: string;
  port: number;
  health_endpoint: string;
  capabilities: string[];
  dependencies: string[];
  environment: 'development' | 'staging' | 'production';
  auto_start: boolean;
  restart_policy: 'always' | 'never' | 'on-failure';
  max_retries: number;
  timeout: number;
  rate_limit: {
    requests_per_minute: number;
    burst_limit: number;
  };
  authentication: {
    type: 'api_key' | 'oauth' | 'jwt' | 'none';
    credentials?: Record<string, any>;
  };
  monitoring: {
    uptime: number;
    last_health_check: string;
    total_requests: number;
    error_rate: number;
    avg_response_time: number;
  };
  metadata: Record<string, any>;
}

export interface MCPServerMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  active_connections: number;
  queue_length: number;
  errors_last_hour: number;
  requests_last_hour: number;
  response_time_p95: number;
}

export class MCPServerRegistry {
  private static instance: MCPServerRegistry;
  private servers: Map<string, MCPServerConfig> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): MCPServerRegistry {
    if (!MCPServerRegistry.instance) {
      MCPServerRegistry.instance = new MCPServerRegistry();
    }
    return MCPServerRegistry.instance;
  }

  constructor() {
    this.initializeDefaultServers();
    this.startHealthChecking();
  }

  private initializeDefaultServers(): void {
    const defaultServers: MCPServerConfig[] = [
      {
        id: 'alpaca_market_data',
        name: 'Alpaca Market Data',
        type: 'market_data',
        category: 'financial',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8001',
        port: 8001,
        health_endpoint: '/health',
        capabilities: ['real_time_quotes', 'historical_data', 'market_hours', 'asset_info'],
        dependencies: ['alpaca_api'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 30000,
        rate_limit: {
          requests_per_minute: 200,
          burst_limit: 50
        },
        authentication: {
          type: 'api_key'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          provider: 'Alpaca',
          data_types: ['stocks', 'crypto'],
          regions: ['US']
        }
      },
      {
        id: 'alphavantage_data',
        name: 'Alpha Vantage Data',
        type: 'market_data',
        category: 'financial',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8002',
        port: 8002,
        health_endpoint: '/health',
        capabilities: ['fundamental_data', 'technical_indicators', 'earnings', 'news'],
        dependencies: ['alphavantage_api'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 30000,
        rate_limit: {
          requests_per_minute: 5,
          burst_limit: 2
        },
        authentication: {
          type: 'api_key'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          provider: 'Alpha Vantage',
          data_types: ['stocks', 'forex', 'crypto'],
          regions: ['Global']
        }
      },
      {
        id: 'financial_datasets',
        name: 'Financial Datasets',
        type: 'market_data',
        category: 'financial',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8003',
        port: 8003,
        health_endpoint: '/health',
        capabilities: ['alternative_data', 'economic_indicators', 'sector_data'],
        dependencies: ['financial_datasets_api'],
        environment: 'development',
        auto_start: false,
        restart_policy: 'on-failure',
        max_retries: 2,
        timeout: 45000,
        rate_limit: {
          requests_per_minute: 100,
          burst_limit: 20
        },
        authentication: {
          type: 'oauth'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          provider: 'Financial Datasets',
          data_types: ['alternative', 'economic'],
          regions: ['Global']
        }
      },
      {
        id: 'trading_gateway',
        name: 'Trading Gateway',
        type: 'trading_ops',
        category: 'execution',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8010',
        port: 8010,
        health_endpoint: '/health',
        capabilities: ['order_execution', 'portfolio_management', 'risk_checks'],
        dependencies: ['broker_api', 'risk_engine'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 5,
        timeout: 10000,
        rate_limit: {
          requests_per_minute: 1000,
          burst_limit: 100
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          brokers: ['Alpaca', 'Interactive Brokers'],
          order_types: ['market', 'limit', 'stop', 'stop_limit'],
          asset_classes: ['stocks', 'options', 'crypto']
        }
      },
      {
        id: 'order_management',
        name: 'Order Management System',
        type: 'trading_ops',
        category: 'execution',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8013',
        port: 8013,
        health_endpoint: '/health',
        capabilities: ['advanced_order_strategies', 'order_slicing', 'execution_algorithms', 'real_time_monitoring'],
        dependencies: ['market_data', 'broker_execution'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 10000,
        rate_limit: {
          requests_per_minute: 1500,
          burst_limit: 150
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          strategies: ['immediate', 'twap', 'vwap', 'iceberg', 'sniper', 'accumulation', 'distribution'],
          order_types: ['market', 'limit', 'stop', 'stop_limit'],
          features: ['real_time_execution', 'order_slicing', 'priority_queues']
        }
      },
      {
        id: 'portfolio_management',
        name: 'Portfolio Management System',
        type: 'trading_ops',
        category: 'analytics',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8014',
        port: 8014,
        health_endpoint: '/health',
        capabilities: ['portfolio_tracking', 'performance_analytics', 'risk_monitoring', 'rebalancing_recommendations'],
        dependencies: ['market_data', 'trade_history', 'risk_management'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 15000,
        rate_limit: {
          requests_per_minute: 500,
          burst_limit: 100
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          metrics: ['total_return', 'sharpe_ratio', 'sortino_ratio', 'max_drawdown', 'var_95'],
          risk_measures: ['component_var', 'concentration_risk', 'sector_exposure'],
          asset_classes: ['stocks', 'bonds', 'options', 'crypto', 'forex']
        }
      },
      {
        id: 'risk_management',
        name: 'Risk Management Engine',
        type: 'trading_ops',
        category: 'risk',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8015',
        port: 8015,
        health_endpoint: '/health',
        capabilities: ['risk_assessment', 'compliance_monitoring', 'trade_validation', 'portfolio_risk_analysis'],
        dependencies: ['market_data', 'portfolio_management'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 5000,
        rate_limit: {
          requests_per_minute: 2000,
          burst_limit: 200
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          risk_types: ['market_risk', 'credit_risk', 'liquidity_risk', 'concentration_risk'],
          compliance_rules: ['position_limit', 'sector_limit', 'var_limit', 'leverage_limit'],
          risk_levels: ['very_low', 'low', 'moderate', 'high', 'very_high', 'extreme']
        }
      },
      {
        id: 'broker_execution',
        name: 'Broker Execution Engine',
        type: 'trading_ops',
        category: 'execution',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8016',
        port: 8016,
        health_endpoint: '/health',
        capabilities: ['multi_broker_routing', 'smart_order_routing', 'execution_analytics', 'real_time_monitoring'],
        dependencies: ['market_data', 'broker_api'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 8000,
        rate_limit: {
          requests_per_minute: 1000,
          burst_limit: 150
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          brokers: ['alpaca', 'interactive_brokers', 'td_ameritrade', 'charles_schwab'],
          routing_strategies: ['best_price', 'fastest_execution', 'lowest_cost', 'highest_liquidity'],
          supported_assets: ['stocks', 'options', 'etfs', 'crypto', 'futures']
        }
      },
      {
        id: 'octagon_intelligence',
        name: 'Octagon Intelligence System',
        type: 'intelligence',
        category: 'analytics',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8020',
        port: 8020,
        health_endpoint: '/health',
        capabilities: ['pattern_recognition', 'sentiment_analysis', 'predictive_modeling', 'anomaly_detection', 'market_insights'],
        dependencies: ['market_data', 'portfolio_management'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 20000,
        rate_limit: {
          requests_per_minute: 300,
          burst_limit: 50
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          analysis_types: ['pattern_recognition', 'sentiment_analysis', 'predictive_modeling', 'anomaly_detection'],
          supported_timeframes: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
          confidence_levels: ['very_low', 'low', 'medium', 'high', 'very_high'],
          ai_models: ['ml_predictor', 'sentiment_analyzer', 'pattern_detector']
        }
      },
      {
        id: 'mongodb_intelligence',
        name: 'MongoDB Intelligence System',
        type: 'intelligence',
        category: 'storage',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8021',
        port: 8021,
        health_endpoint: '/health',
        capabilities: ['document_storage', 'complex_queries', 'data_analytics', 'intelligent_insights'],
        dependencies: ['market_data', 'trade_history'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 15000,
        rate_limit: {
          requests_per_minute: 1000,
          burst_limit: 200
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          document_types: ['market_data', 'trade_record', 'analysis_result', 'portfolio_snapshot'],
          query_types: ['find', 'aggregate', 'time_series', 'text_search'],
          collections: ['market_data', 'trade_records', 'analysis_results', 'news_articles'],
          storage_engines: ['document', 'time_series', 'full_text']
        }
      },
      {
        id: 'neo4j_intelligence',
        name: 'Neo4j Intelligence System',
        type: 'intelligence',
        category: 'graph',
        version: '1.0.0',
        status: 'offline',
        endpoint: 'http://localhost:8022',
        port: 8022,
        health_endpoint: '/health',
        capabilities: ['graph_operations', 'relationship_analysis', 'centrality_measures', 'community_detection', 'path_finding'],
        dependencies: ['market_data', 'trade_history', 'portfolio_management'],
        environment: 'development',
        auto_start: true,
        restart_policy: 'always',
        max_retries: 3,
        timeout: 12000,
        rate_limit: {
          requests_per_minute: 500,
          burst_limit: 100
        },
        authentication: {
          type: 'jwt'
        },
        monitoring: {
          uptime: 0,
          last_health_check: new Date().toISOString(),
          total_requests: 0,
          error_rate: 0,
          avg_response_time: 0
        },
        metadata: {
          node_types: ['symbol', 'agent', 'strategy', 'portfolio', 'trade', 'news'],
          relationship_types: ['trades', 'owns', 'correlates_with', 'influences', 'manages'],
          algorithms: ['shortest_path', 'centrality_calculation', 'community_detection'],
          query_languages: ['cypher', 'graph_traversal']
        }
      }
    ];

    defaultServers.forEach(server => {
      this.servers.set(server.id, server);
    });
  }

  // Server Management Methods
  registerServer(config: MCPServerConfig): void {
    this.servers.set(config.id, config);
    this.emit('server_registered', config);
  }

  unregisterServer(serverId: string): boolean {
    const server = this.servers.get(serverId);
    if (server) {
      this.servers.delete(serverId);
      this.emit('server_unregistered', server);
      return true;
    }
    return false;
  }

  getServer(serverId: string): MCPServerConfig | undefined {
    return this.servers.get(serverId);
  }

  getAllServers(): MCPServerConfig[] {
    return Array.from(this.servers.values());
  }

  getServersByType(type: MCPServerConfig['type']): MCPServerConfig[] {
    return this.getAllServers().filter(server => server.type === type);
  }

  getServersByStatus(status: MCPServerConfig['status']): MCPServerConfig[] {
    return this.getAllServers().filter(server => server.status === status);
  }

  // Server Control Methods
  async startServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) return false;

    try {
      // Simulate server startup
      server.status = 'online';
      server.monitoring.last_health_check = new Date().toISOString();
      this.emit('server_started', server);
      return true;
    } catch (error) {
      server.status = 'error';
      this.emit('server_error', { server, error });
      return false;
    }
  }

  async stopServer(serverId: string): Promise<boolean> {
    const server = this.servers.get(serverId);
    if (!server) return false;

    try {
      server.status = 'offline';
      this.emit('server_stopped', server);
      return true;
    } catch (error) {
      server.status = 'error';
      this.emit('server_error', { server, error });
      return false;
    }
  }

  async restartServer(serverId: string): Promise<boolean> {
    await this.stopServer(serverId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await this.startServer(serverId);
  }

  // Health Checking
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    const promises = this.getAllServers().map(server => this.checkServerHealth(server));
    await Promise.allSettled(promises);
  }

  private async checkServerHealth(server: MCPServerConfig): Promise<void> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${server.endpoint}${server.health_endpoint}`, {
        signal: AbortSignal.timeout(server.timeout)
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        server.status = 'online';
        server.monitoring.uptime = (server.monitoring.uptime || 0) + 30;
        server.monitoring.avg_response_time = 
          (server.monitoring.avg_response_time + responseTime) / 2;
      } else {
        server.status = 'error';
        server.monitoring.error_rate++;
      }
      
      server.monitoring.last_health_check = new Date().toISOString();
      server.monitoring.total_requests++;
      
    } catch (error) {
      server.status = 'offline';
      server.monitoring.error_rate++;
      server.monitoring.last_health_check = new Date().toISOString();
      
      // Auto-restart if policy allows
      if (server.restart_policy === 'always' && server.auto_start) {
        setTimeout(() => this.startServer(server.id), 5000);
      }
    }
  }

  // Metrics and Monitoring
  async getServerMetrics(serverId: string): Promise<MCPServerMetrics | null> {
    const server = this.servers.get(serverId);
    if (!server || server.status !== 'online') return null;

    try {
      const response = await fetch(`${server.endpoint}/metrics`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Failed to get metrics for ${serverId}:`, error);
    }
    return null;
  }

  getRegistryStats(): {
    total: number;
    online: number;
    offline: number;
    error: number;
    by_type: Record<string, number>;
  } {
    const servers = this.getAllServers();
    const stats = {
      total: servers.length,
      online: servers.filter(s => s.status === 'online').length,
      offline: servers.filter(s => s.status === 'offline').length,
      error: servers.filter(s => s.status === 'error').length,
      by_type: {} as Record<string, number>
    };

    servers.forEach(server => {
      stats.by_type[server.type] = (stats.by_type[server.type] || 0) + 1;
    });

    return stats;
  }

  // Configuration Management
  updateServerConfig(serverId: string, updates: Partial<MCPServerConfig>): boolean {
    const server = this.servers.get(serverId);
    if (!server) return false;

    Object.assign(server, updates);
    this.emit('server_updated', server);
    return true;
  }

  exportConfiguration(): string {
    const config = {
      servers: Array.from(this.servers.values()),
      exported_at: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(config, null, 2);
  }

  importConfiguration(configJson: string): boolean {
    try {
      const config = JSON.parse(configJson);
      if (config.servers && Array.isArray(config.servers)) {
        this.servers.clear();
        config.servers.forEach((server: MCPServerConfig) => {
          this.servers.set(server.id, server);
        });
        this.emit('configuration_imported', config);
        return true;
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
    }
    return false;
  }

  // Event System
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Cleanup
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.eventListeners.clear();
    this.servers.clear();
  }
}

export const mcpRegistry = MCPServerRegistry.getInstance();