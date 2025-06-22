import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import List, Dict, Any, Optional

from python_ai_services.services.darvas_box_service import DarvasBoxTechnicalService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.event_bus_models import Event, TradeSignalEventPayload
from python_ai_services.models.learning_models import LearningLogEntry
from datetime import datetime, timezone, timedelta

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

def create_darvas_agent_config(
    agent_id: str,
    lookback_period: int = 20,
    breakout_confirmation_periods: int = 1,
    box_range_min_percentage: float = 0.02,
    stop_loss_percentage_from_box_bottom: float = 0.01
) -> AgentConfigOutput:
    darvas_params = AgentStrategyConfig.DarvasStrategyParams(
        lookback_period=lookback_period,
        breakout_confirmation_periods=breakout_confirmation_periods,
        box_range_min_percentage=box_range_min_percentage,
        stop_loss_percentage_from_box_bottom=stop_loss_percentage_from_box_bottom
    )
    return AgentConfigOutput(
        agent_id=agent_id, name=f"DarvasAgent_{agent_id}", agent_type="DarvasBoxTechnicalAgent",
        strategy=AgentStrategyConfig(strategy_name="DarvasBoxStrategy", darvas_params=darvas_params),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01) # Dummy
    )

@pytest_asyncio.fixture
def darvas_service(
    mock_event_bus: EventBusService,
    mock_market_data_service: MarketDataService,
    mock_learning_logger_service: LearningDataLoggerService
) -> DarvasBoxTechnicalService:
    agent_config = create_darvas_agent_config("darvas_test_agent")
    return DarvasBoxTechnicalService(
        agent_config=agent_config,
        event_bus=mock_event_bus,
        market_data_service=mock_market_data_service,
        learning_logger_service=mock_learning_logger_service
    )

# Helper to create sample klines
def generate_klines(count: int, base_price: float = 100.0, price_increment: float = 1.0, is_breakout: bool = False) -> List[Dict[str, Any]]:
    klines = []
    for i in range(count):
        ts = int((datetime.now(timezone.utc) - timedelta(days=count - 1 - i)).timestamp() * 1000)
        open_p = base_price + i * price_increment
        close_p = base_price + (i + 1) * price_increment
        high_p = close_p + 0.5
        low_p = open_p - 0.5
        if i == count -1 and is_breakout: # Last candle is breakout
            high_p = close_p = base_price + (count + 2) * price_increment # Ensure it breaks previous highs
        klines.append({"timestamp": ts, "open": open_p, "high": high_p, "low": low_p, "close": close_p, "volume": 100})
    return klines

# --- Test Cases ---
@pytest.mark.asyncio
async def test_analyze_darvas_buy_signal_generated_and_logged(
    darvas_service: DarvasBoxTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "BTC/USD"
    params = darvas_service.params
    klines_to_fetch = params.lookback_period + params.breakout_confirmation_periods

    # Last candle should break above the high of the lookback_period (excluding confirmation period)
    mock_klines = generate_klines(klines_to_fetch, base_price=100, price_increment=0.1) # Relatively flat box
    # Make the last candle a breakout candle
    box_top_price = max(k['high'] for k in mock_klines[:-params.breakout_confirmation_periods])
    mock_klines[-1]['close'] = box_top_price + 1
    mock_klines[-1]['high'] = box_top_price + 1.5

    mock_market_data_service.get_historical_klines.return_value = mock_klines

    await darvas_service.analyze_symbol_and_generate_signal(symbol)

    mock_event_bus.publish.assert_called_once()
    published_event: Event = mock_event_bus.publish.call_args[0][0]
    assert published_event.message_type == "TradeSignalEvent"
    signal_payload = TradeSignalEventPayload(**published_event.payload)
    assert signal_payload.symbol == symbol
    assert signal_payload.action == "buy"
    assert signal_payload.price_target == mock_klines[-1]['close']

    # Check learning log
    mock_learning_logger_service.log_entry.assert_called_once()
    learning_entry: LearningLogEntry = mock_learning_logger_service.log_entry.call_args[0][0]
    assert learning_entry.event_type == "SignalGenerated"
    assert learning_entry.source_service == "DarvasBoxTechnicalService"
    assert learning_entry.primary_agent_id == darvas_service.agent_config.agent_id
    assert learning_entry.data_snapshot["symbol"] == symbol
    assert learning_entry.data_snapshot["action"] == "buy"
    assert "darvas_box" in learning_entry.tags
    assert "buy" in learning_entry.tags

@pytest.mark.asyncio
async def test_analyze_darvas_no_signal_logged(
    darvas_service: DarvasBoxTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "ETH/USD"
    params = darvas_service.params
    klines_to_fetch = params.lookback_period + params.breakout_confirmation_periods

    # Data that does not cause a breakout
    mock_klines = generate_klines(klines_to_fetch, base_price=200, price_increment=0.05)
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    await darvas_service.analyze_symbol_and_generate_signal(symbol)

    mock_event_bus.publish.assert_not_called()

    # Check learning log for "SignalEvaluation"
    mock_learning_logger_service.log_entry.assert_called_once()
    learning_entry: LearningLogEntry = mock_learning_logger_service.log_entry.call_args[0][0]
    assert learning_entry.event_type == "SignalEvaluation"
    assert learning_entry.outcome_or_result == {"signal_generated": False}
    assert learning_entry.primary_agent_id == darvas_service.agent_config.agent_id
    assert "darvas_box" in learning_entry.tags
    assert "no_signal" in learning_entry.tags

@pytest.mark.asyncio
async def test_analyze_darvas_insufficient_data(
    darvas_service: DarvasBoxTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "ADA/USD"
    params = darvas_service.params
    # Return fewer klines than needed
    mock_klines = generate_klines(params.lookback_period - 1, base_price=1.0)
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    await darvas_service.analyze_symbol_and_generate_signal(symbol)

    mock_event_bus.publish.assert_not_called()
    # Learning log might not be called here if it exits early, or it might log a "ProcessingError" or "InsufficientData"
    # Based on current Darvas service code, it logs a warning and returns. No specific learning log for this.
    # For this test, we'll assert it wasn't called with SignalGenerated/SignalEvaluation.
    # A more robust implementation might add a specific learning log for this case.
    for call_arg in mock_learning_logger_service.log_entry.call_args_list:
        entry_arg: LearningLogEntry = call_arg[0][0]
        assert entry_arg.event_type not in ["SignalGenerated", "SignalEvaluation"]
