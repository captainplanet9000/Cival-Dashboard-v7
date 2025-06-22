-- Enhanced Agent Trading Database Schema for Phase 3
-- Compatible with TypeScript interfaces from agent-trading-service.ts

-- Agent trading permissions table
CREATE TABLE IF NOT EXISTS agent_trading_permissions (
    agent_id VARCHAR(50) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    max_trade_size DECIMAL(18,8) DEFAULT 10000.00,
    max_position_size DECIMAL(18,8) DEFAULT 50000.00,
    max_daily_trades INT DEFAULT 100,
    allowed_symbols JSONB DEFAULT '["BTC", "ETH", "SOL"]'::jsonb,
    allowed_strategies JSONB DEFAULT '["momentum", "mean_reversion", "arbitrage"]'::jsonb,
    risk_level VARCHAR(20) DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT true,
    trades_today INTEGER DEFAULT 0,
    position_value DECIMAL(18,8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent trades table
CREATE TABLE IF NOT EXISTS agent_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    order_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    strategy VARCHAR(50),
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    status VARCHAR(20) NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent positions table
CREATE TABLE IF NOT EXISTS agent_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    account_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    quantity DECIMAL(18,8) NOT NULL,
    average_price DECIMAL(18,8) NOT NULL,
    current_price DECIMAL(18,8),
    unrealized_pnl DECIMAL(18,8),
    realized_pnl DECIMAL(18,8) DEFAULT 0,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, symbol, account_id)
);

-- Agent performance metrics
CREATE TABLE IF NOT EXISTS agent_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    date DATE NOT NULL,
    total_trades INT DEFAULT 0,
    successful_trades INT DEFAULT 0,
    failed_trades INT DEFAULT 0,
    total_profit_loss DECIMAL(18,8) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    average_trade_duration INTEGER DEFAULT 0,
    max_drawdown DECIMAL(18,8) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date)
);

-- Agent status table
CREATE TABLE IF NOT EXISTS agent_status (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES agent_trading_permissions(agent_id),
    status VARCHAR(20) NOT NULL DEFAULT 'idle',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent market data subscriptions
CREATE TABLE IF NOT EXISTS agent_market_data_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id VARCHAR(50) UNIQUE NOT NULL,
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    user_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    interval VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, symbol, interval)
);

-- Agent state storage
CREATE TABLE IF NOT EXISTS agent_state (
    agent_id VARCHAR(50) PRIMARY KEY REFERENCES agent_trading_permissions(agent_id),
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent checkpoints for state recovery
CREATE TABLE IF NOT EXISTS agent_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    checkpoint_id VARCHAR(50) UNIQUE NOT NULL,
    state JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent trading decisions
CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    symbol VARCHAR(50) NOT NULL,
    decision JSONB NOT NULL,
    reasoning TEXT,
    confidence_score DECIMAL(5,2),
    executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_trades_status ON agent_trades(status);
CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON agent_trades(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON agent_trades(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON agent_positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_positions_symbol ON agent_positions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_date ON agent_performance(date);

CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_agent_id ON agent_market_data_subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_market_data_subscriptions_symbol ON agent_market_data_subscriptions(symbol);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_id ON agent_decisions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_symbol ON agent_decisions(symbol);

-- Create update trigger for updated_at
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