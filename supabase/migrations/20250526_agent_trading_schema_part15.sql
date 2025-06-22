-- Migration: Agent Trading Schema (Part 15)
-- Performance Tracking Trigger Function

-- Create trigger to update daily performance after trade insert/update
CREATE OR REPLACE FUNCTION public.update_agent_performance_on_trade()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.aggregate_agent_daily_performance(NEW.agent_id, DATE(NEW.created_at));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

-- Apply the trigger to the agent_trades table
CREATE TRIGGER trigger_update_performance_after_trade
AFTER INSERT OR UPDATE ON public.agent_trades
FOR EACH ROW
EXECUTE FUNCTION public.update_agent_performance_on_trade();