export interface Alert {
  id: string;
  type: 'risk' | 'system' | 'trading' | 'compliance' | 'performance' | 'security';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  auto_dismiss: boolean;
  dismiss_after?: number; // seconds
  action_required: boolean;
  actions?: AlertAction[];
  metadata?: Record<string, any>;
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'api_call';
  action: string;
  parameters?: Record<string, any>;
  style: 'primary' | 'secondary' | 'danger';
}

export interface Notification {
  id: string;
  type: 'trade_executed' | 'strategy_update' | 'system_alert' | 'market_update' | 'compliance';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  user_id: string;
  source: string;
  link?: string;
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'maintenance';
  last_updated: Date;
  components: ComponentStatus[];
  performance: SystemPerformance;
  alerts: Alert[];
}

export interface ComponentStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  uptime: number; // percentage
  response_time: number; // milliseconds
  last_check: Date;
  error_count: number;
  dependencies: string[];
}

export interface SystemPerformance {
  cpu_usage: number; // percentage
  memory_usage: number; // percentage
  disk_usage: number; // percentage
  network_throughput: number; // Mbps
  database_connections: number;
  active_users: number;
  requests_per_minute: number;
}

export interface UserPreferences {
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  currency: string;
  notifications: NotificationPreferences;
  dashboard_layout: DashboardLayout;
  trading_preferences: TradingPreferences;
  updated_at: Date;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  in_app: boolean;
  sms: boolean;
  categories: {
    trading: boolean;
    risk: boolean;
    system: boolean;
    compliance: boolean;
    performance: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string; // HH:mm
    end_time: string; // HH:mm
    timezone: string;
  };
}

export interface DashboardLayout {
  layout_id: string;
  name: string;
  widgets: DashboardWidget[];
  grid_config: GridConfig;
  is_default: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'portfolio_summary' | 'strategy_performance' | 'risk_metrics' | 'market_data' | 'trading_activity' | 'mcp_status' | 'vault_overview';
  title: string;
  position: WidgetPosition;
  config: Record<string, any>;
  visible: boolean;
  refreshInterval?: number; // seconds
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GridConfig {
  columns: number;
  rows: number;
  margin: number;
  container_padding: number;
  row_height: number;
  auto_size: boolean;
}

export interface TradingPreferences {
  default_order_type: 'market' | 'limit';
  default_time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  confirmation_required: boolean;
  risk_warnings: boolean;
  position_size_method: 'fixed' | 'percentage' | 'risk_based';
  default_stop_loss: number; // percentage
  default_take_profit: number; // percentage
  max_positions: number;
  favorite_symbols: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
  request_id: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string; // Only in development
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
  period: '1h' | '4h' | '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
}

export interface FilterOptions {
  symbols?: string[];
  strategies?: string[];
  status?: string[];
  date_range?: TimeRange;
  amount_range?: {
    min: number;
    max: number;
  };
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  volume?: number;
  metadata?: Record<string, any>;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: 'line' | 'bar' | 'area' | 'candlestick';
  visible?: boolean;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  correlation_id?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  last_ping: Date;
  latency: number; // milliseconds
  reconnect_attempts: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = any> {
  state: LoadingState;
  data?: T;
  error?: string;
  lastFetch?: Date;
} 