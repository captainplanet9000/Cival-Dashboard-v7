"""
Complete Trading Agent Example with PydanticAI
"""
import asyncio
import aiohttp
from typing import Dict, Optional
from datetime import datetime
from pydantic_ai import Agent, RunContext
from pydantic import BaseModel
import numpy as np

class TradeDecision(BaseModel):
    action: str  # 'buy', 'sell', 'hold'
    symbol: str
    quantity: float
    price: Optional[float]
    reasoning: str
    confidence: float
    strategy: str

class MarketData(BaseModel):
    symbol: str
    price: float
    volume: float
    change_percent: float
    rsi: Optional[float]
    macd: Optional[Dict]
    timestamp: datetime

class SmartTradingAgent:
    def __init__(self, agent_id: str, api_url: str = "http://localhost:3000"):
        self.agent_id = agent_id
        self.api_url = api_url
        self.ws_url = "ws://localhost:3001"
        self.is_registered = False
        
        # Initialize PydanticAI agent
        self.ai_agent = Agent(
            'openai:gpt-4',  # or 'google-gla:gemini-1.5-pro'
            system_prompt="""You are an expert trading agent that makes decisions based on:
            1. Technical indicators (RSI, MACD, EMA)
            2. Market momentum and volume
            3. Risk management principles
            4. Current market conditions
            
            Always provide clear reasoning for your decisions and confidence levels.""",
            result_type=TradeDecision
        )
        
        # Register tools for the AI agent
        self._register_ai_tools()
