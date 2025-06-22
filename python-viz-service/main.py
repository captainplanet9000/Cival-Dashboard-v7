from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import plotly.graph_objects as go
import plotly.express as px
import plotly.utils
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import asyncio
import uvicorn
import json
import redis
from contextlib import asynccontextmanager

# Data Models
class MarketDataPoint(BaseModel):
    timestamp: datetime
    symbol: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class PortfolioData(BaseModel):
    timestamp: datetime
    total_value: float
    realized_pnl: float
    unrealized_pnl: float
    cash_balance: float

class StrategyPerformance(BaseModel):
    strategy_id: str
    name: str
    total_return: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    trades: int

class RiskMetrics(BaseModel):
    var_95: float
    var_99: float
    expected_shortfall: float
    correlation_risk: float
    concentration_risk: float
    current_drawdown: float

class ChartRequest(BaseModel):
    chart_type: str
    symbols: Optional[List[str]] = None
    timeframe: Optional[str] = "1d"
    strategy_ids: Optional[List[str]] = None
    theme: Optional[str] = "dark"

# Redis for real-time data caching
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Cival Visualization Service...")
    yield
    # Shutdown
    print("🛑 Shutting down Visualization Service...")

app = FastAPI(
    title="Cival Dashboard Visualization Service",
    description="Advanced Python-powered charts for algorithmic trading",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],  # Your Next.js apps
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chart styling
def get_chart_theme(theme: str = "dark"):
    if theme == "dark":
        return {
            "layout": {
                "paper_bgcolor": "#0f172a",
                "plot_bgcolor": "#1e293b",
                "font": {"color": "#e2e8f0"},
                "colorway": ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#f97316"],
                "grid": {"color": "#374151"},
                "xaxis": {
                    "gridcolor": "#374151",
                    "color": "#9ca3af"
                },
                "yaxis": {
                    "gridcolor": "#374151",
                    "color": "#9ca3af"
                }
            }
        }
    return {}

# Chart Generation Functions
def create_portfolio_performance_chart(data: List[PortfolioData], theme: str = "dark"):
    df = pd.DataFrame([d.dict() for d in data])
    
    fig = go.Figure()
    
    # Portfolio value line
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['total_value'],
        mode='lines',
        name='Portfolio Value',
        line=dict(color='#3b82f6', width=3),
        hovertemplate='<b>%{y:$,.2f}</b><br>%{x}<extra></extra>'
    ))
    
    # PnL area chart
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['realized_pnl'] + df['unrealized_pnl'],
        mode='lines',
        fill='tonexty',
        name='Total PnL',
        line=dict(color='#10b981' if (df['realized_pnl'] + df['unrealized_pnl']).iloc[-1] > 0 else '#ef4444'),
        fillcolor='rgba(16, 185, 129, 0.1)' if (df['realized_pnl'] + df['unrealized_pnl']).iloc[-1] > 0 else 'rgba(239, 68, 68, 0.1)',
    ))
    
    theme_config = get_chart_theme(theme)
    fig.update_layout(
        title="Portfolio Performance",
        xaxis_title="Time",
        yaxis_title="Value ($)",
        hovermode='x unified',
        **theme_config["layout"]
    )
    
    return fig.to_json()

def create_candlestick_chart(data: List[MarketDataPoint], symbol: str, theme: str = "dark"):
    df = pd.DataFrame([d.dict() for d in data])
    df = df[df['symbol'] == symbol].sort_values('timestamp')
    
    fig = go.Figure()
    
    # Candlestick chart
    fig.add_trace(go.Candlestick(
        x=df['timestamp'],
        open=df['open'],
        high=df['high'],
        low=df['low'],
        close=df['close'],
        name=symbol,
        increasing_line_color='#10b981',
        decreasing_line_color='#ef4444'
    ))
    
    # Volume bar chart
    fig.add_trace(go.Bar(
        x=df['timestamp'],
        y=df['volume'],
        name='Volume',
        yaxis='y2',
        opacity=0.3,
        marker_color='#6b7280'
    ))
    
    theme_config = get_chart_theme(theme)
    fig.update_layout(
        title=f"{symbol} Price Chart",
        xaxis_title="Time",
        yaxis=dict(title="Price ($)", side='left'),
        yaxis2=dict(title="Volume", side='right', overlaying='y'),
        **theme_config["layout"]
    )
    
    return fig.to_json()

def create_strategy_comparison_chart(strategies: List[StrategyPerformance], theme: str = "dark"):
    df = pd.DataFrame([s.dict() for s in strategies])
    
    fig = go.Figure()
    
    # Return vs Risk scatter
    fig.add_trace(go.Scatter(
        x=df['max_drawdown'],
        y=df['total_return'],
        mode='markers+text',
        text=df['name'],
        textposition='top center',
        marker=dict(
            size=df['trades'] / 2,  # Size based on number of trades
            color=df['sharpe_ratio'],
            colorscale='Viridis',
            showscale=True,
            colorbar=dict(title="Sharpe Ratio")
        ),
        hovertemplate='<b>%{text}</b><br>' +
                      'Return: %{y:.2f}%<br>' +
                      'Max Drawdown: %{x:.2f}%<br>' +
                      'Sharpe: %{marker.color:.2f}<br>' +
                      'Trades: %{marker.size}<extra></extra>'
    ))
    
    theme_config = get_chart_theme(theme)
    fig.update_layout(
        title="Strategy Performance Comparison",
        xaxis_title="Max Drawdown (%)",
        yaxis_title="Total Return (%)",
        **theme_config["layout"]
    )
    
    return fig.to_json()

def create_risk_heatmap(risk_data: Dict[str, RiskMetrics], theme: str = "dark"):
    strategies = list(risk_data.keys())
    metrics = ['var_95', 'var_99', 'expected_shortfall', 'correlation_risk', 'concentration_risk']
    
    # Create matrix
    z_data = []
    for metric in metrics:
        row = [getattr(risk_data[strategy], metric) for strategy in strategies]
        z_data.append(row)
    
    fig = go.Figure(data=go.Heatmap(
        z=z_data,
        x=strategies,
        y=['VaR 95%', 'VaR 99%', 'Expected Shortfall', 'Correlation Risk', 'Concentration Risk'],
        colorscale='RdYlBu_r',
        hoverongaps=False,
        hovertemplate='<b>%{y}</b><br>%{x}<br>Value: %{z:.3f}<extra></extra>'
    ))
    
    theme_config = get_chart_theme(theme)
    fig.update_layout(
        title="Risk Metrics Heatmap",
        **theme_config["layout"]
    )
    
    return fig.to_json()

def create_real_time_pnl_chart(pnl_data: List[Dict], theme: str = "dark"):
    df = pd.DataFrame(pnl_data)
    
    fig = go.Figure()
    
    # Realized PnL
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['realized_pnl'].cumsum(),
        mode='lines',
        name='Realized PnL',
        line=dict(color='#10b981', width=2)
    ))
    
    # Unrealized PnL
    fig.add_trace(go.Scatter(
        x=df['timestamp'],
        y=df['unrealized_pnl'],
        mode='lines',
        name='Unrealized PnL',
        line=dict(color='#f59e0b', width=2, dash='dash')
    ))
    
    # Zero line
    fig.add_hline(y=0, line_dash="dot", line_color="#6b7280")
    
    theme_config = get_chart_theme(theme)
    fig.update_layout(
        title="Real-time P&L",
        xaxis_title="Time",
        yaxis_title="P&L ($)",
        **theme_config["layout"]
    )
    
    return fig.to_json()

# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "cival-visualization"}

@app.post("/api/charts/portfolio-performance")
async def get_portfolio_chart(request: ChartRequest):
    try:
        # Get data from Redis cache or mock data
        cached_data = redis_client.get("portfolio_data")
        if cached_data:
            portfolio_data = [PortfolioData(**item) for item in json.loads(cached_data)]
        else:
            # Mock data for demonstration
            portfolio_data = generate_mock_portfolio_data()
        
        chart_json = create_portfolio_performance_chart(portfolio_data, request.theme)
        return {"chart": chart_json, "type": "portfolio_performance"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/charts/candlestick")
async def get_candlestick_chart(request: ChartRequest):
    try:
        if not request.symbols:
            raise HTTPException(status_code=400, detail="Symbols required for candlestick chart")
        
        symbol = request.symbols[0]
        # Get market data from cache or mock
        market_data = generate_mock_market_data(symbol)
        
        chart_json = create_candlestick_chart(market_data, symbol, request.theme)
        return {"chart": chart_json, "type": "candlestick", "symbol": symbol}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/charts/strategy-comparison")
async def get_strategy_comparison_chart(request: ChartRequest):
    try:
        # Mock strategy data
        strategies = generate_mock_strategy_data()
        
        chart_json = create_strategy_comparison_chart(strategies, request.theme)
        return {"chart": chart_json, "type": "strategy_comparison"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/charts/risk-heatmap")
async def get_risk_heatmap_chart(request: ChartRequest):
    try:
        # Mock risk data
        risk_data = generate_mock_risk_data()
        
        chart_json = create_risk_heatmap(risk_data, request.theme)
        return {"chart": chart_json, "type": "risk_heatmap"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/charts/real-time-pnl")
async def get_real_time_pnl_chart(request: ChartRequest):
    try:
        # Get real-time PnL data
        pnl_data = generate_mock_pnl_data()
        
        chart_json = create_real_time_pnl_chart(pnl_data, request.theme)
        return {"chart": chart_json, "type": "real_time_pnl"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Mock data generators (replace with real data sources)
def generate_mock_portfolio_data() -> List[PortfolioData]:
    base_time = datetime.now() - timedelta(days=30)
    data = []
    base_value = 100000
    
    for i in range(30 * 24):  # 30 days of hourly data
        timestamp = base_time + timedelta(hours=i)
        # Simulate portfolio growth with some volatility
        change = np.random.normal(0.001, 0.02)
        base_value *= (1 + change)
        
        data.append(PortfolioData(
            timestamp=timestamp,
            total_value=base_value,
            realized_pnl=np.random.normal(1000, 500),
            unrealized_pnl=np.random.normal(500, 300),
            cash_balance=10000
        ))
    
    return data

def generate_mock_market_data(symbol: str) -> List[MarketDataPoint]:
    base_time = datetime.now() - timedelta(days=7)
    data = []
    base_price = 150.0
    
    for i in range(7 * 24 * 12):  # 7 days of 5-minute data
        timestamp = base_time + timedelta(minutes=i*5)
        
        # Simulate price movement
        change = np.random.normal(0, 0.01)
        base_price *= (1 + change)
        
        high = base_price * (1 + abs(np.random.normal(0, 0.005)))
        low = base_price * (1 - abs(np.random.normal(0, 0.005)))
        open_price = base_price + np.random.normal(0, 0.5)
        close_price = base_price + np.random.normal(0, 0.5)
        
        data.append(MarketDataPoint(
            timestamp=timestamp,
            symbol=symbol,
            open=open_price,
            high=max(high, open_price, close_price),
            low=min(low, open_price, close_price),
            close=close_price,
            volume=np.random.randint(1000, 10000)
        ))
    
    return data

def generate_mock_strategy_data() -> List[StrategyPerformance]:
    return [
        StrategyPerformance(
            strategy_id="1",
            name="Darvas Box",
            total_return=12.5,
            sharpe_ratio=1.8,
            max_drawdown=8.2,
            win_rate=65.0,
            trades=45
        ),
        StrategyPerformance(
            strategy_id="2",
            name="Williams Alligator",
            total_return=9.8,
            sharpe_ratio=1.4,
            max_drawdown=12.1,
            win_rate=58.0,
            trades=62
        ),
        StrategyPerformance(
            strategy_id="3",
            name="Elliott Wave",
            total_return=15.2,
            sharpe_ratio=2.1,
            max_drawdown=6.5,
            win_rate=72.0,
            trades=28
        )
    ]

def generate_mock_risk_data() -> Dict[str, RiskMetrics]:
    return {
        "Strategy A": RiskMetrics(
            var_95=0.05,
            var_99=0.08,
            expected_shortfall=0.12,
            correlation_risk=0.35,
            concentration_risk=0.45,
            current_drawdown=0.03
        ),
        "Strategy B": RiskMetrics(
            var_95=0.07,
            var_99=0.11,
            expected_shortfall=0.15,
            correlation_risk=0.28,
            concentration_risk=0.38,
            current_drawdown=0.05
        ),
        "Strategy C": RiskMetrics(
            var_95=0.04,
            var_99=0.06,
            expected_shortfall=0.09,
            correlation_risk=0.42,
            concentration_risk=0.52,
            current_drawdown=0.02
        )
    }

def generate_mock_pnl_data() -> List[Dict]:
    base_time = datetime.now() - timedelta(hours=6)
    data = []
    
    for i in range(360):  # 6 hours of minute data
        timestamp = base_time + timedelta(minutes=i)
        data.append({
            "timestamp": timestamp,
            "realized_pnl": np.random.normal(50, 20),
            "unrealized_pnl": np.random.normal(0, 100)
        })
    
    return data

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True) 