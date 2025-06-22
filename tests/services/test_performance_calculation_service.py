import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone, timedelta
import numpy as np
from typing import List, Optional

from python_ai_services.services.performance_calculation_service import PerformanceCalculationService
from python_ai_services.services.trading_data_service import TradingDataService
from python_ai_services.services.portfolio_snapshot_service import PortfolioSnapshotService
from python_ai_services.models.performance_models import PerformanceMetrics
from python_ai_services.models.dashboard_models import TradeLogItem, PortfolioSnapshotOutput

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_trading_data_service() -> MagicMock:
    service = AsyncMock(spec=TradingDataService)
    service.get_trade_history = AsyncMock(return_value=[]) # Default to no trades
    return service

@pytest_asyncio.fixture
def mock_portfolio_snapshot_service() -> MagicMock:
    service = AsyncMock(spec=PortfolioSnapshotService)
    service.get_historical_snapshots = AsyncMock(return_value=[]) # Default to no snapshots
    return service

@pytest_asyncio.fixture
def performance_service(
    mock_trading_data_service: MagicMock,
    mock_portfolio_snapshot_service: MagicMock
) -> PerformanceCalculationService:
    return PerformanceCalculationService(
        trading_data_service=mock_trading_data_service,
        portfolio_snapshot_service=mock_portfolio_snapshot_service
    )

# --- Helper Functions ---
def create_mock_tradelog(pnl: Optional[float], timestamp_offset_days: int) -> TradeLogItem:
    return TradeLogItem(
        agent_id="test_agent", asset="TEST/USD", opening_side="buy", order_type="limit",
        quantity=1, entry_price_avg=100, exit_price_avg=100 + (pnl if pnl is not None else 0),
        entry_timestamp=datetime.now(timezone.utc) - timedelta(days=timestamp_offset_days + 1),
        exit_timestamp=datetime.now(timezone.utc) - timedelta(days=timestamp_offset_days),
        realized_pnl=pnl
    )

def create_mock_snapshots(equities: List[float], start_date: datetime, interval_days: int = 1) -> List[PortfolioSnapshotOutput]:
    snapshots = []
    current_date = start_date
    for equity in equities:
        snapshots.append(
            PortfolioSnapshotOutput(
                agent_id="test_agent",
                timestamp=current_date,
                total_equity_usd=equity
            )
        )
        current_date += timedelta(days=interval_days)
    return snapshots

# --- Basic Trade-Based Metrics Tests (from original file, adapted) ---
@pytest.mark.asyncio
async def test_calculate_performance_no_trades(performance_service: PerformanceCalculationService, mock_trading_data_service: MagicMock):
    mock_trading_data_service.get_trade_history.return_value = []
    metrics = await performance_service.calculate_performance_metrics("test_agent_no_trades")
    assert metrics.total_trades == 0
    assert metrics.total_net_pnl == 0.0
    assert "No trade history available" in metrics.notes if metrics.notes else False

@pytest.mark.asyncio
async def test_calculate_performance_with_trades(performance_service: PerformanceCalculationService, mock_trading_data_service: MagicMock):
    mock_trading_data_service.get_trade_history.return_value = [
        create_mock_tradelog(10, 2), # Win
        create_mock_tradelog(-5, 1), # Loss
        create_mock_tradelog(0, 0)   # Neutral
    ]
    metrics = await performance_service.calculate_performance_metrics("test_agent_trades")
    assert metrics.total_trades == 3 # Based on current PCS logic which counts each log item
    assert metrics.winning_trades == 1
    assert metrics.losing_trades == 1
    assert metrics.neutral_trades == 1
    assert metrics.total_net_pnl == pytest.approx(5.0)
    assert metrics.win_rate == pytest.approx(0.5) # 1 win / (1 win + 1 loss)
    assert metrics.loss_rate == pytest.approx(0.5)
    assert metrics.gross_profit == pytest.approx(10.0)
    assert metrics.gross_loss == pytest.approx(5.0)
    assert metrics.average_win_amount == pytest.approx(10.0)
    assert metrics.average_loss_amount == pytest.approx(5.0)
    assert metrics.profit_factor == pytest.approx(2.0)


# --- Advanced Metrics Tests ---
@pytest.mark.asyncio
async def test_calculate_advanced_metrics_insufficient_snapshots(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = [] # No snapshots
    metrics = await performance_service.calculate_performance_metrics("test_agent_few_snaps")
    assert "require at least 2 portfolio snapshots" in metrics.notes if metrics.notes else False
    assert metrics.max_drawdown_percentage is None
    assert metrics.annualized_sharpe_ratio is None
    assert metrics.compounding_annual_return_percentage is None
    assert metrics.annualized_volatility_percentage is None

    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots([10000], datetime.now(timezone.utc)) # 1 snapshot
    metrics_one = await performance_service.calculate_performance_metrics("test_agent_one_snap")
    assert "require at least 2 portfolio snapshots" in metrics_one.notes if metrics_one.notes else False

@pytest.mark.asyncio
async def test_calculate_advanced_metrics_success(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    start_date = datetime(2022, 1, 1, tzinfo=timezone.utc)
    # Simple linear growth for easy CAGR/Volatility check. 252 trading days for ~1 year.
    equities = [10000 + i * 10 for i in range(253)] # Approx 1 year of daily data
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)

    metrics = await performance_service.calculate_performance_metrics("test_agent_adv_ok")

    assert metrics.max_drawdown_percentage is not None
    assert metrics.max_drawdown_percentage == 0.0 # Linear growth, no drawdown

    assert metrics.compounding_annual_return_percentage is not None
    # Expected CAGR: ((10000 + 252*10) / 10000)^(1/1) - 1 = (12520/10000) - 1 = 0.252 => 25.2%
    # Duration is slightly more than 1 year due to 253 points.
    # (12520/10000)**(365.25/252) - 1
    final_equity = equities[-1]
    initial_equity = equities[0]
    duration_years = (252 * 1) / 365.25 # 252 days
    expected_cagr = ((final_equity / initial_equity) ** (1 / duration_years) - 1) * 100
    assert metrics.compounding_annual_return_percentage == pytest.approx(expected_cagr, rel=0.1) # Relaxed due to period estimation

    assert metrics.annualized_volatility_percentage is not None
    # For linear growth, periodic returns are almost constant, so std dev should be very low.
    assert metrics.annualized_volatility_percentage < 5.0 # Expect low volatility for this data

    assert metrics.annualized_sharpe_ratio is not None
    # Sharpe = (CAGR - Rf) / Volatility. With Rf=0, Sharpe = CAGR / Volatility
    if metrics.annualized_volatility_percentage > 1e-9: # Avoid division by zero if volatility is effectively zero
        expected_sharpe = metrics.compounding_annual_return_percentage / metrics.annualized_volatility_percentage
        assert metrics.annualized_sharpe_ratio == pytest.approx(expected_sharpe, rel=0.1)


@pytest.mark.asyncio
async def test_calculate_advanced_metrics_flat_equity(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    start_date = datetime(2023, 1, 1, tzinfo=timezone.utc)
    equities = [10000.0] * 50 # 50 days of flat equity
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)
    metrics = await performance_service.calculate_performance_metrics("test_agent_flat_equity")

    assert metrics.max_drawdown_percentage == pytest.approx(0.0)
    assert metrics.compounding_annual_return_percentage == pytest.approx(0.0)
    assert metrics.annualized_volatility_percentage == pytest.approx(0.0)
    # Sharpe can be tricky with zero volatility. Service might return 0, None, or inf.
    # Current service logic: if vol is ~0 and CAGR > 0, Sharpe = inf. If CAGR is also 0, then it's None.
    assert metrics.annualized_sharpe_ratio is None # Since CAGR is 0 and Vol is 0

@pytest.mark.asyncio
async def test_calculate_advanced_metrics_max_drawdown(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    start_date = datetime(2023, 1, 1, tzinfo=timezone.utc)
    equities = [100, 120, 100, 80, 110, 90, 130]
    # Peaks: 120, 110 (relative to 80), 130
    # Troughs: 100 (from 120, DD = (120-100)/120 = 16.67%)
    #          80 (from 120, DD = (120-80)/120 = 33.33%) <- Max DD
    #          90 (from 110 (new peak after 80), DD = (110-90)/110 = 18.18%)
    #          90 (from 130 (new peak), DD = (130-90)/130 = 30.7%) - No, this is not how it works, peak must be before trough.
    # Peak = 120, Trough = 80. Max DD = (120-80)/120 = 40/120 = 0.3333...
    # New Peak = 130.
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)
    metrics = await performance_service.calculate_performance_metrics("test_agent_mdd")
    assert metrics.max_drawdown_percentage == pytest.approx((120.0 - 80.0) / 120.0 * 100)

@pytest.mark.asyncio
async def test_calculate_advanced_metrics_short_duration(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock, caplog):
    start_date = datetime.now(timezone.utc) - timedelta(days=2) # Only 3 data points over 2 days
    equities = [10000, 10100, 10050]
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)

    metrics = await performance_service.calculate_performance_metrics("test_agent_short_dur")

    assert metrics.max_drawdown_percentage is not None
    assert metrics.compounding_annual_return_percentage is not None # Will be very high or low
    assert metrics.annualized_volatility_percentage is not None # Also potentially very high
    assert metrics.annualized_sharpe_ratio is not None # Could be extreme
    assert "Short snapshot duration; annualized metrics may be misleading." in metrics.notes if metrics.notes else False

@pytest.mark.asyncio
async def test_calculate_cagr_zero_initial_equity(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    start_date = datetime(2023,1,1, tzinfo=timezone.utc)
    equities = [0, 100, 200] # Starts with zero equity
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)
    metrics = await performance_service.calculate_performance_metrics("test_agent_zero_equity")
    assert metrics.compounding_annual_return_percentage is None # Should be None if initial equity is 0

@pytest.mark.asyncio
async def test_calculate_cagr_negative_total_return(performance_service: PerformanceCalculationService, mock_portfolio_snapshot_service: MagicMock):
    start_date = datetime(2023,1,1, tzinfo=timezone.utc)
    equities = [10000, 5000, 2000] # Ends with loss
    mock_portfolio_snapshot_service.get_historical_snapshots.return_value = create_mock_snapshots(equities, start_date)
    metrics = await performance_service.calculate_performance_metrics("test_agent_neg_return")
    assert metrics.compounding_annual_return_percentage is not None
    assert metrics.compounding_annual_return_percentage < 0
