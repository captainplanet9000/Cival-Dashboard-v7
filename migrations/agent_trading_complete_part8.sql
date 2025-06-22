-- Agent Trading Complete Database Schema (Phase 3) - Part 8
-- Row Level Security Policies (Part 4)

-- RLS Policies for agent_state
CREATE POLICY "Users can view their own agent state"
    ON agent_state FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent state"
    ON agent_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent state"
    ON agent_state FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent state"
    ON agent_state FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for agent_checkpoints
CREATE POLICY "Users can view their own agent checkpoints"
    ON agent_checkpoints FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent checkpoints"
    ON agent_checkpoints FOR INSERT
    WITH CHECK (auth.uid() = user_id);