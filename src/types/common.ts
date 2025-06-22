// Common Types for Cival Dashboard

// UUID type alias for string
export type UUID = string;
export interface Alert {
  id: string;
  type: 'trading' | 'risk' | 'system' | 'compliance' | 'performance' | 'security';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  source: string;
  source_id?: string;
  metadata: Record<string, any>;
  actions: AlertAction[];
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  resolved_at?: Date;
  resolved_by?: string;
  auto_resolve: boolean;
  escalation_level: number;
  recurring: boolean;
}

export interface AlertAction {
  id: string;
  label: string;
  action_type: 'navigate' | 'api_call' | 'notification' | 'escalate';
  target: string;
  parameters?: Record<string, any>;
  requires_confirmation: boolean;
  disabled: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'alert' | 'trade_execution' | 'system_update' | 'report_ready' | 'approval_request';
  channel: 'in_app' | 'email' | 'sms' | 'push' | 'webhook';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  content: string;
  rich_content?: {
    html: string;
    attachments: NotificationAttachment[];
  };
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  scheduled_at?: Date;
  sent_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  metadata: Record<string, any>;
}

export interface NotificationAttachment {
  name: string;
  type: 'document' | 'image' | 'report' | 'chart';
  url: string;
  size: number;
  mime_type: string;
}

export interface SystemStatus {
  overall_status: 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance';
  last_updated: Date;
  components: SystemComponent[];
  incidents: Incident[];
  maintenance_windows: MaintenanceWindow[];
  performance_metrics: SystemPerformanceMetrics;
  uptime_stats: UptimeStats;
}

export interface SystemComponent {
  id: string;
  name: string;
  type: 'trading_engine' | 'market_data' | 'risk_system' | 'database' | 'api' | 'ui' | 'mcp_server' | 'vault_integration';
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  description: string;
  dependencies: string[];
  health_checks: HealthCheck[];
  metrics: ComponentMetrics;
  last_status_change: Date;
  status_page_visible: boolean;
}

export interface HealthCheck {
  id: string;
  name: string;
  type: 'ping' | 'http' | 'database' | 'queue' | 'custom';
  status: 'passing' | 'warning' | 'critical';
  response_time: number;
  last_check: Date;
  next_check: Date;
  check_interval: number;
  timeout: number;
  error_message?: string;
  success_rate: number;
}

export interface ComponentMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  request_rate: number;
  error_rate: number;
  response_time: number;
  queue_depth: number;
}

export interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  affected_components: string[];
  description: string;
  updates: IncidentUpdate[];
  started_at: Date;
  resolved_at?: Date;
  root_cause?: string;
  resolution?: string;
  postmortem_url?: string;
}

export interface IncidentUpdate {
  id: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  message: string;
  timestamp: Date;
  author: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  impact: 'none' | 'minor' | 'major';
  affected_components: string[];
  scheduled_start: Date;
  scheduled_end: Date;
  actual_start?: Date;
  actual_end?: Date;
  updates: MaintenanceUpdate[];
}

export interface MaintenanceUpdate {
  id: string;
  message: string;
  timestamp: Date;
  author: string;
}

export interface SystemPerformanceMetrics {
  avg_response_time: number;
  request_throughput: number;
  error_rate: number;
  active_users: number;
  total_trades_today: number;
  total_volume_today: number;
  peak_memory_usage: number;
  peak_cpu_usage: number;
  database_connections: number;
  cache_hit_rate: number;
}

export interface UptimeStats {
  current_uptime: string;
  uptime_percentage_24h: number;
  uptime_percentage_7d: number;
  uptime_percentage_30d: number;
  uptime_percentage_90d: number;
  mttr: number; // Mean Time To Recovery
  mtbf: number; // Mean Time Between Failures
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  trading: TradingPreferences;
  dashboard: DashboardPreferences;
  privacy: PrivacyPreferences;
  updated_at: Date;
}

export interface NotificationPreferences {
  trade_executions: boolean;
  risk_alerts: boolean;
  system_updates: boolean;
  daily_reports: boolean;
  weekly_reports: boolean;
  price_alerts: boolean;
  compliance_alerts: boolean;
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
}

export interface TradingPreferences {
  default_order_type: 'market' | 'limit' | 'stop';
  default_time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  confirm_orders: boolean;
  show_advanced_options: boolean;
  default_chart_timeframe: string;
  auto_refresh_interval: number;
  sound_alerts: boolean;
  position_size_warnings: boolean;
  risk_warnings: boolean;
}

export interface DashboardPreferences {
  default_layout: string;
  widget_settings: Record<string, WidgetSettings>;
  refresh_interval: number;
  auto_save_layout: boolean;
  compact_mode: boolean;
  show_tooltips: boolean;
  animation_speed: 'slow' | 'normal' | 'fast' | 'none';
}

export interface WidgetSettings {
  visible: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  configuration: Record<string, any>;
}

export interface PrivacyPreferences {
  analytics_tracking: boolean;
  performance_tracking: boolean;
  crash_reporting: boolean;
  usage_statistics: boolean;
  marketing_communications: boolean;
  data_retention_period: number;
  data_export_format: 'json' | 'csv' | 'excel';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: {
    timestamp: Date;
    request_id: string;
    processing_time: number;
    version: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack_trace?: string;
  correlation_id: string;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: string;
  channel: string;
  data: any;
  timestamp: Date;
  sequence_number: number;
  sender_id?: string;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting';
  last_connected: Date;
  reconnect_attempts: number;
  latency: number;
  error_message?: string;
} 