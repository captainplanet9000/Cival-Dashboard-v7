-- Agent Trading Database Schema: Triggers and Functions
-- Migration 05: Automated triggers and functions for data maintenance

-- Create update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the update_updated_at_column trigger to all tables with updated_at
CREATE TRIGGER update_agent_permissions_updated_at BEFORE UPDATE
    ON agent_trading_permissions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_positions_updated_at BEFORE UPDATE
    ON agent_positions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_status_updated_at BEFORE UPDATE
    ON agent_status FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_subscriptions_updated_at BEFORE UPDATE
    ON agent_market_data_subscriptions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_state_updated_at BEFORE UPDATE
    ON agent_state FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_performance_updated_at BEFORE UPDATE
    ON agent_performance FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create daily agent performance aggregation function
CREATE OR REPLACE FUNCTION aggregate_agent_daily_performance(agent_id_param VARCHAR(50), date_param DATE)
RETURNS VOID AS $$
DECLARE
    total_trades_count INT;
    successful_trades_count INT;
    failed_trades_count INT;
    total_pnl DECIMAL(18,8);
    win_rate_calc DECIMAL(5,2);
BEGIN
    -- Count trades
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('filled', 'completed')),
        COUNT(*) FILTER (WHERE status IN ('failed', 'rejected', 'error'))
    INTO
        total_trades_count,
        successful_trades_count,
        failed_trades_count
    FROM agent_trades
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
    FROM agent_trades
    WHERE
        agent_id = agent_id_param AND
        DATE(created_at) = date_param AND
        status IN ('filled', 'completed');

    -- Calculate win rate
    IF total_trades_count > 0 THEN
        win_rate_calc := (successful_trades_count::DECIMAL / total_trades_count::DECIMAL) * 100;
    ELSE
        win_rate_calc := 0;
    END IF;

    -- Insert or update performance record
    INSERT INTO agent_performance (
        agent_id,
        date,
        total_trades,
        successful_trades,
        failed_trades,
        total_profit_loss,
        win_rate
    ) VALUES (
        agent_id_param,
        date_param,
        total_trades_count,
        successful_trades_count,
        failed_trades_count,
        total_pnl,
        win_rate_calc
    )
    ON CONFLICT (agent_id, date)
    DO UPDATE SET
        total_trades = EXCLUDED.total_trades,
        successful_trades = EXCLUDED.successful_trades,
        failed_trades = EXCLUDED.failed_trades,
        total_profit_loss = EXCLUDED.total_profit_loss,
        win_rate = EXCLUDED.win_rate,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;