-- Migration: Agent Trading Schema (Part 5)
-- Indexes for performance optimization

-- Create indexes for improved query performance
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON public.agent_trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_user_id ON public.agent_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_status ON public.agent_trades(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON public.agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON public.agent_trades(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON public.agent_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_user_id ON public.agent_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_symbol ON public.agent_positions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON public.agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_user_id ON public.agent_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON public.agent_performance(date);

CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_agent_id ON public.agent_market_data_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_user_id ON public.agent_market_data_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_symbol ON public.agent_market_data_subscriptions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_id ON public.agent_decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_id ON public.agent_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_symbol ON public.agent_decisions(symbol);

-- Create index on agent state for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_state_user_id ON public.agent_state(user_id);

-- Create index on agent checkpoints for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_agent_id ON public.agent_checkpoints(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_checkpoints_user_id ON public.agent_checkpoints(user_id);