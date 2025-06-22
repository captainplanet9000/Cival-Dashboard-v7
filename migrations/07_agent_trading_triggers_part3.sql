-- Agent Trading Database Schema: Triggers and Functions (Part 3)
-- Migration 07: Performance tracking functions (part 2)

-- Continuation of the aggregate_agent_daily_performance function
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

-- Create trigger to update daily performance after trade insert/update
CREATE OR REPLACE FUNCTION update_agent_performance_on_trade()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM aggregate_agent_daily_performance(NEW.agent_id, DATE(NEW.created_at));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_performance_after_trade
AFTER INSERT OR UPDATE ON agent_trades
FOR EACH ROW
EXECUTE FUNCTION update_agent_performance_on_trade();