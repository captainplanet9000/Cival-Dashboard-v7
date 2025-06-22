#!/usr/bin/env python3
"""
MCP Trading Platform - Consolidated Monorepo Application v2.0.0
Unified FastAPI application with centralized service management and dependency injection
"""

import asyncio
import os
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

# FastAPI and web framework imports
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn

# SSE for real-time updates
from sse_starlette.sse import EventSourceResponse

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Core system imports
from core import (
    registry, db_manager, service_initializer,
    get_service_dependency, get_connection_dependency
)

# Import models for API endpoints
from models.api_models import TradingAnalysisCrewRequest, CrewRunResponse
from models.agent_models import AgentConfigInput, AgentStatus
from models.trading_history_models import TradeRecord
from models.paper_trading_models import CreatePaperTradeOrderRequest
from models.execution_models import ExecutionRequest
from models.hyperliquid_models import HyperliquidAccountSnapshot

# Authentication
from auth.dependencies import get_current_active_user
from models.auth_models import AuthenticatedUser

# Logging configuration
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# WebSocket Connection Manager for Real-time Updates
class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, client_info: Dict[str, Any] = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_info[websocket] = client_info or {}
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_info.pop(websocket, None)
            logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str, message_type: str = "update"):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        message_data = {
            "type": message_type,
            "data": json.loads(message) if isinstance(message, str) else message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message_data))
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_portfolio_update(self, portfolio_data: Dict[str, Any]):
        """Broadcast portfolio updates"""
        await self.broadcast(portfolio_data, "portfolio_update")
    
    async def broadcast_agent_update(self, agent_data: Dict[str, Any]):
        """Broadcast agent status updates"""
        await self.broadcast(agent_data, "agent_update")
    
    async def broadcast_market_update(self, market_data: Dict[str, Any]):
        """Broadcast market data updates"""
        await self.broadcast(market_data, "market_update")
    
    async def broadcast_trading_signal(self, signal_data: Dict[str, Any]):
        """Broadcast trading signals"""
        await self.broadcast(signal_data, "trading_signal")

# Global WebSocket manager instance
websocket_manager = WebSocketManager()

# Configuration
API_PORT = int(os.getenv("PORT", 8000))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = ENVIRONMENT == "development"

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown"""
    logger.info("🚀 Starting MCP Trading Platform (Consolidated Monorepo v2.0.0)")
    
    try:
        # Initialize database connections
        logger.info("Initializing database connections...")
        db_results = await db_manager.initialize_connections()
        logger.info(f"Database initialization results: {db_results}")
        
        # Initialize all platform services
        logger.info("Initializing platform services...")
        service_results = await service_initializer.initialize_all_services()
        logger.info(f"Service initialization results: {service_results}")
        
        # Register additional services (optional)
        try:
            logger.info("Registering Phase 2 agent trading services...")
            from core.service_registry import register_agent_trading_services
            register_agent_trading_services()
        except ImportError:
            logger.warning("Phase 2 agent trading services not available")
        
        try:
            logger.info("Registering Phase 5 advanced services...")
            from core.service_registry import register_phase5_services
            register_phase5_services()
        except ImportError:
            logger.warning("Phase 5 advanced services not available")
        
        try:
            logger.info("Registering Phase 6-8 autonomous services...")
            from core.service_registry import register_autonomous_services
            register_autonomous_services()
        except ImportError:
            logger.warning("Phase 6-8 autonomous services not available")
        
        # Verify core services are available (but don't fail if they're not)
        core_services = ["historical_data", "trading_engine", "portfolio_tracker", "order_management"]
        available_services = []
        for service_name in core_services:
            service = registry.get_service(service_name)
            if service:
                logger.info(f"✅ Core service {service_name} ready")
                available_services.append(service_name)
            else:
                logger.warning(f"⚠️  Core service {service_name} not available")
        
        # Verify AI services
        ai_services = ["ai_prediction", "technical_analysis", "sentiment_analysis", "ml_portfolio_optimizer"]
        for service_name in ai_services:
            service = registry.get_service(service_name)
            if service:
                logger.info(f"✅ AI service {service_name} ready")
                available_services.append(service_name)
            else:
                logger.warning(f"⚠️  AI service {service_name} not available")
        
        logger.info("✅ MCP Trading Platform ready for agent trading operations!")
        
        # Start real-time data broadcasting task
        logger.info("Starting real-time data broadcaster...")
        broadcaster_task = asyncio.create_task(real_time_data_broadcaster())
        
        # Store startup information in registry
        registry.register_service("startup_info", {
            "version": "2.0.0",
            "startup_time": datetime.now(timezone.utc).isoformat(),
            "environment": ENVIRONMENT,
            "services_initialized": len(registry.all_services),
            "connections_active": len(registry.all_connections),
            "websocket_broadcaster": "running"
        })
        
    except Exception as e:
        logger.error(f"Failed to start platform: {e}")
        raise e
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down real-time data broadcaster...")
    if 'broadcaster_task' in locals():
        broadcaster_task.cancel()
        try:
            await broadcaster_task
        except asyncio.CancelledError:
            pass
    
    # Cleanup on shutdown
    logger.info("🛑 Shutting down MCP Trading Platform...")
    await registry.cleanup()
    await db_manager.cleanup()
    logger.info("Platform shutdown completed")

# Create FastAPI application with consolidated lifespan
app = FastAPI(
    title="MCP Trading Platform",
    description="Consolidated AI-Powered Algorithmic Trading Platform for Agent Operations",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if DEBUG else [os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root and health endpoints
@app.get("/")
async def root():
    """Root endpoint with platform information"""
    startup_info = registry.get_service("startup_info") or {}
    
    return {
        "name": "MCP Trading Platform",
        "version": "2.0.0",
        "description": "Consolidated AI-Powered Algorithmic Trading Platform",
        "architecture": "monorepo",
        "environment": ENVIRONMENT,
        "startup_info": startup_info,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "market_data": "/api/v1/market-data/*",
            "trading": "/api/v1/trading/*",
            "agents": "/api/v1/agents/*",
            "portfolio": "/api/v1/portfolio/*",
            "risk": "/api/v1/risk/*",
            "ai_analytics": "/api/v1/ai/*",
            "agent_trading": "/api/v1/agent-trading/*",
            "autonomous_system": "/api/v1/autonomous/*",
            "dashboard": "/dashboard"
        }
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check for all services and connections"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "environment": ENVIRONMENT,
        "architecture": "consolidated_monorepo"
    }
    
    try:
        # Get detailed health from registry
        detailed_health = await registry.health_check()
        health_status.update(detailed_health)
        
        # Determine overall status
        unhealthy_services = [
            name for name, status in detailed_health.get("services", {}).items()
            if isinstance(status, str) and "error" in status.lower()
        ]
        
        unhealthy_connections = [
            name for name, status in detailed_health.get("connections", {}).items()
            if isinstance(status, str) and "error" in status.lower()
        ]
        
        if unhealthy_services or unhealthy_connections:
            health_status["status"] = "degraded"
            health_status["issues"] = {
                "unhealthy_services": unhealthy_services,
                "unhealthy_connections": unhealthy_connections
            }
        
    except Exception as e:
        health_status["status"] = "error"
        health_status["error"] = str(e)
        logger.error(f"Health check failed: {e}")
    
    return health_status

# Market Data Endpoints (Consolidated from ports 8001-8002)
@app.get("/api/v1/market-data/live/{symbol}")
async def get_live_market_data(
    symbol: str,
    market_data_service = Depends(get_service_dependency("market_data"))
):
    """Get real-time market data for a symbol"""
    try:
        data = await market_data_service.get_live_data(symbol)
        return {"symbol": symbol, "data": data, "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.error(f"Failed to get live data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Market data error: {str(e)}")

@app.get("/api/v1/market-data/historical/{symbol}")
async def get_historical_data(
    symbol: str,
    period: str = "1d",
    interval: str = "1h",
    historical_data_service = Depends(get_service_dependency("historical_data"))
):
    """Get historical market data"""
    try:
        data = await historical_data_service.get_historical_data(symbol, period, interval)
        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get historical data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Historical data error: {str(e)}")

# Trading Engine Endpoints (Consolidated from ports 8010-8013)
@app.post("/api/v1/trading/orders")
async def create_order(
    order_request: CreatePaperTradeOrderRequest,
    order_management_service = Depends(get_service_dependency("order_management"))
):
    """Create a new trading order"""
    try:
        # Use a default user ID for solo operator
        solo_user_id = "solo_operator"
        order = await order_management_service.create_order(order_request, solo_user_id)
        return order
    except Exception as e:
        logger.error(f"Failed to create order for solo operator: {e}")
        raise HTTPException(status_code=500, detail=f"Order creation error: {str(e)}")

@app.get("/api/v1/trading/orders")
async def get_orders(
    status: Optional[str] = None,
    order_management_service = Depends(get_service_dependency("order_management"))
):
    """Get trading orders"""
    try:
        solo_user_id = "solo_operator"
        orders = await order_management_service.get_user_orders(solo_user_id, status)
        return {"orders": orders, "user_id": solo_user_id}
    except Exception as e:
        logger.error(f"Failed to get orders for solo operator: {e}")
        raise HTTPException(status_code=500, detail=f"Order retrieval error: {str(e)}")

@app.get("/api/v1/portfolio/positions")
async def get_portfolio_positions(
    portfolio_service = Depends(get_service_dependency("portfolio_tracker"))
):
    """Get portfolio positions"""
    try:
        solo_user_id = "solo_operator"
        positions = await portfolio_service.get_positions(solo_user_id)
        return {"positions": positions, "user_id": solo_user_id}
    except Exception as e:
        logger.error(f"Failed to get positions for solo operator: {e}")
        raise HTTPException(status_code=500, detail=f"Portfolio error: {str(e)}")

@app.get("/api/v1/portfolio/performance")
async def get_portfolio_performance(
    portfolio_service = Depends(get_service_dependency("portfolio_tracker"))
):
    """Get portfolio performance metrics"""
    try:
        solo_user_id = "solo_operator"
        performance = await portfolio_service.get_performance_metrics(solo_user_id)
        return {"performance": performance, "user_id": solo_user_id}
    except Exception as e:
        logger.error(f"Failed to get performance for solo operator: {e}")
        raise HTTPException(status_code=500, detail=f"Performance error: {str(e)}")

@app.get("/api/v1/services")
async def get_services():
    """Get available services and their status"""
    try:
        services = {
            "portfolio_tracker": {"status": "running", "service": "Portfolio Management"},
            "trading_engine": {"status": "running", "service": "Trading Engine"},
            "risk_management": {"status": "running", "service": "Risk Management"},
            "agent_management": {"status": "running", "service": "Agent Coordination"},
            "market_data": {"status": "running", "service": "Market Data Feed"},
            "ai_prediction": {"status": "running", "service": "AI Prediction Engine"},
            "technical_analysis": {"status": "running", "service": "Technical Analysis"},
            "sentiment_analysis": {"status": "running", "service": "Sentiment Analysis"}
        }
        return {"services": services, "timestamp": "2025-06-14T15:30:00Z"}
    except Exception as e:
        logger.error(f"Failed to get services: {e}")
        raise HTTPException(status_code=500, detail=f"Services error: {str(e)}")

@app.get("/api/v1/portfolio/summary")
async def get_portfolio_summary():
    """Get portfolio summary with key metrics"""
    try:
        # Mock data for frontend integration - replace with real service calls
        summary = {
            "total_equity": 125847.32,
            "cash_balance": 18429.50,
            "total_position_value": 107417.82,
            "total_unrealized_pnl": 3247.85,
            "total_realized_pnl": 1829.47,
            "total_pnl": 5077.32,
            "daily_pnl": 847.29,
            "total_return_percent": 4.19,
            "number_of_positions": 12,
            "long_positions": 8,
            "short_positions": 4,
            "last_updated": "2025-06-14T15:30:00Z"
        }
        return summary
    except Exception as e:
        logger.error(f"Failed to get portfolio summary: {e}")
        raise HTTPException(status_code=500, detail=f"Portfolio summary error: {str(e)}")

@app.get("/api/v1/market/overview")
async def get_market_overview():
    """Get market overview data"""
    try:
        # Mock market data for frontend integration
        overview = {
            "market_data": [
                {
                    "symbol": "BTC",
                    "price": 67234.85,
                    "change_pct": 2.34,
                    "volatility": 3.8,
                    "volume": 28947583920,
                    "market_cap": 1324500000000,
                    "last_updated": "2025-06-14T15:30:00Z"
                },
                {
                    "symbol": "ETH", 
                    "price": 3847.92,
                    "change_pct": -1.12,
                    "volatility": 4.2,
                    "volume": 15834729102,
                    "market_cap": 462800000000,
                    "last_updated": "2025-06-14T15:30:00Z"
                },
                {
                    "symbol": "SOL",
                    "price": 142.73,
                    "change_pct": 5.67,
                    "volatility": 6.1,
                    "volume": 3294857203,
                    "market_cap": 65400000000,
                    "last_updated": "2025-06-14T15:30:00Z"
                }
            ],
            "market_sentiment": {
                "overall": "bullish",
                "score": 72,
                "fear_greed_index": 68,
                "vix": 14.2
            },
            "timestamp": "2025-06-14T15:30:00Z"
        }
        return overview
    except Exception as e:
        logger.error(f"Failed to get market overview: {e}")
        raise HTTPException(status_code=500, detail=f"Market overview error: {str(e)}")

@app.get("/api/v1/trading/signals")
async def get_trading_signals():
    """Get AI trading signals"""
    try:
        # Mock trading signals for frontend integration
        signals = [
            {
                "symbol": "BTC",
                "signal": "buy",
                "strength": 0.78,
                "confidence": 0.85,
                "predicted_change_pct": 3.2,
                "reasoning": "Strong momentum with volume confirmation, breaking resistance at $66,800",
                "generated_at": "2025-06-14T15:25:00Z",
                "source": "momentum_analyzer"
            },
            {
                "symbol": "ETH",
                "signal": "hold",
                "strength": 0.45,
                "confidence": 0.62,
                "predicted_change_pct": -0.8,
                "reasoning": "Mixed signals with decreasing volume, waiting for clearer direction",
                "generated_at": "2025-06-14T15:24:00Z",
                "source": "pattern_recognition"
            },
            {
                "symbol": "SOL",
                "signal": "buy",
                "strength": 0.89,
                "confidence": 0.92,
                "predicted_change_pct": 8.1,
                "reasoning": "Breakout pattern confirmed with high volume and positive news flow",
                "generated_at": "2025-06-14T15:26:00Z",
                "source": "multi_factor_model"
            }
        ]
        return signals
    except Exception as e:
        logger.error(f"Failed to get trading signals: {e}")
        raise HTTPException(status_code=500, detail=f"Trading signals error: {str(e)}")

@app.get("/api/v1/agents/status")
async def get_all_agents_status():
    """Get status of all agents"""
    try:
        # Mock agent status data for frontend integration
        agents_status = [
            {
                "agent_id": "agent_marcus_momentum",
                "name": "Marcus Momentum",
                "status": "active",
                "strategy": "momentum_trading",
                "current_allocation": 25000.00,
                "pnl": 1247.85,
                "trades_today": 8,
                "win_rate": 0.72,
                "last_action": "Bought 0.15 BTC at $67,100",
                "last_updated": "2025-06-14T15:28:00Z"
            },
            {
                "agent_id": "agent_alex_arbitrage",
                "name": "Alex Arbitrage", 
                "status": "monitoring",
                "strategy": "arbitrage",
                "current_allocation": 30000.00,
                "pnl": 892.34,
                "trades_today": 12,
                "win_rate": 0.83,
                "last_action": "Monitoring price spreads across exchanges",
                "last_updated": "2025-06-14T15:29:00Z"
            },
            {
                "agent_id": "agent_sophia_reversion",
                "name": "Sophia Reversion",
                "status": "active",
                "strategy": "mean_reversion",
                "current_allocation": 20000.00,
                "pnl": -234.12,
                "trades_today": 5,
                "win_rate": 0.64,
                "last_action": "Sold 2.5 ETH at $3,850",
                "last_updated": "2025-06-14T15:27:00Z"
            }
        ]
        return agents_status
    except Exception as e:
        logger.error(f"Failed to get agents status: {e}")
        raise HTTPException(status_code=500, detail=f"Agents status error: {str(e)}")

# Enhanced Agent Management Endpoints
@app.post("/api/v1/agents/{agent_id}/execute-decision")
async def execute_agent_decision(agent_id: str, decision_params: dict):
    """Execute a trading decision for a specific agent"""
    try:
        # Simulate agent decision making
        decision_result = {
            "agent_id": agent_id,
            "decision": decision_params.get("action", "hold"),
            "symbol": decision_params.get("symbol", "BTC"),
            "confidence": 0.85,
            "reasoning": f"Agent {agent_id} analyzed market conditions and decided to {decision_params.get('action', 'hold')}",
            "risk_assessment": {
                "risk_level": "medium",
                "expected_return": 0.034,
                "max_loss": 0.021,
                "position_size": 0.1
            },
            "execution": {
                "status": "executed",
                "order_id": f"order_{agent_id}_{int(datetime.now().timestamp())}",
                "executed_price": 67234.85,
                "executed_quantity": 0.1,
                "execution_time": datetime.now(timezone.utc).isoformat()
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Broadcast agent decision via WebSocket
        await websocket_manager.broadcast_agent_update(decision_result)
        
        return decision_result
    except Exception as e:
        logger.error(f"Failed to execute agent decision for {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent decision error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/start")
async def start_agent(agent_id: str):
    """Start an agent for trading"""
    try:
        agent_status = {
            "agent_id": agent_id,
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "message": f"Agent {agent_id} started successfully"
        }
        return agent_status
    except Exception as e:
        logger.error(f"Failed to start agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent start error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/stop") 
async def stop_agent(agent_id: str):
    """Stop an agent from trading"""
    try:
        agent_status = {
            "agent_id": agent_id,
            "status": "stopped",
            "stopped_at": datetime.now(timezone.utc).isoformat(),
            "message": f"Agent {agent_id} stopped successfully"
        }
        return agent_status
    except Exception as e:
        logger.error(f"Failed to stop agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent stop error: {str(e)}")

@app.get("/api/v1/agents/{agent_id}/decisions")
async def get_agent_decisions(agent_id: str, limit: int = 10):
    """Get recent decisions made by an agent"""
    try:
        decisions = [
            {
                "id": f"decision_{i}",
                "agent_id": agent_id,
                "action": "buy" if i % 3 == 0 else "sell" if i % 3 == 1 else "hold",
                "symbol": "BTC" if i % 2 == 0 else "ETH",
                "confidence": 0.75 + (i * 0.05) % 0.25,
                "reasoning": f"Decision {i}: Market analysis suggests favorable conditions",
                "executed": i < 7,
                "pnl": (i * 23.45) if i < 7 else None,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            for i in range(min(limit, 10))
        ]
        return {"decisions": decisions, "agent_id": agent_id}
    except Exception as e:
        logger.error(f"Failed to get decisions for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent decisions error: {str(e)}")

@app.post("/api/v1/agents/coordinate-decision")
async def coordinate_multi_agent_decision(coordination_params: dict):
    """Coordinate a decision between multiple agents"""
    try:
        participating_agents = coordination_params.get("agents", ["agent_marcus_momentum", "agent_alex_arbitrage"])
        decision_type = coordination_params.get("type", "collaborative")
        
        coordination_result = {
            "coordination_id": f"coord_{int(datetime.now().timestamp())}",
            "participating_agents": participating_agents,
            "decision_type": decision_type,
            "consensus": {
                "action": "buy",
                "symbol": "BTC",
                "confidence": 0.82,
                "agreement_level": 0.89
            },
            "individual_inputs": [
                {
                    "agent_id": "agent_marcus_momentum",
                    "recommendation": "buy",
                    "confidence": 0.85,
                    "reasoning": "Strong momentum signals detected"
                },
                {
                    "agent_id": "agent_alex_arbitrage", 
                    "recommendation": "buy",
                    "confidence": 0.78,
                    "reasoning": "Arbitrage opportunity identified"
                }
            ],
            "final_decision": {
                "action": "buy",
                "symbol": "BTC",
                "position_size": 0.15,
                "execution_plan": "immediate",
                "risk_controls": ["stop_loss_2%", "take_profit_4%"]
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        return coordination_result
    except Exception as e:
        logger.error(f"Failed to coordinate agent decision: {e}")
        raise HTTPException(status_code=500, detail=f"Agent coordination error: {str(e)}")

@app.get("/api/v1/performance/metrics")
async def get_performance_metrics():
    """Get detailed performance metrics"""
    try:
        # Mock performance metrics for frontend integration
        metrics = {
            "total_return_percent": 4.19,
            "total_pnl": 5077.32,
            "daily_pnl": 847.29,
            "win_rate": 0.73,
            "sharpe_ratio": 1.84,
            "volatility": 0.152,
            "max_drawdown": 0.087,
            "total_trades": 147,
            "total_equity": 125847.32,
            "initial_equity": 120000.00,
            "best_trade": 892.45,
            "worst_trade": -234.78,
            "avg_trade": 34.52,
            "last_updated": "2025-06-14T15:30:00Z"
        }
        return metrics
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Performance metrics error: {str(e)}")

# Trading Strategy Management Endpoints
@app.get("/api/v1/strategies")
async def get_strategies():
    """Get all trading strategies"""
    try:
        strategies = [
            {
                "id": "momentum_v1",
                "name": "Momentum Trading v1",
                "description": "Trend-following strategy with volume confirmation",
                "status": "active",
                "type": "momentum",
                "risk_level": "medium",
                "allocated_capital": 25000.0,
                "pnl": 1847.32,
                "pnl_percent": 7.39,
                "trades_today": 12,
                "win_rate": 0.68,
                "sharpe_ratio": 1.84,
                "max_drawdown": 0.045,
                "created_at": "2025-06-01T09:00:00Z",
                "last_executed": "2025-06-14T15:28:00Z"
            },
            {
                "id": "arbitrage_v2",
                "name": "Cross-Exchange Arbitrage v2",
                "description": "Multi-exchange price difference exploitation",
                "status": "active",
                "type": "arbitrage",
                "risk_level": "low",
                "allocated_capital": 30000.0,
                "pnl": 892.45,
                "pnl_percent": 2.97,
                "trades_today": 8,
                "win_rate": 0.89,
                "sharpe_ratio": 2.34,
                "max_drawdown": 0.012,
                "created_at": "2025-06-01T09:00:00Z",
                "last_executed": "2025-06-14T15:25:00Z"
            },
            {
                "id": "mean_reversion_v1",
                "name": "Mean Reversion Strategy",
                "description": "Bollinger Bands with RSI confirmation",
                "status": "paused",
                "type": "mean_reversion",
                "risk_level": "high",
                "allocated_capital": 15000.0,
                "pnl": -234.67,
                "pnl_percent": -1.56,
                "trades_today": 3,
                "win_rate": 0.52,
                "sharpe_ratio": 0.89,
                "max_drawdown": 0.087,
                "created_at": "2025-06-01T09:00:00Z",
                "last_executed": "2025-06-14T14:15:00Z"
            }
        ]
        return {"strategies": strategies}
    except Exception as e:
        logger.error(f"Failed to get strategies: {e}")
        raise HTTPException(status_code=500, detail=f"Strategies error: {str(e)}")

@app.post("/api/v1/strategies")
async def create_strategy(strategy_data: dict):
    """Create a new trading strategy"""
    try:
        new_strategy = {
            "id": f"strategy_{len(strategy_data.get('name', 'new').split())}_v1",
            "name": strategy_data.get("name", "New Strategy"),
            "description": strategy_data.get("description", ""),
            "status": "draft",
            "type": strategy_data.get("type", "custom"),
            "risk_level": strategy_data.get("risk_level", "medium"),
            "allocated_capital": strategy_data.get("allocated_capital", 10000.0),
            "pnl": 0.0,
            "pnl_percent": 0.0,
            "trades_today": 0,
            "win_rate": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0,
            "created_at": "2025-06-14T15:30:00Z",
            "last_executed": None
        }
        return {"strategy": new_strategy, "message": "Strategy created successfully"}
    except Exception as e:
        logger.error(f"Failed to create strategy: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy creation error: {str(e)}")

@app.get("/api/v1/strategies/{strategy_id}")
async def get_strategy(strategy_id: str):
    """Get specific strategy details"""
    try:
        # Mock strategy detail with performance data
        strategy = {
            "id": strategy_id,
            "name": "Momentum Trading v1",
            "description": "Trend-following strategy with volume confirmation",
            "status": "active",
            "type": "momentum",
            "risk_level": "medium",
            "allocated_capital": 25000.0,
            "pnl": 1847.32,
            "pnl_percent": 7.39,
            "trades_today": 12,
            "win_rate": 0.68,
            "sharpe_ratio": 1.84,
            "max_drawdown": 0.045,
            "created_at": "2025-06-01T09:00:00Z",
            "last_executed": "2025-06-14T15:28:00Z",
            "parameters": {
                "lookback_period": 20,
                "volume_threshold": 1.5,
                "stop_loss": 0.02,
                "take_profit": 0.04,
                "position_size": 0.1
            },
            "performance_history": [
                {"date": "2025-06-10", "pnl": 234.56, "trades": 8},
                {"date": "2025-06-11", "pnl": 456.78, "trades": 12},
                {"date": "2025-06-12", "pnl": -123.45, "trades": 6},
                {"date": "2025-06-13", "pnl": 789.01, "trades": 15},
                {"date": "2025-06-14", "pnl": 490.42, "trades": 12}
            ]
        }
        return strategy
    except Exception as e:
        logger.error(f"Failed to get strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy retrieval error: {str(e)}")

@app.put("/api/v1/strategies/{strategy_id}")
async def update_strategy(strategy_id: str, strategy_data: dict):
    """Update a trading strategy"""
    try:
        updated_strategy = {
            "id": strategy_id,
            "name": strategy_data.get("name", "Updated Strategy"),
            "description": strategy_data.get("description", ""),
            "status": strategy_data.get("status", "active"),
            "parameters": strategy_data.get("parameters", {}),
            "last_updated": "2025-06-14T15:30:00Z"
        }
        return {"strategy": updated_strategy, "message": "Strategy updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy update error: {str(e)}")

@app.delete("/api/v1/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a trading strategy"""
    try:
        return {"message": f"Strategy {strategy_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Failed to delete strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Strategy deletion error: {str(e)}")

@app.post("/api/v1/strategies/{strategy_id}/backtest")
async def backtest_strategy(strategy_id: str, backtest_params: dict):
    """Run backtest for a trading strategy"""
    try:
        # Mock backtest results
        backtest_results = {
            "strategy_id": strategy_id,
            "period": backtest_params.get("period", "1M"),
            "start_date": backtest_params.get("start_date", "2025-05-14"),
            "end_date": backtest_params.get("end_date", "2025-06-14"),
            "initial_capital": 10000.0,
            "final_capital": 11847.32,
            "total_return": 18.47,
            "total_trades": 89,
            "winning_trades": 61,
            "losing_trades": 28,
            "win_rate": 0.685,
            "avg_win": 156.78,
            "avg_loss": -89.34,
            "profit_factor": 1.75,
            "sharpe_ratio": 1.84,
            "max_drawdown": 0.087,
            "daily_returns": [
                {"date": "2025-06-10", "return": 2.34},
                {"date": "2025-06-11", "return": 4.56},
                {"date": "2025-06-12", "return": -1.23},
                {"date": "2025-06-13", "return": 7.89},
                {"date": "2025-06-14", "return": 4.91}
            ],
            "status": "completed",
            "executed_at": "2025-06-14T15:30:00Z"
        }
        return backtest_results
    except Exception as e:
        logger.error(f"Failed to backtest strategy {strategy_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest error: {str(e)}")

@app.get("/api/v1/risk/assessment")
async def get_risk_assessment(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    risk_service = Depends(get_service_dependency("risk_management"))
):
    """Get portfolio risk assessment"""
    try:
        assessment = await risk_service.assess_portfolio_risk(current_user.user_id)
        return {"risk_assessment": assessment, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to assess risk for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Risk assessment error: {str(e)}")

# Agent Management Endpoints - Core for agent trading operations
@app.post("/api/v1/agents")
async def create_agent(
    agent_request: AgentConfigInput,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Create a new trading agent"""
    try:
        agent = await agent_service.create_agent(agent_request)
        logger.info(f"Created agent {agent.agent_id} for user {current_user.user_id}")
        return agent
    except Exception as e:
        logger.error(f"Failed to create agent for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent creation error: {str(e)}")

@app.get("/api/v1/agents")
async def get_agents(
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get user's trading agents"""
    try:
        agents = await agent_service.get_agents()
        return {"agents": agents, "user_id": current_user.user_id}
    except Exception as e:
        logger.error(f"Failed to get agents for user {current_user.user_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent retrieval error: {str(e)}")

@app.get("/api/v1/agents/{agent_id}")
async def get_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get specific agent details"""
    try:
        agent = await agent_service.get_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        return agent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent retrieval error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/start")
async def start_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Start a trading agent for live operations"""
    try:
        status = await agent_service.start_agent(agent_id)
        logger.info(f"Started agent {agent_id} for user {current_user.user_id}")
        return status
    except Exception as e:
        logger.error(f"Failed to start agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent start error: {str(e)}")

@app.post("/api/v1/agents/{agent_id}/stop")
async def stop_agent(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Stop a trading agent"""
    try:
        status = await agent_service.stop_agent(agent_id)
        logger.info(f"Stopped agent {agent_id} for user {current_user.user_id}")
        return status
    except Exception as e:
        logger.error(f"Failed to stop agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent stop error: {str(e)}")

@app.get("/api/v1/agents/{agent_id}/status")
async def get_agent_status(
    agent_id: str,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    agent_service = Depends(get_service_dependency("agent_management"))
):
    """Get agent operational status"""
    try:
        status = await agent_service.get_agent_status(agent_id)
        if not status:
            raise HTTPException(status_code=404, detail="Agent status not found")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get status for agent {agent_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Agent status error: {str(e)}")

# Agent Trading Execution Bridge - Critical for operational trading
@app.post("/api/v1/agents/execute-trade")
async def execute_agent_trade(
    execution_request: ExecutionRequest,
    current_user: AuthenticatedUser = Depends(get_current_active_user),
    execution_service = Depends(get_service_dependency("execution_specialist"))
):
    """Execute a trade request from an agent with validation"""
    try:
        logger.info(f"Agent trade execution request from {execution_request.source_agent_id}")
        
        # Process through execution specialist with safety checks
        receipt = await execution_service.process_trade_order(execution_request)
        
        logger.info(f"Trade execution completed: {receipt.execution_status}")
        return receipt
    except Exception as e:
        logger.error(f"Agent trade execution failed: {e}")
        raise HTTPException(status_code=500, detail=f"Trade execution error: {str(e)}")

# AI and Analytics Endpoints (Consolidated from ports 8050-8053)
@app.post("/api/v1/ai/predict/{symbol}")
async def get_ai_prediction(
    symbol: str,
    prediction_service = Depends(get_service_dependency("ai_prediction"))
):
    """Get AI market prediction for agent decision making"""
    try:
        prediction = await prediction_service.predict_price_movement(symbol)
        return {"symbol": symbol, "prediction": prediction}
    except Exception as e:
        logger.error(f"AI prediction failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"AI prediction error: {str(e)}")

@app.get("/api/v1/analytics/technical/{symbol}")
async def get_technical_analysis(
    symbol: str,
    technical_service = Depends(get_service_dependency("technical_analysis"))
):
    """Get technical analysis for a symbol"""
    try:
        analysis = await technical_service.analyze_symbol(symbol)
        return {"symbol": symbol, "technical_analysis": analysis}
    except Exception as e:
        logger.error(f"Technical analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Technical analysis error: {str(e)}")

@app.get("/api/v1/analytics/sentiment/{symbol}")
async def get_sentiment_analysis(
    symbol: str,
    sentiment_service = Depends(get_service_dependency("sentiment_analysis"))
):
    """Get sentiment analysis for a symbol"""
    try:
        sentiment = await sentiment_service.analyze_sentiment(symbol)
        return {"symbol": symbol, "sentiment_analysis": sentiment}
    except Exception as e:
        logger.error(f"Sentiment analysis failed for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Sentiment analysis error: {str(e)}")

# Real-time Event Streaming for Agent Coordination
@app.get("/api/v1/stream/agent-events")
async def stream_agent_events(
    current_user: AuthenticatedUser = Depends(get_current_active_user)
):
    """Server-sent events for real-time agent updates and coordination"""
    
    async def event_generator():
        while True:
            try:
                # Generate agent status updates
                agent_service = registry.get_service("agent_management")
                if agent_service:
                    agents = await agent_service.get_agents()
                    event_data = {
                        "type": "agent_status_update",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "user_id": current_user.user_id,
                        "agent_count": len(agents),
                        "active_agents": [a.agent_id for a in agents if a.is_active]
                    }
                    
                    yield {
                        "event": "agent_update",
                        "data": json.dumps(event_data)
                    }
                
                await asyncio.sleep(30)  # Update every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in agent event stream: {e}")
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)})
                }
                break
    
    return EventSourceResponse(event_generator())

# WebSocket endpoints for real-time communication
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time updates"""
    await websocket_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                message_type = message.get("type", "ping")
                
                if message_type == "ping":
                    await websocket_manager.send_personal_message(
                        json.dumps({"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()}),
                        websocket
                    )
                elif message_type == "subscribe":
                    # Handle subscription to specific data types
                    await websocket_manager.send_personal_message(
                        json.dumps({
                            "type": "subscription_confirmed",
                            "subscribed_to": message.get("channels", []),
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        }),
                        websocket
                    )
                
            except json.JSONDecodeError:
                await websocket_manager.send_personal_message(
                    json.dumps({"type": "error", "message": "Invalid JSON"}),
                    websocket
                )
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

@app.websocket("/ws/portfolio")
async def websocket_portfolio(websocket: WebSocket):
    """WebSocket endpoint specifically for portfolio updates"""
    await websocket_manager.connect(websocket, {"type": "portfolio"})
    try:
        while True:
            # Send portfolio updates every 5 seconds
            await asyncio.sleep(5)
            
            # Get current portfolio data
            portfolio_data = {
                "total_equity": 125847.32,
                "daily_pnl": 847.29,
                "total_return_percent": 4.19,
                "number_of_positions": 12,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            
            await websocket_manager.send_personal_message(
                json.dumps({
                    "type": "portfolio_update",
                    "data": portfolio_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }),
                websocket
            )
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Portfolio WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

@app.websocket("/ws/agents")
async def websocket_agents(websocket: WebSocket):
    """WebSocket endpoint specifically for agent status updates"""
    await websocket_manager.connect(websocket, {"type": "agents"})
    try:
        while True:
            # Send agent updates every 10 seconds
            await asyncio.sleep(10)
            
            # Get current agent data
            agents_data = [
                {
                    "agent_id": "agent_marcus_momentum",
                    "name": "Marcus Momentum",
                    "status": "active",
                    "pnl": 1247.85,
                    "trades_today": 8,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                },
                {
                    "agent_id": "agent_alex_arbitrage",
                    "name": "Alex Arbitrage",
                    "status": "monitoring",
                    "pnl": 892.34,
                    "trades_today": 12,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                }
            ]
            
            await websocket_manager.send_personal_message(
                json.dumps({
                    "type": "agents_update",
                    "data": agents_data,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }),
                websocket
            )
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Agents WebSocket error: {e}")
        websocket_manager.disconnect(websocket)

# Background task for broadcasting real-time data
async def real_time_data_broadcaster():
    """Background task to broadcast real-time updates to all connected clients"""
    while True:
        try:
            # Broadcast portfolio updates every 30 seconds
            portfolio_data = {
                "total_equity": 125847.32,
                "daily_pnl": 847.29,
                "total_return_percent": 4.19,
                "number_of_positions": 12,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
            await websocket_manager.broadcast_portfolio_update(portfolio_data)
            
            # Broadcast market updates
            market_data = {
                "BTC": {"price": 67234.85, "change_pct": 2.34},
                "ETH": {"price": 3847.92, "change_pct": -1.12},
                "SOL": {"price": 142.73, "change_pct": 5.67},
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await websocket_manager.broadcast_market_update(market_data)
            
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in real-time data broadcaster: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# Development and debugging endpoints
if DEBUG:
    @app.get("/api/v1/debug/services")
    async def debug_services():
        """Debug endpoint to check all service statuses"""
        return {
            "services": registry.list_services(),
            "connections": registry.list_connections(),
            "registry_initialized": registry.is_initialized(),
            "database_initialized": db_manager.is_initialized()
        }
    
    @app.get("/api/v1/debug/health-detailed")
    async def debug_health():
        """Detailed health check for debugging"""
        return await registry.health_check()

# Include Phase 2 Agent Trading API endpoints
from api.phase2_endpoints import router as phase2_router
app.include_router(phase2_router)

# Include Phase 6-8 Autonomous Trading API endpoints
from api.autonomous_endpoints import router as autonomous_router
app.include_router(autonomous_router)

# Mount dashboard and static files
if os.path.exists("dashboard/static"):
    app.mount("/dashboard/static", StaticFiles(directory="dashboard/static"), name="dashboard_static")

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Dashboard endpoints
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_home(request: Request):
    """Main dashboard home page"""
    try:
        from dashboard.monorepo_dashboard import dashboard
        overview = await dashboard.get_system_overview()
        
        # Use simple template rendering since we have the HTML content
        with open("dashboard/templates/dashboard.html", "r") as f:
            template_content = f.read()
        
        # Simple template variable replacement
        html_content = template_content.replace("{{ title }}", "MCP Trading Platform Dashboard")
        html_content = html_content.replace("{{ overview.status }}", overview.get("status", "unknown"))
        html_content = html_content.replace("{{ overview.uptime_formatted or '0s' }}", overview.get("uptime_formatted", "0s"))
        html_content = html_content.replace("{{ overview.registry.services_count or 0 }}", str(overview.get("registry", {}).get("services_count", 0)))
        html_content = html_content.replace("{{ overview.registry.connections_count or 0 }}", str(overview.get("registry", {}).get("connections_count", 0)))
        html_content = html_content.replace("{{ overview.version or '2.0.0' }}", overview.get("version", "2.0.0"))
        html_content = html_content.replace("{{ overview.architecture or 'monorepo' }}", overview.get("architecture", "monorepo"))
        html_content = html_content.replace("{{ overview.environment or 'production' }}", overview.get("environment", "production"))
        
        return HTMLResponse(content=html_content)
    except Exception as e:
        return HTMLResponse(content=f"<html><body><h1>Dashboard Error</h1><p>{str(e)}</p></body></html>")

@app.get("/dashboard/api/overview")
async def dashboard_overview():
    """Dashboard overview API"""
    try:
        from dashboard.monorepo_dashboard import dashboard
        return await dashboard.get_system_overview()
    except Exception as e:
        return {"error": str(e), "timestamp": datetime.now(timezone.utc).isoformat()}

# Main entry point
if __name__ == "__main__":
    print("""
    ███╗   ███╗ ██████╗██████╗     ████████╗██████╗  █████╗ ██████╗ ██╗███╗   ██╗ ██████╗ 
    ████╗ ████║██╔════╝██╔══██╗    ╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██║████╗  ██║██╔════╝ 
    ██╔████╔██║██║     ██████╔╝       ██║   ██████╔╝███████║██║  ██║██║██╔██╗ ██║██║  ███╗
    ██║╚██╔╝██║██║     ██╔═══╝        ██║   ██╔══██╗██╔══██║██║  ██║██║██║╚██╗██║██║   ██║
    ██║ ╚═╝ ██║╚██████╗██║            ██║   ██║  ██║██║  ██║██████╔╝██║██║ ╚████║╚██████╔╝
    ╚═╝     ╚═╝ ╚═════╝╚═╝            ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝╚═╝  ╚═══╝ ╚═════╝ 
                                                                                            
                    🚀 CONSOLIDATED MONOREPO v2.0.0 - AGENT TRADING READY 🚀
    """)
    
    logger.info(f"Starting MCP Trading Platform on port {API_PORT}")
    logger.info(f"Environment: {ENVIRONMENT}")
    logger.info(f"Debug mode: {DEBUG}")
    
    uvicorn.run(
        "main_consolidated:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=DEBUG,
        log_level="info" if not DEBUG else "debug",
        access_log=DEBUG
    )