-- Migration: Agent Trading Schema (Part 14)
-- Performance Aggregation Function (Part 2)

-- Continuation of the aggregate_agent_daily_performance function
    -- Calculate win rate
    IF total_trades_count > 0 THEN
        win_rate_calc := (successful_trades_count::DECIMAL / total_trades_count::DECIMAL) * 100;
    ELSE
        win_rate_calc := 0;
    END IF;

    -- Insert or update performance record
    INSERT INTO public.agent_performance (
        agent_id,
        user_id,
        date,
        total_trades,
        successful_trades,
        failed_trades,
        total_profit_loss,
        win_rate
    ) VALUES (
        agent_id_param,
        user_id_val,
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
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';