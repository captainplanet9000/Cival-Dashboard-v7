import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
from dateutil import parser as date_parser
from decimal import Decimal # Though service uses floats, test inputs might involve Decimal

from python_ai_services.services.simulation_service import SimulationService
from python_ai_services.models.simulation_models import BacktestRequest, BacktestResult, SimulatedTrade, EquityDataPoint
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig, AgentStrategyConfig # Ensure Darvas/Alligator params are accessible
from python_ai_services.services.market_data_service import MarketDataService
from python_ai_services.services.agent_management_service import AgentManagementService

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_market_data_service():
    service = AsyncMock(spec=MarketDataService)
    service.get_historical_klines = AsyncMock()
    return service

@pytest_asyncio.fixture
def mock_agent_management_service():
    service = AsyncMock(spec=AgentManagementService)
    service.get_agent = AsyncMock()
    return service

@pytest_asyncio.fixture
def simulation_service(mock_market_data_service, mock_agent_management_service):
    return SimulationService(
        market_data_service=mock_market_data_service,
        agent_management_service=mock_agent_management_service
    )

# Helper to create sample klines
def create_sample_klines(start_dt: datetime, num_candles: int, price_increment: float = 1.0) -> List[Dict[str, Any]]:
    klines = []
    current_price = 100.0
    for i in range(num_candles):
        ts = int((start_dt + timedelta(days=i)).timestamp() * 1000)
        current_price += price_increment if i % 2 == 0 else -price_increment / 2
        klines.append({
            "timestamp": ts,
            "open": current_price - 0.5,
            "high": current_price + 0.5,
            "low": current_price - 1.0,
            "close": current_price,
            "volume": 1000 + i * 10
        })
    return klines

# Helper to create AgentConfig for tests
def create_test_agent_config_for_sim(
    agent_type: str = "DarvasBoxTechnicalAgent",
    darvas_params: Optional[Dict[str, Any]] = None,
    alligator_params: Optional[Dict[str, Any]] = None
) -> AgentConfigOutput:

    strategy_params = {}
    if agent_type == "DarvasBoxTechnicalAgent":
        strategy_params["darvas_params"] = AgentStrategyConfig.DarvasStrategyParams(**(darvas_params or {}))
    elif agent_type == "WilliamsAlligatorTechnicalAgent":
        strategy_params["alligator_params"] = AgentStrategyConfig.WilliamsAlligatorParams(**(alligator_params or {}))

    return AgentConfigOutput(
        agent_id="sim_agent_001",
        name="SimAgent",
        agent_type=agent_type,
        strategy=AgentStrategyConfig(strategy_name="sim_strat", parameters={}, **strategy_params),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=10000, risk_per_trade_percentage=0.01), # Not directly used by sim service yet
        execution_provider="paper" # Does not affect sim service logic
    )

# --- Test Cases for run_backtest ---

@pytest.mark.asyncio
async def test_run_backtest_input_validation(simulation_service: SimulationService):
    # No agent_config_snapshot and no agent_id_to_simulate
    request_no_agent = BacktestRequest(
        symbol="BTC/USD", start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="Either agent_config_snapshot or agent_id_to_simulate must be provided."):
        await simulation_service.run_backtest(request_no_agent)

    # Both agent_config_snapshot and agent_id_to_simulate
    agent_conf_snap = create_test_agent_config_for_sim()
    request_both_agent = BacktestRequest(
        agent_config_snapshot=agent_conf_snap, agent_id_to_simulate="some_id",
        symbol="BTC/USD", start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="Provide either agent_config_snapshot or agent_id_to_simulate, not both."):
        await simulation_service.run_backtest(request_both_agent)

    # Agent ID provided but AMS not available
    simulation_service_no_ams = SimulationService(simulation_service.market_data_service, None)
    request_id_no_ams = BacktestRequest(
        agent_id_to_simulate="some_id",
        symbol="BTC/USD", start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="AgentManagementService is required to fetch agent by ID."):
        await simulation_service_no_ams.run_backtest(request_id_no_ams)

@pytest.mark.asyncio
async def test_run_backtest_agent_config_not_found(simulation_service: SimulationService, mock_agent_management_service: MagicMock):
    mock_agent_management_service.get_agent.return_value = None
    request = BacktestRequest(
        agent_id_to_simulate="non_existent_agent",
        symbol="BTC/USD", start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="Agent configuration could not be determined for backtest."):
        await simulation_service.run_backtest(request)

@pytest.mark.asyncio
async def test_run_backtest_no_kline_data_returned(simulation_service: SimulationService, mock_market_data_service: MagicMock):
    mock_market_data_service.get_historical_klines.return_value = []
    agent_config = create_test_agent_config_for_sim()
    request = BacktestRequest(
        agent_config_snapshot=agent_config,
        symbol="BTC/USD", start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="No kline data returned from MarketDataService for BTC/USD."):
        await simulation_service.run_backtest(request)

@pytest.mark.asyncio
async def test_run_backtest_no_kline_data_in_range(simulation_service: SimulationService, mock_market_data_service: MagicMock):
    start_dt = date_parser.isoparse("2023-02-01T00:00:00Z")
    # Klines are outside the requested range
    klines = create_sample_klines(start_dt + timedelta(days=20), 5)
    mock_market_data_service.get_historical_klines.return_value = klines

    agent_config = create_test_agent_config_for_sim()
    request = BacktestRequest(
        agent_config_snapshot=agent_config,
        symbol="BTC/USD",
        start_date_iso="2023-01-01T00:00:00Z", # Range before klines
        end_date_iso="2023-01-10T00:00:00Z",
        initial_capital=10000
    )
    with pytest.raises(ValueError, match="No kline data found for BTC/USD in the specified date range after filtering."):
        await simulation_service.run_backtest(request)


@pytest.mark.asyncio
async def test_run_backtest_darvas_buys_and_sells_profit(simulation_service: SimulationService, mock_market_data_service: MagicMock):
    agent_config = create_test_agent_config_for_sim(agent_type="DarvasBoxTechnicalAgent", darvas_params={"lookback_period": 5})
    start_dt = date_parser.isoparse("2023-01-01T00:00:00Z")

    # Create klines: initial flat, then breakout, then drop
    klines = []
    price = 100
    # Initial period for lookback
    for i in range(5): klines.append({"timestamp": int((start_dt + timedelta(days=i)).timestamp()*1000), "open":price, "high":price+1, "low":price-1, "close":price, "volume":100})
    # Breakout candle (day 5, index 5)
    klines.append({"timestamp": int((start_dt + timedelta(days=5)).timestamp()*1000), "open":100, "high":105, "low":99, "close":104, "volume":200}) # Buy signal (close > 101)
    # Hold period
    klines.append({"timestamp": int((start_dt + timedelta(days=6)).timestamp()*1000), "open":104, "high":106, "low":103, "close":105, "volume":150})
    # Sell signal candle (day 7, index 7) - simplified sell, assuming any sell signal closes position
    # For Darvas, a sell might be breaking below box bottom. Here, just using a placeholder sell signal.
    # Let's mock the Darvas logic to generate a sell.
    klines.append({"timestamp": int((start_dt + timedelta(days=7)).timestamp()*1000), "open":105, "high":107, "low":100, "close":102, "volume":180})

    mock_market_data_service.get_historical_klines.return_value = klines

    # Mock the Darvas logic to control signals precisely for this test
    # On day 5 (index 5 in klines_for_backtest_df), price 104. klines_df[:6] passed.
    # On day 7 (index 7 in klines_for_backtest_df), price 102. klines_df[:8] passed.
    darvas_call_count = 0
    def mock_darvas_side_effect(klines_df, params, current_price):
        nonlocal darvas_call_count
        darvas_call_count += 1
        # Simulate buy on the breakout candle (index 5 of original klines)
        # The history_slice_df will have current candle as last row.
        # So, if current_price is 104 (breakout candle)
        if darvas_call_count == 6 and current_price == 104: # Corresponds to klines[5]
            return "buy"
        # Simulate sell on the 8th candle (index 7 of original klines)
        elif darvas_call_count == 8 and current_price == 102:
            return "sell"
        return None

    with patch.object(simulation_service, '_simulate_darvas_logic', side_effect=mock_darvas_side_effect) as mock_strat_logic:
        request = BacktestRequest(
            agent_config_snapshot=agent_config, symbol="BTC/USD",
            start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-08T00:00:00Z", # Cover all 8 candles
            initial_capital=10000, simulated_fees_percentage=0.001, simulated_slippage_percentage=0.0005
        )
        result = await simulation_service.run_backtest(request)

    assert mock_strat_logic.call_count == 8 # Called for each of the 8 candles in range
    assert len(result.list_of_simulated_trades) == 2

    buy_trade = result.list_of_simulated_trades[0]
    sell_trade = result.list_of_simulated_trades[1]

    assert buy_trade.side == "buy"
    assert buy_trade.quantity == 1.0
    buy_exec_price = 104 * (1 + 0.0005) # 104.052
    assert buy_trade.price == pytest.approx(buy_exec_price)
    buy_fee = buy_exec_price * 1.0 * 0.001 # 0.104052
    assert buy_trade.fee_paid == pytest.approx(buy_fee)

    assert sell_trade.side == "sell"
    assert sell_trade.quantity == 1.0
    sell_exec_price = 102 * (1 - 0.0005) # 101.949
    assert sell_trade.price == pytest.approx(sell_exec_price)
    sell_fee = sell_exec_price * 1.0 * 0.001 # 0.101949
    assert sell_trade.fee_paid == pytest.approx(sell_fee)

    expected_pnl = (sell_exec_price * 1.0) - (buy_exec_price * 1.0) - sell_fee # Buy fee already deducted from capital at buy time
    assert result.total_pnl == pytest.approx(expected_pnl)
    assert result.final_capital == pytest.approx(10000 - buy_fee + expected_pnl) # Initial - buy_fee (deducted from capital) + PnL from sell (which also accounts for its own fee)

    assert result.total_trades == 1 # 1 round trip
    assert result.winning_trades == 0 # 101.949 vs 104.052 is a loss
    assert result.losing_trades == 1
    assert len(result.equity_curve) == 9 # Initial point + 8 candles

@pytest.mark.asyncio
async def test_run_backtest_no_signals_no_trades(simulation_service: SimulationService, mock_market_data_service: MagicMock):
    agent_config = create_test_agent_config_for_sim(agent_type="DarvasBoxTechnicalAgent")
    start_dt = date_parser.isoparse("2023-01-01T00:00:00Z")
    klines = create_sample_klines(start_dt, 10, price_increment=0.1) # Flat market
    mock_market_data_service.get_historical_klines.return_value = klines

    # Mock strategy to generate no signals
    with patch.object(simulation_service, '_simulate_darvas_logic', return_value=None) as mock_strat_logic:
        request = BacktestRequest(
            agent_config_snapshot=agent_config, symbol="BTC/USD",
            start_date_iso="2023-01-01T00:00:00Z", end_date_iso="2023-01-10T00:00:00Z",
            initial_capital=10000
        )
        result = await simulation_service.run_backtest(request)

    assert mock_strat_logic.call_count == 10
    assert len(result.list_of_simulated_trades) == 0
    assert result.total_trades == 0
    assert result.final_capital == 10000
    assert result.total_pnl == 0.0
    assert len(result.equity_curve) == 11 # Initial point + 10 candles, equity remains constant

# TODO: More tests
# - Test with WilliamsAlligator logic (similar structure to Darvas test)
# - Test insufficient capital for a buy trade
# - Test bankruptcy scenario (capital <= 0)
# - Test different fee and slippage percentages
# - Test using agent_id_to_simulate (mocking AMS.get_agent)
# - Test equity curve values at various points
# - Test calculation of other BacktestResult metrics (win_rate, etc.) once PnL logic is robust
