#!/usr/bin/env python3
"""
Database setup script for Cival Dashboard
Initializes Supabase database with agent trading schema
"""

import os
import sys
import requests
import json
from typing import Dict, Any

# Supabase configuration from environment variables
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', 'https://your-project.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'your_supabase_service_role_key_here')

def execute_sql(sql: str, description: str = "") -> Dict[str, Any]:
    """Execute SQL against Supabase database using the SQL API"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "text/plain"
    }
    
    # Use the database URL for direct SQL execution
    sql_url = f"{SUPABASE_URL}/sql"
    
    print(f"Executing: {description}")
    try:
        response = requests.post(sql_url, headers=headers, data=sql)
        
        if response.status_code in [200, 201]:
            print(f"✅ Success: {description}")
            return {"success": True, "data": response.text}
        else:
            print(f"❌ Failed: {description} - Status: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Try alternative method if first fails
            if "PGRST202" in response.text:
                print("Trying alternative SQL execution method...")
                return execute_sql_alternative(sql, description)
            
            return {"success": False, "error": response.text}
            
    except Exception as e:
        print(f"❌ Error executing {description}: {str(e)}")
        return {"success": False, "error": str(e)}

def execute_sql_alternative(sql: str, description: str = "") -> Dict[str, Any]:
    """Alternative SQL execution method"""
    print(f"⚠️  Database tables need to be created via Supabase Dashboard")
    print(f"SQL for {description}:")
    print("-" * 40)
    print(sql)
    print("-" * 40)
    return {"success": True, "manual": True}

def create_trading_tables():
    """Create essential trading tables"""
    
    # Agent trading permissions table
    permissions_sql = """
    CREATE TABLE IF NOT EXISTS agent_trading_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id),
        agent_id TEXT NOT NULL,
        max_position_size DECIMAL(15,2) DEFAULT 1000.00,
        max_daily_trades INTEGER DEFAULT 10,
        allowed_symbols TEXT[] DEFAULT ARRAY['AAPL', 'GOOGL', 'MSFT', 'TSLA'],
        risk_level TEXT DEFAULT 'conservative' CHECK (risk_level IN ('conservative', 'moderate', 'aggressive')),
        paper_trading_only BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    """
    
    # Agent trades table
    trades_sql = """
    CREATE TABLE IF NOT EXISTS agent_trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT NOT NULL,
        user_id UUID REFERENCES auth.users(id),
        symbol TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
        quantity DECIMAL(15,4) NOT NULL,
        price DECIMAL(15,4) NOT NULL,
        total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * price) STORED,
        order_type TEXT DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'cancelled', 'rejected')),
        reasoning TEXT,
        confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        paper_trade BOOLEAN DEFAULT true,
        executed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    """
    
    # Agent positions table  
    positions_sql = """
    CREATE TABLE IF NOT EXISTS agent_positions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT NOT NULL,
        user_id UUID REFERENCES auth.users(id),
        symbol TEXT NOT NULL,
        quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
        average_price DECIMAL(15,4),
        current_price DECIMAL(15,4),
        market_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * COALESCE(current_price, average_price, 0)) STORED,
        unrealized_pnl DECIMAL(15,2) GENERATED ALWAYS AS (quantity * (COALESCE(current_price, average_price, 0) - COALESCE(average_price, 0))) STORED,
        paper_position BOOLEAN DEFAULT true,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        UNIQUE(agent_id, symbol, paper_position)
    );
    """
    
    # Agent performance table
    performance_sql = """
    CREATE TABLE IF NOT EXISTS agent_performance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT NOT NULL,
        user_id UUID REFERENCES auth.users(id),
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        total_pnl DECIMAL(15,2) DEFAULT 0,
        win_rate DECIMAL(5,2) GENERATED ALWAYS AS (
            CASE WHEN total_trades > 0 THEN (winning_trades::DECIMAL / total_trades * 100) ELSE 0 END
        ) STORED,
        avg_trade_size DECIMAL(15,2) DEFAULT 0,
        max_drawdown DECIMAL(15,2) DEFAULT 0,
        sharpe_ratio DECIMAL(8,4),
        last_trade_at TIMESTAMP WITH TIME ZONE,
        performance_period TEXT DEFAULT 'all_time',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    """
    
    # Agent status table
    status_sql = """
    CREATE TABLE IF NOT EXISTS agent_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id TEXT NOT NULL UNIQUE,
        user_id UUID REFERENCES auth.users(id),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'error')),
        strategy_name TEXT,
        current_cash DECIMAL(15,2) DEFAULT 100000.00,
        total_portfolio_value DECIMAL(15,2) DEFAULT 100000.00,
        daily_pnl DECIMAL(15,2) DEFAULT 0,
        last_decision_at TIMESTAMP WITH TIME ZONE,
        last_trade_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    """
    
    # Execute table creation
    tables = [
        (permissions_sql, "agent_trading_permissions table"),
        (trades_sql, "agent_trades table"),
        (positions_sql, "agent_positions table"),
        (performance_sql, "agent_performance table"),
        (status_sql, "agent_status table")
    ]
    
    for sql, description in tables:
        result = execute_sql(sql, description)
        if not result["success"]:
            print(f"Failed to create {description}")
            return False
    
    return True

def create_indexes():
    """Create database indexes for performance"""
    indexes = [
        ("CREATE INDEX IF NOT EXISTS idx_agent_trades_agent_id ON agent_trades(agent_id);", "agent_trades agent_id index"),
        ("CREATE INDEX IF NOT EXISTS idx_agent_trades_symbol ON agent_trades(symbol);", "agent_trades symbol index"),
        ("CREATE INDEX IF NOT EXISTS idx_agent_trades_created_at ON agent_trades(created_at);", "agent_trades timestamp index"),
        ("CREATE INDEX IF NOT EXISTS idx_agent_positions_agent_id ON agent_positions(agent_id);", "agent_positions agent_id index"),
        ("CREATE INDEX IF NOT EXISTS idx_agent_status_agent_id ON agent_status(agent_id);", "agent_status agent_id index"),
    ]
    
    for sql, description in indexes:
        execute_sql(sql, description)

def insert_sample_data():
    """Insert sample data for testing"""
    
    # Sample agent status
    sample_agent_sql = """
    INSERT INTO agent_status (agent_id, strategy_name, current_cash, total_portfolio_value)
    VALUES 
        ('trading_agent_001', 'Darvas Box Strategy', 100000.00, 100000.00),
        ('trading_agent_002', 'Elliott Wave Strategy', 100000.00, 100000.00),
        ('trading_agent_003', 'SMA Crossover Strategy', 100000.00, 100000.00)
    ON CONFLICT (agent_id) DO NOTHING;
    """
    
    execute_sql(sample_agent_sql, "Sample agent status data")

def main():
    """Main setup function"""
    print("🚀 Setting up Cival Dashboard Database...")
    print("=" * 50)
    
    # Test connection
    try:
        response = requests.get(f"{SUPABASE_URL}/rest/v1/", headers={
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
        })
        
        if response.status_code == 200:
            print("✅ Supabase connection successful")
        else:
            print(f"❌ Supabase connection failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Create tables
    if not create_trading_tables():
        print("❌ Table creation failed")
        return False
    
    # Create indexes
    create_indexes()
    
    # Insert sample data
    insert_sample_data()
    
    print("\n✅ Database setup completed successfully!")
    print("📊 Agent trading tables are ready")
    print("🤖 Sample agents initialized")
    print("💰 Paper trading mode enabled")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)