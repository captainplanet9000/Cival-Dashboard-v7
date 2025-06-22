-- Migration: Agent Trading Schema
-- Creates tables and security policies for the agent trading system

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create helper function for created_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create helper function for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Agent trading permissions table
CREATE TABLE IF NOT EXISTS public.agent_trading_permissions (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);