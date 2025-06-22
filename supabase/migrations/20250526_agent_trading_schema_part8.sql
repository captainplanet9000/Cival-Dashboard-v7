-- Migration: Agent Trading Schema (Part 8)
-- Row Level Security Policies (Continued)

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
    USING (auth.uid() = user_id);