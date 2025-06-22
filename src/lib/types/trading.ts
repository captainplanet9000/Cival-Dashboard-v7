export interface MarketData {
  symbol: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  source: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  strategy_id: string;
  signal_type: 'buy' | 'sell' | 'hold';
  strength: number; // 0-1
  confidence: number; // 0-1
  entry_price: number;
  stop_loss?: number;
  take_profit?: number;
  risk_reward_ratio: number;
  generated_at: Date;
  reasoning: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  entry_time: Date;
  strategy_id: string;
  stop_loss?: number;
  take_profit?: number;
}

export interface Order {
  id: string;
  account_id: string;
  symbol: string;
  order_type: 'market' | 'limit' | 'stop' | 'bracket' | 'oco' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stop_price?: number;
  status: 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
  filled_quantity: number;
  average_fill_price?: number;
  commission: number;
  created_at: Date;
  updated_at: Date;
  strategy_id?: string;
}

export interface StrategyInstance {
  id: string;
  strategy_id: string;
  name: string;
  strategy_type: 'darvas_box' | 'williams_alligator' | 'renko' | 'heikin_ashi' | 'elliott_wave' | 'composite';
  status: 'active' | 'paused' | 'stopped' | 'error';
  allocated_capital: number;
  current_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_trades: number;
  winning_trades: number;
  config: StrategyConfig;
  risk_parameters: RiskParameters;
  performance_metrics: PerformanceMetrics;
  created_at: Date;
  last_trade_at?: Date;
}

export interface StrategyConfig {
  [key: string]: any;
  // Darvas Box specific
  lookback_period?: number;
  breakout_threshold?: number;
  volume_threshold?: number;
  // Williams Alligator specific
  jaw_period?: number;
  teeth_period?: number;
  lips_period?: number;
  // Renko specific
  brick_size?: number;
  // Elliott Wave specific
  wave_analysis_depth?: number;
}

export interface RiskParameters {
  max_position_size: number; // Percentage of portfolio
  max_daily_loss: number; // Percentage
  max_drawdown: number; // Percentage
  stop_loss_percentage: number;
  take_profit_percentage?: number;
  correlation_limit: number;
  max_open_positions: number;
}

export interface PerformanceMetrics {
  total_return: number;
  total_return_percent: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  calmar_ratio: number;
  max_drawdown: number;
  current_drawdown: number;
  win_rate: number;
  profit_factor: number;
  average_trade_duration: number; // hours
  best_trade: number;
  worst_trade: number;
  volatility: number;
}

export interface PaperTradingAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  total_equity: number;
  unrealized_pnl: number;
  realized_pnl: number;
  total_return_percent: number;
  positions: Position[];
  orders: Order[];
  created_at: Date;
  updated_at: Date;
}

export interface TradeExecution {
  id: string;
  order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  timestamp: Date;
  strategy_id: string;
  execution_type: 'market' | 'limit' | 'stop';
  slippage: number;
}

export interface RiskMetrics {
  portfolio_var_95: number;
  portfolio_var_99: number;
  expected_shortfall: number;
  correlation_risk: number;
  concentration_risk: number;
  liquidity_risk: number;
  current_leverage: number;
  max_correlation: number;
  largest_position_percent: number;
} 