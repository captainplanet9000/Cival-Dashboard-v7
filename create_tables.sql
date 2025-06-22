-- Cival Dashboard Agent Trading Schema
-- Execute this SQL in your Supabase SQL Editor

-- Enable RLS and create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agent trading permissions table
CREATE TABLE IF NOT EXISTS agent_trading_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    agent_id TEXT NOT NULL,
    max_position_size DECIMAL(15,2) DEFAULT 1000.00,
    max_daily_trades INTEGER DEFAULT 10,
    allowed_symbols TEXT[] DEFAULT ARRAY['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
    risk_level TEXT DEFAULT 'conservative' CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
    paper_trading_only BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent trades table
CREATE TABLE IF NOT EXISTS agent_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * price) STORED,
    order_type TEXT DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
    reasoning TEXT,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    paper_trade BOOLEAN DEFAULT true,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent positions table  
CREATE TABLE IF NOT EXISTS agent_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    symbol TEXT NOT NULL,
    quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
    average_price DECIMAL(15,4),
    current_price DECIMAL(15,4),
    market_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * COALESCE(current_price, average_price, 0)) STORED,
    unrealized_pnl DECIMAL(15,2) GENERATED ALWAYS AS (quantity * (COALESCE(current_price, average_price, 0) - COALESCE(average_price, 0))) STORED,
    paper_position BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agent_id, symbol, paper_position)
);

-- Agent performance table
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_trades > 0 THEN (winning_trades::DECIMAL / total_trades * 100) ELSE 0 END
    ) STORED,
    avg_trade_size DECIMAL(15,2) DEFAULT 0,
    max_drawdown DECIMAL(15,2) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4),
    last_trade_at TIMESTAMP WITH TIME ZONE,
    performance_period TEXT DEFAULT 'all_time',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent status table
CREATE TABLE IF NOT EXISTS agent_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'error')),
    strategy_name TEXT,
    current_cash DECIMAL(15,2) DEFAULT 100000.00,
    total_portfolio_value DECIMAL(15,2) DEFAULT 100000.00,
    daily_pnl DECIMAL(15,2) DEFAULT 0,
    last_decision_at TIMESTAMP WITH TIME ZONE,
    last_trade_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent state and memory tables
CREATE TABLE IF NOT EXISTS agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    state_type TEXT NOT NULL,
    state_data JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    decision_type TEXT NOT NULL,
    decision_data JSONB NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(3,2),
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON agent_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON agent_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_agent_id ON agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_agent_id ON agent_state(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_id ON agent_decisions(agent_id);

-- Insert sample agent data
INSERT INTO agent_status (agent_id, strategy_name, current_cash, total_portfolio_value)
VALUES 
    ('trading_agent_001', 'Darvas Box Strategy', 100000.00, 100000.00),
    ('trading_agent_002', 'Elliott Wave Strategy', 100000.00, 100000.00),
    ('trading_agent_003', 'SMA Crossover Strategy', 100000.00, 100000.00),
    ('trading_agent_004', 'Williams Alligator Strategy', 100000.00, 100000.00)
ON CONFLICT (agent_id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE agent_trading_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_decisions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies for development)
CREATE POLICY "Users can access their own trading permissions" ON agent_trading_permissions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own trades" ON agent_trades
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own positions" ON agent_positions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own performance" ON agent_performance
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own agent status" ON agent_status
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access their own agent state" ON agent_state
    FOR ALL USING (true); -- Allow for now, refine later

CREATE POLICY "Users can access their own agent decisions" ON agent_decisions
    FOR ALL USING (true); -- Allow for now, refine later

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add timestamp triggers
CREATE TRIGGER update_agent_trading_permissions_updated_at
    BEFORE UPDATE ON agent_trading_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_status_updated_at
    BEFORE UPDATE ON agent_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_performance_updated_at
    BEFORE UPDATE ON agent_performance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_agent_state_updated_at
    BEFORE UPDATE ON agent_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();