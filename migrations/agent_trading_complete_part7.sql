-- Agent Trading Complete Database Schema (Phase 3) - Part 7
-- Row Level Security Policies (Part 3)

CREATE POLICY "Users can delete their own agent performance"
    ON agent_performance FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for agent_status
CREATE POLICY "Users can view their own agent status"
    ON agent_status FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent status"
    ON agent_status FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent status"
    ON agent_status FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent status"
    ON agent_status FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for agent_market_data_subscriptions
CREATE POLICY "Users can view their own agent market data subscriptions"
    ON agent_market_data_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent market data subscriptions"
    ON agent_market_data_subscriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent market data subscriptions"
    ON agent_market_data_subscriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent market data subscriptions"
    ON agent_market_data_subscriptions FOR DELETE
    USING (auth.uid() = user_id);