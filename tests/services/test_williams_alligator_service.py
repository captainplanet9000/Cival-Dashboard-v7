import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from typing import List, Dict, Any, Optional

from python_ai_services.services.williams_alligator_service import WilliamsAlligatorTechnicalService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.event_bus_models import Event, TradeSignalEventPayload
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

def create_alligator_agent_config(
    agent_id: str,
    jaw_period: int = 13, jaw_shift: int = 8,
    teeth_period: int = 8, teeth_shift: int = 5,
    lips_period: int = 5, lips_shift: int = 3
) -> AgentConfigOutput:
    alligator_params = AgentStrategyConfig.WilliamsAlligatorParams(
        jaw_period=jaw_period, jaw_shift=jaw_shift,
        teeth_period=teeth_period, teeth_shift=teeth_shift,
        lips_period=lips_period, lips_shift=lips_shift
    )
    return AgentConfigOutput(
        agent_id=agent_id, name=f"AlligatorAgent_{agent_id}", agent_type="WilliamsAlligatorTechnicalAgent",
        strategy=AgentStrategyConfig(strategy_name="WilliamsAlligatorStrategy", williams_alligator_params=alligator_params),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    )

@pytest_asyncio.fixture
def alligator_service(
    mock_event_bus: EventBusService,
    mock_market_data_service: MarketDataService,
    mock_learning_logger_service: LearningDataLoggerService
) -> WilliamsAlligatorTechnicalService:
    agent_config = create_alligator_agent_config("alligator_test_agent")
    return WilliamsAlligatorTechnicalService(
        agent_config=agent_config,
        event_bus=mock_event_bus,
        market_data_service=mock_market_data_service,
        learning_logger_service=mock_learning_logger_service
    )

# Helper to create sample klines
def generate_alligator_klines(count: int, base_price: float = 100.0) -> List[Dict[str, Any]]:
    klines = []
    prices = [base_price + i*0.1 - (i%5)*0.3 + (i%2)*0.1 for i in range(count)] # Some variation
    for i in range(count):
        ts = int((datetime.now(timezone.utc) - timedelta(days=count - 1 - i)).timestamp() * 1000)
        klines.append({"timestamp": ts, "open": prices[i]-0.5, "high": prices[i]+0.5, "low": prices[i]-0.5, "close": prices[i], "volume": 100})
    return klines

# --- Test Cases ---
@pytest.mark.asyncio
async def test_analyze_alligator_buy_signal_generated_and_logged(
    alligator_service: WilliamsAlligatorTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "ETH/USD"
    params = alligator_service.params
    required_data_points = max(params.jaw_period, params.teeth_period, params.lips_period) + \
                           max(params.jaw_shift, params.teeth_shift, params.lips_shift) + 2

    # Create klines that should generate a buy signal
    # Lips > Teeth > Jaw, and current_price > max(Lips, Teeth, Jaw)
    # This requires careful crafting or mocking of _calculate_sma or the SMAs themselves
    mock_klines = generate_alligator_klines(required_data_points, base_price=100)
    # Make last data point indicative of a buy
    mock_klines[-1]['close'] = 110 # Price above lines

    mock_market_data_service.get_historical_klines.return_value = mock_klines

    # Mock SMA calculations to force a buy signal scenario
    # Lips > Teeth > Jaw
    # Lips cross Teeth up: lips_prev <= teeth_prev and lips_current > teeth_current
    # current_price > max(lips, teeth, jaw)
    def mock_sma_side_effect(data, period):
        if period == params.lips_period: # Lips
            # prev=98, current=102
            return pd.Series([None]*(len(data)-2) + [98, 102])
        elif period == params.teeth_period: # Teeth
            # prev=100, current=100
            return pd.Series([None]*(len(data)-2) + [100, 100])
        elif period == params.jaw_period: # Jaw
            # prev=101, current=99
            return pd.Series([None]*(len(data)-2) + [101, 99])
        return pd.Series([None]*len(data)) # Default for any other unexpected calls

    with patch.object(alligator_service, '_calculate_sma', side_effect=mock_sma_side_effect) as mock_calc_sma:
        await alligator_service.analyze_symbol_and_generate_signal(symbol)

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
    assert learning_entry.data_snapshot["action"] == "buy"
    assert "williams_alligator" in learning_entry.tags

@pytest.mark.asyncio
async def test_analyze_alligator_no_signal_logged(
    alligator_service: WilliamsAlligatorTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "BTC/USD"
    params = alligator_service.params
    required_data_points = max(params.jaw_period, params.teeth_period, params.lips_period) + \
                           max(params.jaw_shift, params.teeth_shift, params.lips_shift) + 2

    mock_klines = generate_alligator_klines(required_data_points, base_price=100)
    # Ensure this data does not generate a signal by default (e.g. lines are tangled or price not breaking out)
    mock_klines[-1]['close'] = 100 # Price not breaking out
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    # Mock SMAs to be tangled, no clear signal
    def mock_sma_tangled(data, period):
        if period == params.lips_period: return pd.Series([None]*(len(data)-2) + [100, 100.5])
        elif period == params.teeth_period: return pd.Series([None]*(len(data)-2) + [100.2, 100.3])
        elif period == params.jaw_period: return pd.Series([None]*(len(data)-2) + [100.1, 100.4])
        return pd.Series([None]*len(data))

    with patch.object(alligator_service, '_calculate_sma', side_effect=mock_sma_tangled):
        await alligator_service.analyze_symbol_and_generate_signal(symbol)

    mock_event_bus.publish.assert_not_called()

    mock_learning_logger_service.log_entry.assert_called_once()
    learning_entry: LearningLogEntry = mock_learning_logger_service.log_entry.call_args[0][0]
    assert learning_entry.event_type == "SignalEvaluation"
    assert learning_entry.outcome_or_result == {"signal_generated": False}
    assert "williams_alligator" in learning_entry.tags
    assert "no_signal" in learning_entry.tags

@pytest.mark.asyncio
async def test_analyze_alligator_insufficient_data(
    alligator_service: WilliamsAlligatorTechnicalService,
    mock_market_data_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "LTC/USD"
    # Return fewer klines than required
    mock_klines = generate_alligator_klines(10, base_price=50)
    mock_market_data_service.get_historical_klines.return_value = mock_klines

    await alligator_service.analyze_symbol_and_generate_signal(symbol)

    mock_event_bus.publish.assert_not_called()
    # No learning log for this specific early exit, as per current service code.
    # If a "ProcessingError" or "InsufficientData" log were added, this test would check for it.
    mock_learning_logger_service.log_entry.assert_not_called()
