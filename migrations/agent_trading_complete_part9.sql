-- Agent Trading Complete Database Schema (Phase 3) - Part 9
-- Row Level Security Policies (Part 5)

CREATE POLICY "Users can update their own agent checkpoints"
    ON agent_checkpoints FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent checkpoints"
    ON agent_checkpoints FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for agent_decisions
CREATE POLICY "Users can view their own agent decisions"
    ON agent_decisions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent decisions"
    ON agent_decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent decisions"
    ON agent_decisions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent decisions"
    ON agent_decisions FOR DELETE
    USING (auth.uid() = user_id);