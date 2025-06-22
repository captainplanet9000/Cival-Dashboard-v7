-- Agent Trading Database Schema
-- For PostgreSQL

-- Agent trading permissions table
CREATE TABLE IF NOT EXISTS agent_trading_permissions (
    agent_id VARCHAR(50) PRIMARY KEY,
    account_id VARCHAR(50) NOT NULL,
    max_trade_size DECIMAL(15,2) DEFAULT 10000.00,
    max_position_size DECIMAL(15,2) DEFAULT 50000.00,
    max_daily_trades INT DEFAULT 100,
    allowed_symbols TEXT[] DEFAULT ARRAY['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
    allowed_strategies TEXT[] DEFAULT ARRAY['momentum', 'mean_reversion', 'arbitrage'],
    risk_level VARCHAR(20) DEFAULT 'moderate',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent trades table
CREATE TABLE IF NOT EXISTS agent_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    order_id VARCHAR(50),
    account_id VARCHAR(50),
    symbol VARCHAR(10) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('buy', 'sell')),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,2),
    order_type VARCHAR(20) NOT NULL,
    strategy VARCHAR(50),
    reasoning TEXT,
    confidence_score DECIMAL(3,2),
    status VARCHAR(20) DEFAULT 'pending',
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent positions table
CREATE TABLE IF NOT EXISTS agent_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(50) REFERENCES agent_trading_permissions(agent_id),
    account_id VARCHAR(50) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    average_price DECIMAL(15,2) NOT NULL,
    current_price DECIMAL(15,2),
    unrealized_pnl DECIMAL(15,2),
    realized_pnl DECIMAL(15,2) DEFAULT 0,
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
    winning_trades INT DEFAULT 0,
    losing_trades INT DEFAULT 0,
    total_pnl DECIMAL(15,2) DEFAULT 0,
    sharpe_ratio DECIMAL(5,2),
    max_drawdown DECIMAL(5,2),
    win_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date)
);

-- Create indexes for performance
CREATE INDEX idx_agent_trades_agent_id ON agent_trades(agent_id);
CREATE INDEX idx_agent_trades_status ON agent_trades(status);
CREATE INDEX idx_agent_trades_created_at ON agent_trades(created_at);
CREATE INDEX idx_agent_positions_agent_id ON agent_positions(agent_id);
CREATE INDEX idx_agent_performance_agent_id ON agent_performance(agent_id);
CREATE INDEX idx_agent_performance_date ON agent_performance(date);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_permissions_updated_at BEFORE UPDATE
    ON agent_trading_permissions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_positions_updated_at BEFORE UPDATE
    ON agent_positions FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
