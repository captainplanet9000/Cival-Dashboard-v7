-- Consolidated Migration: Agent Trading Schema
-- This consolidates all agent trading schema components in the correct order
-- to resolve dependency issues

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create helper functions for timestamps if they don't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- SECTION 1: Base Tables
-- Agent trading permissions table (from part 1)
CREATE TABLE IF NOT EXISTS public.agent_trading_permissions (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    max_trade_size DECIMAL(18,8) DEFAULT 10000.00,
    max_position_size DECIMAL(18,8) DEFAULT 50000.00,
    max_daily_trades INT DEFAULT 100,
    allowed_symbols JSONB DEFAULT '["BTC", "ETH", "SOL"]'::jsonb,
    allowed_strategies JSONB DEFAULT '["momentum", "mean_reversion", "arbitrage"]'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT true,
    trades_today INTEGER DEFAULT 0,
    position_value DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_trading_permissions
ALTER TABLE public.agent_trading_permissions ENABLE ROW LEVEL SECURITY;

-- SECTION 2: Trading Tables
-- Agent trades table (from part 2)
CREATE TABLE IF NOT EXISTS public.agent_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    strategy VARCHAR(50),
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    status VARCHAR(20) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_trades
ALTER TABLE public.agent_trades ENABLE ROW LEVEL SECURITY;

-- Agent positions table (from part 2)
CREATE TABLE IF NOT EXISTS public.agent_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    average_price DECIMAL(18,8) NOT NULL,
    current_price DECIMAL(18,8),
    unrealized_pnl DECIMAL(18,8),
    realized_pnl DECIMAL(18,8) DEFAULT 0,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agent_id, symbol, account_id)
);

-- Enable RLS on agent_positions
ALTER TABLE public.agent_positions ENABLE ROW LEVEL SECURITY;-- SECTION 3: Performance and Status Tables
-- Agent performance metrics (from part 3)
CREATE TABLE IF NOT EXISTS public.agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_trades INT DEFAULT 0,
    successful_trades INT DEFAULT 0,
    failed_trades INT DEFAULT 0,
    total_profit_loss DECIMAL(18,8) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    average_trade_duration INTEGER DEFAULT 0,
    max_drawdown DECIMAL(18,8) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agent_id, date)
);

-- Enable RLS on agent_performance
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;

-- Agent status tracking (from part 3)
CREATE TABLE IF NOT EXISTS public.agent_status (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_status
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

-- Agent market data subscriptions (from part 3)
CREATE TABLE IF NOT EXISTS public.agent_market_data_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(agent_id, symbol, interval)
);

-- Enable RLS on agent_market_data_subscriptions
ALTER TABLE public.agent_market_data_subscriptions ENABLE ROW LEVEL SECURITY;-- SECTION 4: State Management Tables
-- Agent state storage (from part 4)
CREATE TABLE IF NOT EXISTS public.agent_state (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_state
ALTER TABLE public.agent_state ENABLE ROW LEVEL SECURITY;

-- Agent checkpoints for state recovery (from part 4)
-- This is the table that was missing before policy creation
CREATE TABLE IF NOT EXISTS public.agent_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkpoint_id VARCHAR(50) UNIQUE NOT NULL,
    state JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_checkpoints
ALTER TABLE public.agent_checkpoints ENABLE ROW LEVEL SECURITY;

-- Agent trading decisions (from part 4)
CREATE TABLE IF NOT EXISTS public.agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    decision JSONB NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on agent_decisions
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;-- SECTION 5: Row Level Security Policies
-- Now that all tables are created, we can add all RLS policies

-- RLS Policies for agent_trading_permissions
CREATE POLICY "Users can view their own agent trading permissions" 
    ON public.agent_trading_permissions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent trading permissions" 
    ON public.agent_trading_permissions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent trading permissions" 
    ON public.agent_trading_permissions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent trading permissions" 
    ON public.agent_trading_permissions FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_trades
CREATE POLICY "Users can view their own agent trades" 
    ON public.agent_trades FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent trades" 
    ON public.agent_trades FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent trades" 
    ON public.agent_trades FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent trades" 
    ON public.agent_trades FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_positions
CREATE POLICY "Users can view their own agent positions" 
    ON public.agent_positions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent positions" 
    ON public.agent_positions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent positions" 
    ON public.agent_positions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent positions" 
    ON public.agent_positions FOR DELETE 
    USING (auth.uid() = user_id);-- RLS Policies for agent_performance
CREATE POLICY "Users can view their own agent performance" 
    ON public.agent_performance FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent performance" 
    ON public.agent_performance FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent performance" 
    ON public.agent_performance FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent performance" 
    ON public.agent_performance FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_status
CREATE POLICY "Users can view their own agent status" 
    ON public.agent_status FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent status" 
    ON public.agent_status FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent status" 
    ON public.agent_status FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent status" 
    ON public.agent_status FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_market_data_subscriptions
CREATE POLICY "Users can view their own agent market data subscriptions" 
    ON public.agent_market_data_subscriptions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent market data subscriptions" 
    ON public.agent_market_data_subscriptions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent market data subscriptions" 
    ON public.agent_market_data_subscriptions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent market data subscriptions" 
    ON public.agent_market_data_subscriptions FOR DELETE 
    USING (auth.uid() = user_id);-- RLS Policies for agent_state
CREATE POLICY "Users can view their own agent state" 
    ON public.agent_state FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent state" 
    ON public.agent_state FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent state" 
    ON public.agent_state FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent state" 
    ON public.agent_state FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_checkpoints (this was the problematic one)
CREATE POLICY "Users can view their own agent checkpoints" 
    ON public.agent_checkpoints FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent checkpoints" 
    ON public.agent_checkpoints FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent checkpoints" 
    ON public.agent_checkpoints FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent checkpoints" 
    ON public.agent_checkpoints FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for agent_decisions
CREATE POLICY "Users can view their own agent decisions" 
    ON public.agent_decisions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent decisions" 
    ON public.agent_decisions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent decisions" 
    ON public.agent_decisions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent decisions" 
    ON public.agent_decisions FOR DELETE 
    USING (auth.uid() = user_id);

-- Final setup for triggers to maintain created_at and updated_at
CREATE TRIGGER set_created_at
    BEFORE INSERT ON public.agent_trading_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.agent_trading_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();