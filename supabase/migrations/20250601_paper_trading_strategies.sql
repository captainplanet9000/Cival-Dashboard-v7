-- Migration: Paper Trading Strategies Integration
-- This migration adds the necessary tables and functions for paper trading with AI strategies

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Handle updated_at and created_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_created_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create paper_trading_strategies table
CREATE TABLE IF NOT EXISTS public.paper_trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metadata JSONB
);

-- Create paper_trading_signals table
CREATE TABLE IF NOT EXISTS public.paper_trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.paper_trading_strategies(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  signal VARCHAR(20) NOT NULL CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  confidence NUMERIC(5,2),
  price NUMERIC(24,12),
  quantity NUMERIC(24,12),
  metadata JSONB,
  executed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create paper_trading_orders table
CREATE TABLE IF NOT EXISTS public.paper_trading_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.paper_trading_signals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT')),
  side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity NUMERIC(24,12) NOT NULL,
  price NUMERIC(24,12),
  stop_price NUMERIC(24,12),
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED')),
  filled_quantity NUMERIC(24,12) DEFAULT 0,
  filled_price NUMERIC(24,12),
  portfolio_id UUID,
  strategy_id UUID REFERENCES public.paper_trading_strategies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create paper_trading_positions table
CREATE TABLE IF NOT EXISTS public.paper_trading_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID,
  symbol VARCHAR(50) NOT NULL,
  quantity NUMERIC(24,12) NOT NULL,
  entry_price NUMERIC(24,12) NOT NULL,
  current_price NUMERIC(24,12) NOT NULL,
  unrealized_pnl NUMERIC(24,12),
  realized_pnl NUMERIC(24,12) DEFAULT 0,
  strategy_id UUID REFERENCES public.paper_trading_strategies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create paper_trading_portfolios table
CREATE TABLE IF NOT EXISTS public.paper_trading_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  balance NUMERIC(24,12) NOT NULL DEFAULT 100000,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create paper_trading_strategy_runs table
CREATE TABLE IF NOT EXISTS public.paper_trading_strategy_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.paper_trading_strategies(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create paper_trading_market_data table
CREATE TABLE IF NOT EXISTS public.paper_trading_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(50) NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open NUMERIC(24,12) NOT NULL,
  high NUMERIC(24,12) NOT NULL,
  low NUMERIC(24,12) NOT NULL,
  close NUMERIC(24,12) NOT NULL,
  volume NUMERIC(24,12) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create paper_trading_technical_indicators table
CREATE TABLE IF NOT EXISTS public.paper_trading_technical_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(50) NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  indicator_type VARCHAR(50) NOT NULL,
  values JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at_paper_trading_strategies
BEFORE UPDATE ON public.paper_trading_strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_signals
BEFORE UPDATE ON public.paper_trading_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_orders
BEFORE UPDATE ON public.paper_trading_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_positions
BEFORE UPDATE ON public.paper_trading_positions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_portfolios
BEFORE UPDATE ON public.paper_trading_portfolios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_strategy_runs
BEFORE UPDATE ON public.paper_trading_strategy_runs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_paper_trading_technical_indicators
BEFORE UPDATE ON public.paper_trading_technical_indicators
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add triggers for created_at
CREATE TRIGGER set_created_at_paper_trading_strategies
BEFORE INSERT ON public.paper_trading_strategies
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_signals
BEFORE INSERT ON public.paper_trading_signals
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_orders
BEFORE INSERT ON public.paper_trading_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_positions
BEFORE INSERT ON public.paper_trading_positions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_portfolios
BEFORE INSERT ON public.paper_trading_portfolios
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_strategy_runs
BEFORE INSERT ON public.paper_trading_strategy_runs
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER set_created_at_paper_trading_technical_indicators
BEFORE INSERT ON public.paper_trading_technical_indicators
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

-- Enable Row Level Security
ALTER TABLE public.paper_trading_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_strategy_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trading_technical_indicators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own strategies"
ON public.paper_trading_strategies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own strategies"
ON public.paper_trading_strategies
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders"
ON public.paper_trading_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own orders"
ON public.paper_trading_orders
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own positions"
ON public.paper_trading_positions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own positions"
ON public.paper_trading_positions
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own portfolios"
ON public.paper_trading_portfolios
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own portfolios"
ON public.paper_trading_portfolios
FOR ALL
USING (auth.uid() = user_id);

-- Market data and technical indicators are read-only for all authenticated users
CREATE POLICY "Authenticated users can view market data"
ON public.paper_trading_market_data
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view technical indicators"
ON public.paper_trading_technical_indicators
FOR SELECT
TO authenticated
USING (true);

-- Index creation for performance
CREATE INDEX IF NOT EXISTS idx_paper_trading_strategies_user_id ON public.paper_trading_strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trading_signals_strategy_id ON public.paper_trading_signals(strategy_id);
CREATE INDEX IF NOT EXISTS idx_paper_trading_orders_user_id ON public.paper_trading_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trading_orders_symbol ON public.paper_trading_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_trading_positions_user_id ON public.paper_trading_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trading_positions_symbol ON public.paper_trading_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_paper_trading_portfolios_user_id ON public.paper_trading_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_paper_trading_market_data_symbol_timeframe ON public.paper_trading_market_data(symbol, timeframe);
CREATE INDEX IF NOT EXISTS idx_paper_trading_market_data_timestamp ON public.paper_trading_market_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_paper_trading_technical_indicators_symbol_timeframe ON public.paper_trading_technical_indicators(symbol, timeframe);
