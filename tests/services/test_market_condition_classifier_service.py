import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import List, Dict, Any, Optional

from python_ai_services.services.market_condition_classifier_service import MarketConditionClassifierService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.event_bus_models import Event, MarketConditionEventPayload
from python_ai_services.models.learning_models import LearningLogEntry
from datetime import datetime, timezone, timedelta
import pandas as pd

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_event_bus():
    return AsyncMock(spec=EventBusService)

@pytest_asyncio.fixture
def mock_market_data_service():
    return AsyncMock(spec=MarketDataService)

@pytest_asyncio.fixture
def mock_learning_logger_service():
    return AsyncMock(spec=LearningDataLoggerService)

def create_mcc_agent_config(agent_id: str, params_override: Optional[Dict] = None) -> AgentConfigOutput:
    default_params = {
        "adx_period": 14, "ma_short_period": 10, "ma_long_period": 50,
        "bbands_period": 20, "bbands_stddev": 2.0, "adx_trend_threshold": 25.0,
        "ma_slope_threshold": 0.001, "bbands_width_volatility_threshold": 0.1,
        "bbands_width_ranging_threshold": 0.03
    }
    if params_override:
        default_params.update(params_override)

    mcc_params = AgentStrategyConfig.MarketConditionClassifierParams(**default_params)
    return AgentConfigOutput(
        agent_id=agent_id, name=f"MCCAgent_{agent_id}", agent_type="MarketConditionClassifierAgent",
        strategy=AgentStrategyConfig(strategy_name="MCCStrategy", market_condition_classifier_params=mcc_params),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    )

@pytest_asyncio.fixture
def mcc_service(
    mock_event_bus: EventBusService,
    mock_market_data_service: MarketDataService,
    mock_learning_logger_service: LearningDataLoggerService
) -> MarketConditionClassifierService:
    agent_config = create_mcc_agent_config("mcc_test_agent")
    return MarketConditionClassifierService(
        agent_config=agent_config,
        event_bus=mock_event_bus,
        market_data_service=mock_market_data_service,
        learning_logger_service=mock_learning_logger_service
    )

# Helper to create sample klines
def generate_mcc_klines(count: int, base_price: float = 100.0) -> List[Dict[str, Any]]:
    klines = []
    prices = [base_price + (i*0.2 - (i%3)*0.5 + (i%7)*0.3) for i in range(count)] # Varied data
    for i in range(count):
        ts = int((datetime.now(timezone.utc) - timedelta(days=count - 1 - i)).timestamp() * 1000)
        klines.append({"timestamp": ts, "open": prices[i]-0.5, "high": prices[i]+0.5, "low": prices[i]-0.5, "close": prices[i], "volume": 100})
    return klines

# --- Test Cases ---
@pytest.mark.asyncio
async def test_analyze_mcc_publishes_event_and_logs(
    mcc_service: MarketConditionClassifierService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "EUR/USD"
    # Ensure enough klines for default params (longest is ma_long_period=50 + buffer)
    mock_klines = generate_mcc_klines(100)
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    # Mock internal calculation methods to control output for testing
    # This makes the test less dependent on the exactness of complex indicator calculations
    mcc_service._calculate_adx_proxy = MagicMock(return_value=30.0) # Trending
    mcc_service._calculate_sma = MagicMock(side_effect=lambda data, period: pd.Series([101.0]*len(data) if period==10 else [100.0]*len(data))) # Short > Long
    # Slope needs to be calculated on series, mock its input if needed or the slope value directly
    # For simplicity, let's assume the MA values lead to a positive slope
    # Bollinger Bands
    mcc_service._calculate_bollinger_bands = MagicMock(return_value={"width": 0.05}) # Moderate width

    await mcc_service.analyze_symbol_and_publish_condition(symbol)

    mock_event_bus.publish.assert_called_once()
    published_event: Event = mock_event_bus.publish.call_args[0][0]
    assert published_event.message_type == "MarketConditionEvent"
    payload = MarketConditionEventPayload(**published_event.payload)
    assert payload.symbol == symbol
    assert payload.regime == "trending_up" # Based on mocked indicator values
    assert payload.confidence_score is not None

    # Check learning log
    mock_learning_logger_service.log_entry.assert_called_once()
    learning_entry: LearningLogEntry = mock_learning_logger_service.log_entry.call_args[0][0]
    assert learning_entry.event_type == "MarketConditionClassified"
    assert learning_entry.source_service == "MarketConditionClassifierService"
    assert learning_entry.primary_agent_id == mcc_service.agent_config.agent_id
    assert learning_entry.data_snapshot["symbol"] == symbol
    assert learning_entry.data_snapshot["regime"] == "trending_up"
    assert "market_condition_classifier" in learning_entry.tags
    assert "trending_up" in learning_entry.tags

@pytest.mark.asyncio
async def test_analyze_mcc_insufficient_data(
    mcc_service: MarketConditionClassifierService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "GBP/JPY"
    # Return fewer klines than default requirements (e.g. MA long period 50)
    mock_klines = generate_mcc_klines(30)
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    await mcc_service.analyze_symbol_and_publish_condition(symbol)

    mock_event_bus.publish.assert_not_called()
    # No learning log expected if it exits early due to insufficient data,
    # unless a specific "ProcessingError" or "InsufficientData" log is added.
    mock_learning_logger_service.log_entry.assert_not_called()
