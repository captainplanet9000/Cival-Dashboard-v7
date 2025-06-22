import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch, call
import uuid
from typing import Optional, Dict, Any

from python_ai_services.services.trading_coordinator import TradingCoordinator
from python_ai_services.services.simulated_trade_executor import SimulatedTradeExecutor
from python_ai_services.services.hyperliquid_execution_service import HyperliquidExecutionService
from python_ai_services.services.dex_execution_service import DEXExecutionService
from python_ai_services.services.regulatory_compliance_service import RegulatoryComplianceService
from python_ai_services.services.trade_history_service import TradeHistoryService
from python_ai_services.services.risk_manager_service import RiskManagerService
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService # Added
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.event_bus_models import TradeSignalEventPayload, Event, RiskAssessmentResponseData
from python_ai_services.models.compliance_models import ComplianceCheckRequest, ComplianceCheckResult, ViolatedRuleInfo
from python_ai_services.models.learning_models import LearningLogEntry # Added

# --- Mock Fixtures ---
@pytest_asyncio.fixture
def mock_agent_management_service():
    service = AsyncMock(spec=AgentManagementService)
    service.get_agent = AsyncMock() # Ensure get_agent is an AsyncMock
    return service

@pytest_asyncio.fixture
def mock_risk_manager_service():
    return AsyncMock(spec=RiskManagerService)

@pytest_asyncio.fixture
def mock_compliance_service(): # New
    service = AsyncMock(spec=RegulatoryComplianceService)
    service.check_action_compliance = AsyncMock()
    return service

@pytest_asyncio.fixture
def mock_simulated_executor():
    return AsyncMock(spec=SimulatedTradeExecutor)

@pytest_asyncio.fixture
def mock_hyperliquid_executor():
    return AsyncMock(spec=HyperliquidExecutionService)

@pytest_asyncio.fixture
def mock_dex_executor():
    return AsyncMock(spec=DEXExecutionService)

@pytest_asyncio.fixture
def mock_trade_history_service():
    return AsyncMock(spec=TradeHistoryService)

@pytest_asyncio.fixture
def mock_event_bus_service():
    return AsyncMock(spec=EventBusService)

@pytest_asyncio.fixture
def mock_google_bridge(): # Added as it's a dependency for TC
    return MagicMock(spec=GoogleSDKBridge)

@pytest_asyncio.fixture
def mock_a2a_protocol(): # Added as it's a dependency for TC
    return MagicMock(spec=A2AProtocol)


@pytest_asyncio.fixture
def trading_coordinator(
    mock_agent_management_service: AgentManagementService,
    mock_risk_manager_service: RiskManagerService,
    mock_compliance_service: RegulatoryComplianceService,
    mock_learning_logger_service: LearningDataLoggerService, # Added
    mock_simulated_executor: SimulatedTradeExecutor,
    mock_hyperliquid_executor: HyperliquidExecutionService,
    mock_dex_executor: DEXExecutionService,
    mock_trade_history_service: TradeHistoryService,
    mock_event_bus_service: EventBusService,
    mock_google_bridge: GoogleSDKBridge,
    mock_a2a_protocol: A2AProtocol
):
    return TradingCoordinator(
        agent_id="tc_test_agent",
        agent_management_service=mock_agent_management_service,
        risk_manager_service=mock_risk_manager_service,
        compliance_service=mock_compliance_service,
        learning_logger_service=mock_learning_logger_service, # Added
        google_bridge=mock_google_bridge,
        a2a_protocol=mock_a2a_protocol,
        simulated_trade_executor=mock_simulated_executor,
        hyperliquid_execution_service=mock_hyperliquid_executor,
        dex_execution_service=mock_dex_executor,
        trade_history_service=mock_trade_history_service,
        event_bus_service=mock_event_bus_service
    )

@pytest_asyncio.fixture # Added new fixture
def mock_learning_logger_service():
    return AsyncMock(spec=LearningDataLoggerService)

# Helper for creating agent config
def create_mock_agent_config(agent_id: str, agent_type: str = "GenericAgent") -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id, name=f"Agent {agent_id}", agent_type=agent_type,
        strategy=AgentStrategyConfig(strategy_name="test_strat"),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01)
    )

# --- Tests for Compliance Integration ---

DUMMY_USER_ID = "user_test_compliance"
DUMMY_AGENT_CONFIG = create_mock_agent_config(DUMMY_USER_ID, "TestComplianceAgent")

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock) # Keep this if you only test up to risk assessment
async def test_parse_crew_result_compliance_fail(
    mock_execute_decision: AsyncMock, # Mock for _execute_trade_decision
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_compliance_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    crew_result_dict = {"action": "BUY", "symbol": "BTC/USD", "quantity": 1.0, "price": "50000"}
    mock_agent_management_service.get_agent.return_value = DUMMY_AGENT_CONFIG
    mock_compliance_service.check_action_compliance.return_value = ComplianceCheckResult(is_compliant=False, violated_rules=[ViolatedRuleInfo(rule_id="test_rule", description="Test Violation", reason="Failing for test")])

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, DUMMY_USER_ID)

    mock_agent_management_service.get_agent.assert_called_once_with(DUMMY_USER_ID)
    mock_compliance_service.check_action_compliance.assert_called_once()
    mock_risk_manager_service.assess_trade_risk.assert_not_called()
    mock_execute_decision.assert_not_called()
    # Check learning log calls
    # Expected: InternalSignalGenerated, ComplianceCheckResult (fail)
    assert mock_learning_logger_service.log_entry.call_count >= 2
    # Example detailed check for one of the calls:
    # Find the call for ComplianceCheckResult
    compliance_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "ComplianceCheckResult"), None)
    assert compliance_log_call is not None
    log_entry_arg: LearningLogEntry = compliance_log_call[0][0]
    assert log_entry_arg.outcome_or_result["is_compliant"] is False

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_compliance_pass_risk_fail(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_compliance_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    crew_result_dict = {"action": "BUY", "symbol": "ETH/USD", "quantity": 10.0, "price": "3000"}
    mock_agent_management_service.get_agent.return_value = DUMMY_AGENT_CONFIG
    mock_compliance_service.check_action_compliance.return_value = ComplianceCheckResult(is_compliant=True)
    mock_risk_manager_service.assess_trade_risk.return_value = RiskAssessmentResponseData(signal_approved=False, rejection_reason="Too risky")

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, DUMMY_USER_ID)

    mock_agent_management_service.get_agent.assert_called_once_with(DUMMY_USER_ID)
    mock_compliance_service.check_action_compliance.assert_called_once()
    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    mock_execute_decision.assert_not_called()
    # Expected: InternalSignal, ComplianceCheckResult (pass), RiskAssessmentResult (fail)
    assert mock_learning_logger_service.log_entry.call_count >= 3
    risk_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "RiskAssessmentResult"), None)
    assert risk_log_call is not None
    assert risk_log_call[0][0].outcome_or_result["signal_approved"] is False


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_compliance_pass_risk_pass_executes(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_compliance_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    crew_result_dict = {"action": "SELL", "symbol": "SOL/USD", "quantity": 100.0, "price": "150"}
    mock_agent_management_service.get_agent.return_value = DUMMY_AGENT_CONFIG
    mock_compliance_service.check_action_compliance.return_value = ComplianceCheckResult(is_compliant=True)
    mock_risk_manager_service.assess_trade_risk.return_value = RiskAssessmentResponseData(signal_approved=True)
    mock_execution_outcome = {"status": "paper_executed", "details": "some_details"}
    mock_execute_decision.return_value = mock_execution_outcome

    expected_trade_params = {
        "action": "sell", "symbol": "SOL/USD", "quantity": 100.0,
        "order_type": "market", "price": 150.0,
        "stop_loss_price": None, "take_profit_price": None
    }

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, DUMMY_USER_ID)

    mock_agent_management_service.get_agent.assert_called_once_with(DUMMY_USER_ID)
    mock_compliance_service.check_action_compliance.assert_called_once()
    compliance_request_arg: ComplianceCheckRequest = mock_compliance_service.check_action_compliance.call_args[0][0]
    assert compliance_request_arg.agent_id == DUMMY_USER_ID
    assert compliance_request_arg.agent_type == DUMMY_AGENT_CONFIG.agent_type
    assert compliance_request_arg.trade_signal_payload.symbol == "SOL/USD"

    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    mock_execute_decision.assert_called_once_with(expected_trade_params, DUMMY_USER_ID)

    # Check learning log calls
    # Expected: InternalSignal, Compliance (Pass), Risk (Pass), ExecutionAttempt
    assert mock_learning_logger_service.log_entry.call_count >= 4
    exec_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "TradeExecutionAttempt"), None)
    assert exec_log_call is not None
    log_entry_arg: LearningLogEntry = exec_log_call[0][0]
    assert log_entry_arg.outcome_or_result == mock_execution_outcome
    assert log_entry_arg.primary_agent_id == DUMMY_USER_ID

@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_parse_crew_result_no_compliance_service_skips_check(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    trading_coordinator.compliance_service = None
    # Make learning logger None too for this specific test path if we want to test no learning log for compliance skip
    # trading_coordinator.learning_logger_service = None

    crew_result_dict = {"action": "BUY", "symbol": "ADA/USD", "quantity": 1000.0, "price": "0.5"}
    mock_agent_management_service.get_agent.return_value = DUMMY_AGENT_CONFIG
    mock_risk_manager_service.assess_trade_risk.return_value = RiskAssessmentResponseData(signal_approved=True)

    await trading_coordinator._parse_crew_result_and_execute(crew_result_dict, DUMMY_USER_ID)

    mock_agent_management_service.get_agent.assert_called_once_with(DUMMY_USER_ID)
    # mock_compliance_service.check_action_compliance is not asserted as it's None

    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    mock_execute_decision.assert_called_once()

    # Check for "ComplianceCheckSkipped" log
    skipped_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "ComplianceCheckSkipped"), None)
    assert skipped_log_call is not None
    assert skipped_log_call[0][0].data_snapshot["reason"] == "ComplianceService not available"


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_handle_external_trade_signal_compliance_fail(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_compliance_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    publisher_agent_id = "ext_signal_agent_compliance_fail"
    mock_publisher_config = create_mock_agent_config(publisher_agent_id, "ExtSignalAgent")
    signal_payload_data = {"symbol": "DOT/USD", "action": "buy", "quantity": 50.0, "price_target": 7.0}
    event = Event(event_id="evt_compliance_fail", publisher_agent_id=publisher_agent_id, message_type="TradeSignalEvent", payload=signal_payload_data)

    mock_agent_management_service.get_agent.return_value = mock_publisher_config
    mock_compliance_service.check_action_compliance.return_value = ComplianceCheckResult(is_compliant=False, violated_rules=[])

    await trading_coordinator.handle_external_trade_signal(event)

    mock_agent_management_service.get_agent.assert_called_once_with(publisher_agent_id)
    mock_compliance_service.check_action_compliance.assert_called_once()
    mock_risk_manager_service.assess_trade_risk.assert_not_called()
    mock_execute_decision.assert_not_called()

    # Check learning logs: ExternalSignalReceived, ComplianceCheckResult (fail)
    assert mock_learning_logger_service.log_entry.call_count >= 2
    compliance_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "ComplianceCheckResult"), None)
    assert compliance_log_call is not None
    assert compliance_log_call[0][0].outcome_or_result["is_compliant"] is False
    assert compliance_log_call[0][0].triggering_event_id == "evt_compliance_fail"


@pytest.mark.asyncio
@patch.object(TradingCoordinator, '_execute_trade_decision', new_callable=AsyncMock)
async def test_handle_external_trade_signal_compliance_pass_risk_pass(
    mock_execute_decision: AsyncMock,
    trading_coordinator: TradingCoordinator,
    mock_agent_management_service: MagicMock,
    mock_compliance_service: MagicMock,
    mock_risk_manager_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    publisher_agent_id = "ext_signal_agent_all_pass"
    mock_publisher_config = create_mock_agent_config(publisher_agent_id, "ExtSignalAgent")
    signal_payload_data = {"symbol": "LINK/USD", "action": "sell", "quantity": 20.0, "price_target": 15.0, "stop_loss": 16.0, "strategy_name": "ext_strat"}
    event = Event(event_id="evt_all_pass", publisher_agent_id=publisher_agent_id, message_type="TradeSignalEvent", payload=signal_payload_data)
    mock_execution_outcome = {"status": "live_executed", "details": "some_live_details"}
    mock_execute_decision.return_value = mock_execution_outcome

    mock_agent_management_service.get_agent.return_value = mock_publisher_config
    mock_compliance_service.check_action_compliance.return_value = ComplianceCheckResult(is_compliant=True)
    mock_risk_manager_service.assess_trade_risk.return_value = RiskAssessmentResponseData(signal_approved=True)

    expected_trade_params = {
        "action": "sell", "symbol": "LINK/USD", "quantity": 20.0,
        "order_type": "limit", "price": 15.0, "stop_loss_price": 16.0,
        "take_profit_price": None, "strategy_name": "ext_strat", "confidence": None
    }
    await trading_coordinator.handle_external_trade_signal(event)

    mock_agent_management_service.get_agent.assert_called_once_with(publisher_agent_id)
    mock_compliance_service.check_action_compliance.assert_called_once()
    mock_risk_manager_service.assess_trade_risk.assert_called_once()
    mock_execute_decision.assert_called_once_with(expected_trade_params, publisher_agent_id)

    # Check learning logs: ExternalSignal, Compliance (Pass), Risk (Pass), ExecutionAttempt
    assert mock_learning_logger_service.log_entry.call_count >= 4
    exec_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "TradeExecutionAttempt"), None)
    assert exec_log_call is not None
    log_entry_arg: LearningLogEntry = exec_log_call[0][0]
    assert log_entry_arg.outcome_or_result == mock_execution_outcome
    assert log_entry_arg.triggering_event_id == "evt_all_pass"


# Minimal test to ensure __init__ accepts compliance_service and learning_logger_service
def test_trading_coordinator_init_with_all_services(
    mock_agent_management_service, mock_risk_manager_service, mock_compliance_service,
    mock_learning_logger_service, # Added
    mock_simulated_executor, mock_hyperliquid_executor, mock_dex_executor,
    mock_trade_history_service, mock_event_bus_service, mock_google_bridge, mock_a2a_protocol
):
    tc = TradingCoordinator(
        "agent_id", mock_agent_management_service, mock_risk_manager_service,
        mock_compliance_service,
        mock_learning_logger_service, # Added
        mock_google_bridge, mock_a2a_protocol,
        mock_simulated_executor, mock_hyperliquid_executor, mock_dex_executor,
        mock_trade_history_service, mock_event_bus_service
    )
    assert tc.compliance_service == mock_compliance_service
    assert tc.learning_logger_service == mock_learning_logger_service # Added
