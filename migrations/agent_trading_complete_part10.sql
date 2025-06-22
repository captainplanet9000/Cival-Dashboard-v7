-- Agent Trading Complete Database Schema (Phase 3) - Part 10
-- Triggers and Functions for Automated Data Management

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