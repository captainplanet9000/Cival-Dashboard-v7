// Trading Types for Cival Dashboard
export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface TradingSignal {
  id: string;
  symbol: string;
  strategy: string;
  signal: 'buy' | 'sell' | 'hold';
  strength: number; // 0-1
  confidence: number; // 0-1
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward_ratio: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  entry_time: Date;
  strategy_id?: string;
  stop_loss?: number;
  take_profit?: number;
  commission: number;
}

export interface Order {
  id: string;
  account_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'bracket' | 'oco' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stop_price?: number;
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
  filled_quantity: number;
  average_fill_price: number;
  created_at: Date;
  updated_at: Date;
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  strategy_id?: string;
}

export interface StrategyInstance {
  id: string;
  name: string;
  strategy_type: 'darvas_box' | 'williams_alligator' | 'renko' | 'heikin_ashi' | 'elliott_wave' | 'integrated_technical';
  status: 'active' | 'paused' | 'stopped' | 'error';
  allocated_capital: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_return: number;
  positions: Position[];
  configuration: StrategyConfig;
  performance_metrics: PerformanceMetrics;
  risk_metrics: RiskMetrics;
  created_at: Date;
  updated_at: Date;
}

export interface StrategyConfig {
  parameters: Record<string, any>;
  risk_parameters: {
    max_position_size: number;
    stop_loss_percentage: number;
    take_profit_percentage: number;
    max_daily_loss: number;
    correlation_limit: number;
  };
  symbols: string[];
  timeframes: string[];
  agent_count: number;
}

export interface RiskMetrics {
  value_at_risk_95: number;
  value_at_risk_99: number;
  expected_shortfall: number;
  max_drawdown: number;
  current_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  volatility: number;
  beta: number;
  correlation_matrix: Record<string, Record<string, number>>;
  concentration_risk: number;
  leverage_ratio: number;
}

export interface PerformanceMetrics {
  total_return: number;
  annualized_return: number;
  win_rate: number;
  profit_factor: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  average_trade_duration: number;
  kelly_criterion: number;
  information_ratio: number;
}

export interface PaperTradingAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  total_equity: number;
  unrealized_pnl: number;
  realized_pnl: number;
  available_buying_power: number;
  margin_used: number;
  positions: Position[];
  orders: Order[];
  performance_metrics: PerformanceMetrics;
  risk_metrics: RiskMetrics;
  created_at: Date;
  updated_at: Date;
}

export interface BacktestResult {
  id: string;
  strategy_config: StrategyConfig;
  start_date: Date;
  end_date: Date;
  initial_capital: number;
  final_value: number;
  total_return: number;
  performance_metrics: PerformanceMetrics;
  risk_metrics: RiskMetrics;
  trades: Order[];
  equity_curve: { date: Date; value: number }[];
  drawdown_curve: { date: Date; drawdown: number }[];
  created_at: Date;
}

export interface TradingAlert {
  id: string;
  type: 'price' | 'position' | 'risk' | 'system' | 'strategy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  symbol?: string;
  strategy_id?: string;
  position_id?: string;
  triggered_at: Date;
  acknowledged: boolean;
  acknowledged_at?: Date;
  metadata: Record<string, any>;
} 