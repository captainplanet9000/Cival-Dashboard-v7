-- Migration: Agent Trading Schema (Part 13)
-- Performance Aggregation Function (Part 1)

-- Create function to aggregate agent daily performance
CREATE OR REPLACE FUNCTION public.aggregate_agent_daily_performance(agent_id_param VARCHAR(50), date_param DATE)
RETURNS VOID AS $$
DECLARE
    total_trades_count INT;
    successful_trades_count INT;
    failed_trades_count INT;
    total_pnl DECIMAL(18,8);
    win_rate_calc DECIMAL(5,2);
    user_id_val UUID;
BEGIN
    -- Get the user_id for this agent
    SELECT user_id INTO user_id_val
    FROM public.agent_trading_permissions
    WHERE agent_id = agent_id_param;

    -- Count trades
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('filled', 'completed')),
        COUNT(*) FILTER (WHERE status IN ('failed', 'rejected', 'error'))
    INTO
        total_trades_count,
        successful_trades_count,
        failed_trades_count
    FROM public.agent_trades
    WHERE
        agent_id = agent_id_param AND
        DATE(created_at) = date_param;

    -- Calculate PNL (simplified)
    SELECT
        COALESCE(SUM(
            CASE
                WHEN side = 'buy' THEN -1 * quantity * price
                WHEN side = 'sell' THEN quantity * price
                ELSE 0
            END
        ), 0)
    INTO total_pnl
    FROM public.agent_trades
    WHERE
        agent_id = agent_id_param AND
        DATE(created_at) = date_param AND
        status IN ('filled', 'completed');