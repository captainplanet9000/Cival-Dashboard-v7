-- Agent Trading Complete Database Schema (Phase 3) - Part 5
-- Row Level Security Policies (Part 1)

-- RLS Policies for agent_trading_permissions
CREATE POLICY "Users can view their own agent permissions"
    ON agent_trading_permissions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent permissions"
    ON agent_trading_permissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent permissions"
    ON agent_trading_permissions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent permissions"
    ON agent_trading_permissions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for agent_trades
CREATE POLICY "Users can view their own agent trades"
    ON agent_trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent trades"
    ON agent_trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent trades"
    ON agent_trades FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent trades"
    ON agent_trades FOR DELETE
    USING (auth.uid() = user_id);