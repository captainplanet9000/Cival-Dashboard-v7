-- Agent Trading Complete Database Schema (Phase 3) - Part 1
-- Comprehensive migration with Row Level Security policies

-- Extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- Core Tables
-- =============================================

-- Agent trading permissions table
CREATE TABLE IF NOT EXISTS agent_trading_permissions (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL, -- Reference to auth.users
    account_id VARCHAR(50) NOT NULL,
    max_trade_size DECIMAL(18,8) DEFAULT 10000.00,
    max_position_size DECIMAL(18,8) DEFAULT 50000.00,
    max_daily_trades INT DEFAULT 100,
    allowed_symbols JSONB DEFAULT '["BTC", "ETH", "SOL"]'::jsonb,
    allowed_strategies JSONB DEFAULT '["momentum", "mean_reversion", "arbitrage"]'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT true,
    trades_today INTEGER DEFAULT 0,
    position_value DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent trades table
CREATE TABLE IF NOT EXISTS agent_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference to auth.users
    order_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    strategy VARCHAR(50),
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    status VARCHAR(20) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);