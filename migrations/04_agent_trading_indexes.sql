-- Agent Trading Database Schema: Indexes
-- Migration 04: Performance indexes for agent trading system

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_status ON agent_trades(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON agent_trades(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON agent_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_symbol ON agent_positions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(date);

CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_agent_id ON agent_market_data_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_symbol ON agent_market_data_subscriptions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_id ON agent_decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_symbol ON agent_decisions(symbol);

-- Create index on agent state for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_state_agent_id ON agent_state(agent_id);

-- Create index on agent checkpoints for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_agent_id ON agent_checkpoints(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_checkpoint_id ON agent_checkpoints(checkpoint_id);