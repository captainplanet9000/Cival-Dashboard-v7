-- Agent Trading Complete Database Schema (Phase 3) - Part 3
-- Market Data Subscriptions and State Management

-- Agent market data subscriptions
CREATE TABLE IF NOT EXISTS agent_market_data_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users
    symbol VARCHAR(50) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, symbol, interval)
);

-- Agent state storage
CREATE TABLE IF NOT EXISTS agent_state (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent checkpoints for state recovery
CREATE TABLE IF NOT EXISTS agent_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users
    checkpoint_id VARCHAR(50) UNIQUE NOT NULL,
    state JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent trading decisions
CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users
    symbol VARCHAR(50) NOT NULL,
    decision JSONB NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);