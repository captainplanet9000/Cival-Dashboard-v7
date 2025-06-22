-- Migration: Agent Trading Schema (Part 16)
-- Utility Functions for Agent Trading

-- Add utility function to check agent trading permission
CREATE OR REPLACE FUNCTION public.check_agent_trading_permission(
    agent_id_param VARCHAR(50),
    symbol_param VARCHAR(50),
    side_param VARCHAR(10),
    quantity_param DECIMAL(18,8)
) RETURNS BOOLEAN AS $$
DECLARE
    is_allowed BOOLEAN;
    max_trade_size DECIMAL(18,8);
    symbols JSONB;
    is_active BOOLEAN;
BEGIN
    -- Get permission details
    SELECT
        allowed_symbols,
        max_trade_size,
        is_active
    INTO
        symbols,
        max_trade_size,
        is_active
    FROM public.agent_trading_permissions
    WHERE agent_id = agent_id_param;

    -- Check if trading is active
    IF NOT is_active THEN
        RETURN FALSE;
    END IF;

    -- Check if symbol is allowed
    IF NOT (symbols ? symbol_param) THEN
        RETURN FALSE;
    END IF;

    -- Check if trade size is within limits
    IF quantity_param > max_trade_size THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';