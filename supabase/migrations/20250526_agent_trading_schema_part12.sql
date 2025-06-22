-- Migration: Agent Trading Schema (Part 12)
-- Triggers and Functions (Continued)

-- Create more triggers for automatic timestamp updates
CREATE TRIGGER handle_agent_market_data_subscriptions_created_at BEFORE INSERT ON public.agent_market_data_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_market_data_subscriptions_updated_at BEFORE UPDATE ON public.agent_market_data_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_state_created_at BEFORE INSERT ON public.agent_state
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_state_updated_at BEFORE UPDATE ON public.agent_state
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_checkpoints_created_at BEFORE INSERT ON public.agent_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_decisions_created_at BEFORE INSERT ON public.agent_decisions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();