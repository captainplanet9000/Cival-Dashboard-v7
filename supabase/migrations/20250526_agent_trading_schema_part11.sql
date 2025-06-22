-- Migration: Agent Trading Schema (Part 11)
-- Triggers and Functions for Automated Data Management

-- Create triggers for automatic timestamp updates
CREATE TRIGGER handle_agent_trading_permissions_created_at BEFORE INSERT ON public.agent_trading_permissions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_trading_permissions_updated_at BEFORE UPDATE ON public.agent_trading_permissions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_trades_created_at BEFORE INSERT ON public.agent_trades
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_trades_updated_at BEFORE UPDATE ON public.agent_trades
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_positions_created_at BEFORE INSERT ON public.agent_positions
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_positions_updated_at BEFORE UPDATE ON public.agent_positions
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_performance_created_at BEFORE INSERT ON public.agent_performance
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_performance_updated_at BEFORE UPDATE ON public.agent_performance
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_agent_status_created_at BEFORE INSERT ON public.agent_status
FOR EACH ROW EXECUTE FUNCTION public.handle_created_at();

CREATE TRIGGER handle_agent_status_updated_at BEFORE UPDATE ON public.agent_status
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();