import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

# Assuming your FastAPI app instance is accessible for TestClient
# If main.py creates app: from python_ai_services.main import app
# For isolated testing, you might need to create a minimal app instance here
# or mock dependencies at a lower level if using Depends directly in routes.

# For this subtask, we'll focus on patching the service called by the route.
from python_ai_services.models.simulation_models import BacktestRequest, BacktestResult, EquityDataPoint
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig # For creating snapshot
from datetime import datetime, timezone

# If your main app is in python_ai_services.main.py:
# from python_ai_services.main import app
# client = TestClient(app)
# For now, let's assume we can directly patch the service instance used by the route,
# or the route's dependency injection mechanism.

# Path to the simulation_service_instance or the get_simulation_service function in the route file
# This depends on how the route provides the SimulationService.
# Based on the route code, it instantiates SimulationService directly.
# So, we'll patch 'python_ai_services.api.v1.simulation_routes.SimulationService'
SERVICE_PATH = "python_ai_services.api.v1.simulation_routes.SimulationService"

# Also need to mock MarketDataService and AgentManagementService if they are instantiated in the route
MDS_PATH = "python_ai_services.api.v1.simulation_routes.MarketDataService"
AMS_PATH = "python_ai_services.api.v1.simulation_routes.AgentManagementService"


# Minimal FastAPI app for testing this specific router
from fastapi import FastAPI
from python_ai_services.api.v1.simulation_routes import router as simulation_router

app = FastAPI()
app.include_router(simulation_router, prefix="/api/v1")
client = TestClient(app)


def create_valid_backtest_request_payload(with_snapshot: bool = True) -> dict:
    agent_config_dict = None
    agent_id = None
    if with_snapshot:
        # Create a minimal AgentConfigOutput dict payload
        agent_config_dict = AgentConfigOutput(
            agent_id="snap_agent_01", name="Snapshot Agent", agent_type="DarvasBoxTechnicalAgent",
            strategy=AgentStrategyConfig(strategy_name="darvas_test"),
            risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
        ).model_dump(mode='json') # Ensure it's JSON serializable if models are complex
    else:
        agent_id = "persisted_agent_01"

    return {
        "agent_config_snapshot": agent_config_dict,
        "agent_id_to_simulate": agent_id,
        "symbol": "BTC/USD",
        "start_date_iso": "2023-01-01T00:00:00Z",
        "end_date_iso": "2023-01-31T23:59:59Z",
        "initial_capital": 10000.0,
        "simulated_fees_percentage": 0.001,
        "simulated_slippage_percentage": 0.0005
    }

def create_mock_backtest_result(request_payload_dict: dict) -> BacktestResult:
    # Create a valid BacktestRequest from the dict to embed in the result
    req_params = BacktestRequest(**request_payload_dict)
    return BacktestResult(
        request_params=req_params,
        final_capital=11000.0,
        total_pnl=1000.0,
        total_pnl_percentage=10.0,
        total_trades=5,
        winning_trades=3,
        losing_trades=2,
        win_rate=0.6,
        equity_curve=[EquityDataPoint(timestamp=datetime.now(timezone.utc), equity=10500.0)]
    )

@patch(AMS_PATH) # Mock AMS constructor called in the route
@patch(MDS_PATH) # Mock MDS constructor called in the route
@patch(f"{SERVICE_PATH}.run_backtest") # Mock the method on the class
def test_run_backtest_endpoint_success_with_snapshot(
    mock_run_backtest: AsyncMock,
    MockMDS: MagicMock,
    MockAMS: MagicMock,
    # client: TestClient # Use global client
):
    payload_dict = create_valid_backtest_request_payload(with_snapshot=True)
    mock_result = create_mock_backtest_result(payload_dict)
    mock_run_backtest.return_value = mock_result

    # Mock the constructor returns for MDS and AMS if they are instantiated in the route
    MockMDS.return_value = MagicMock() # Instance of MDS
    MockAMS.return_value = MagicMock() # Instance of AMS (though might be None if not used)

    response = client.post("/api/v1/simulations/backtest", json=payload_dict)

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["total_pnl"] == 1000.0
    assert response_data["request_params"]["symbol"] == "BTC/USD"
    mock_run_backtest.assert_called_once()
    # Check that the BacktestRequest model was passed to the service
    call_args = mock_run_backtest.call_args[0][0]
    assert isinstance(call_args, BacktestRequest)
    assert call_args.symbol == payload_dict["symbol"]
    assert call_args.agent_config_snapshot is not None
    assert call_args.agent_config_snapshot.agent_id == "snap_agent_01"

@patch(AMS_PATH)
@patch(MDS_PATH)
@patch(f"{SERVICE_PATH}.run_backtest")
def test_run_backtest_endpoint_success_with_agent_id(
    mock_run_backtest: AsyncMock, MockMDS: MagicMock, MockAMS: MagicMock, #client: TestClient
):
    payload_dict = create_valid_backtest_request_payload(with_snapshot=False) # agent_id_to_simulate will be set
    mock_result = create_mock_backtest_result(payload_dict)
    mock_run_backtest.return_value = mock_result

    MockMDS.return_value = MagicMock()
    # If agent_id_to_simulate is used, AMS instance might be created.
    # The route code has a logger.warning and passes None if full DI isn't set up for AMS.
    # So, the mock for AMS constructor might not be strictly necessary if it's None.
    # However, patching it ensures we control its creation if the route logic changes.
    mock_ams_instance = MagicMock()
    MockAMS.return_value = mock_ams_instance

    response = client.post("/api/v1/simulations/backtest", json=payload_dict)

    assert response.status_code == 200
    response_data = response.json()
    assert response_data["final_capital"] == 11000.0
    mock_run_backtest.assert_called_once()
    call_args = mock_run_backtest.call_args[0][0]
    assert isinstance(call_args, BacktestRequest)
    assert call_args.agent_id_to_simulate == "persisted_agent_01"
    assert call_args.agent_config_snapshot is None


@patch(AMS_PATH)
@patch(MDS_PATH)
@patch(f"{SERVICE_PATH}.run_backtest")
def test_run_backtest_endpoint_value_error(
    mock_run_backtest: AsyncMock, MockMDS: MagicMock, MockAMS: MagicMock, #client: TestClient
):
    payload_dict = create_valid_backtest_request_payload()
    mock_run_backtest.side_effect = ValueError("Invalid date range")
    MockMDS.return_value = MagicMock()
    MockAMS.return_value = MagicMock()

    response = client.post("/api/v1/simulations/backtest", json=payload_dict)

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid date range"}

@patch(AMS_PATH)
@patch(MDS_PATH)
@patch(f"{SERVICE_PATH}.run_backtest")
def test_run_backtest_endpoint_server_error(
    mock_run_backtest: AsyncMock, MockMDS: MagicMock, MockAMS: MagicMock, #client: TestClient
):
    payload_dict = create_valid_backtest_request_payload()
    mock_run_backtest.side_effect = Exception("Unexpected DB error")
    MockMDS.return_value = MagicMock()
    MockAMS.return_value = MagicMock()

    response = client.post("/api/v1/simulations/backtest", json=payload_dict)

    assert response.status_code == 500
    assert "Internal server error during backtest: Unexpected DB error" in response.json()["detail"]

def test_run_backtest_endpoint_invalid_request_payload(#client: TestClient
):
    invalid_payload = { # Missing 'symbol', 'start_date_iso', etc.
        "agent_id_to_simulate": "agent1",
        "initial_capital": 1000
    }
    response = client.post("/api/v1/simulations/backtest", json=invalid_payload)
    assert response.status_code == 422 # FastAPI's unprocessable entity for Pydantic validation errors
