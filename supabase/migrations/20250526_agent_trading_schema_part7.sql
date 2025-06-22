-- Migration: Agent Trading Schema (Part 7)
-- Row Level Security Policies (Continued)

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
    USING (auth.uid() = user_id);

-- RLS Policies for agent_performance
CREATE POLICY "Users can view their own agent performance"
    ON public.agent_performance FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent performance"
    ON public.agent_performance FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent performance"
    ON public.agent_performance FOR UPDATE
    USING (auth.uid() = user_id);