-- Migration: Agent Trading Schema (Part 9)
-- Row Level Security Policies (Continued)

-- RLS Policies for agent_state
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

-- RLS Policies for agent_checkpoints
CREATE POLICY "Users can view their own agent checkpoints"
    ON public.agent_checkpoints FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent checkpoints"
    ON public.agent_checkpoints FOR INSERT
    WITH CHECK (auth.uid() = user_id);