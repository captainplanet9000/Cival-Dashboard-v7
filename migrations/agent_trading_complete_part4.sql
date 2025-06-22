-- Agent Trading Complete Database Schema (Phase 3) - Part 4
-- Indexes for Performance Optimization

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_user_id ON agent_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_status ON agent_trades(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON agent_trades(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON agent_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_user_id ON agent_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_symbol ON agent_positions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_user_id ON agent_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(date);

CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_agent_id ON agent_market_data_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_user_id ON agent_market_data_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_symbol ON agent_market_data_subscriptions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_id ON agent_decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_id ON agent_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_symbol ON agent_decisions(symbol);

-- Row Level Security Policies
-- Enable RLS on all tables
ALTER TABLE agent_trading_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_market_data_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;