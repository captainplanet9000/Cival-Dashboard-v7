-- Migration: Agent Trading Schema (Part 4)
-- State management tables

-- Agent state storage
CREATE TABLE IF NOT EXISTS public.agent_state (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent checkpoints for state recovery
CREATE TABLE IF NOT EXISTS public.agent_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES public.agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkpoint_id VARCHAR(50) UNIQUE NOT NULL,
    state JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Agent trading decisions
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