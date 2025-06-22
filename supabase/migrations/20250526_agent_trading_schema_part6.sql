-- Migration: Agent Trading Schema (Part 6)
-- Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE public.agent_trading_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_market_data_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agent_trading_permissions
CREATE POLICY "Users can view their own agent permissions"
    ON public.agent_trading_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent permissions"
    ON public.agent_trading_permissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent permissions"
    ON public.agent_trading_permissions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent permissions"
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