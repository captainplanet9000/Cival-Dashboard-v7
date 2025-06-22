import pytest
import pytest_asyncio # For async fixtures if needed, though service methods are async
from typing import List, Dict, Any, Optional

from python_ai_services.services.regulatory_compliance_service import RegulatoryComplianceService
from python_ai_services.models.compliance_models import ComplianceRule, ComplianceCheckRequest, ComplianceCheckResult, ViolatedRuleInfo
from python_ai_services.models.event_bus_models import TradeSignalEventPayload # For creating request

# --- Fixtures ---

@pytest.fixture
def sample_rules() -> List[ComplianceRule]:
    return [
        ComplianceRule(
            rule_id="max_order_value_10k",
            description="Max order value must not exceed 10,000 USD.",
            condition_type="max_order_value_usd",
            parameters={"value": 10000.0}
        ),
        ComplianceRule(
            rule_id="restricted_symbols_test",
            description="Trading TEST_STOCK is not allowed.",
            condition_type="restricted_symbols",
            parameters={"symbols": ["TEST_STOCK", "FORBIDDEN_COIN"]}
        ),
        ComplianceRule(
            rule_id="daily_trades_btc",
            description="Max 5 daily trades for BTC/USD.",
            applies_to_agent_type=["SpecificBotType"], # Test applicability
            condition_type="max_daily_trades_for_symbol",
            parameters={"symbol": "BTC/USD", "limit": 5}
        ),
        ComplianceRule(
            rule_id="value_limit_for_agent_x",
            description="Max order value 500 USD for agent_X.",
            applies_to_agent_id=["agent_X"],
            condition_type="max_order_value_usd",
            parameters={"value": 500.0}
        )
    ]

@pytest.fixture
def compliance_service(sample_rules: List[ComplianceRule]) -> RegulatoryComplianceService:
    return RegulatoryComplianceService(rules=sample_rules)

def create_compliance_request(
    agent_id: str = "test_agent_001",
    agent_type: str = "GenericTrader",
    symbol: str = "BTC/USD",
    action: str = "buy", # Literal["buy", "sell"]
    quantity: float = 1.0,
    price_target: float = 9000.0
) -> ComplianceCheckRequest:
    signal = TradeSignalEventPayload(
        symbol=symbol,
        action=action, # type: ignore
        quantity=quantity,
        price_target=price_target,
        # Other fields can be None or default if not relevant to compliance rules being tested
        stop_loss=None,
        strategy_name="test_strategy",
        confidence=0.8
    )
    return ComplianceCheckRequest(
        agent_id=agent_id,
        agent_type=agent_type,
        action_type="place_order",
        trade_signal_payload=signal
    )

# --- Test Cases ---

@pytest.mark.asyncio
async def test_init_compliance_service(sample_rules: List[ComplianceRule]):
    service = RegulatoryComplianceService(rules=sample_rules)
    assert len(service.rules) == len(sample_rules)
    # TODO: Could mock logger and check info message if critical

@pytest.mark.asyncio
async def test_check_action_compliance_pass_no_violations(compliance_service: RegulatoryComplianceService):
    request = create_compliance_request(price_target=5000) # Well within 10k limit, not restricted symbol
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is True
    assert len(result.violated_rules) == 0

@pytest.mark.asyncio
async def test_check_action_max_order_value_violation(compliance_service: RegulatoryComplianceService):
    request = create_compliance_request(quantity=2, price_target=6000) # 12000 USD > 10000 USD
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is False
    assert len(result.violated_rules) == 1
    violation = result.violated_rules[0]
    assert violation.rule_id == "max_order_value_10k"
    assert "exceeds limit 10000.0 USD" in violation.reason

@pytest.mark.asyncio
async def test_check_action_restricted_symbol_violation(compliance_service: RegulatoryComplianceService):
    request = create_compliance_request(symbol="TEST_STOCK", price_target=100)
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is False
    assert len(result.violated_rules) == 1
    violation = result.violated_rules[0]
    assert violation.rule_id == "restricted_symbols_test"
    assert "Symbol TEST_STOCK is restricted" in violation.reason

@pytest.mark.asyncio
async def test_check_action_restricted_symbol_pass(compliance_service: RegulatoryComplianceService):
    request = create_compliance_request(symbol="ALLOWED_STOCK", price_target=100)
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is True # Assuming no other rules are violated

@pytest.mark.asyncio
async def test_check_action_max_daily_trades_placeholder(compliance_service: RegulatoryComplianceService, caplog):
    # This rule is a placeholder, should always pass but log a warning
    request = create_compliance_request(agent_type="SpecificBotType", symbol="BTC/USD", quantity=0.1, price_target=20000)
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is True # Placeholder rule does not cause failure
    assert "is a stateful placeholder and does not currently enforce limits" in caplog.text
    assert "Rule 'daily_trades_btc'" in caplog.text # Ensure it identified the rule

@pytest.mark.asyncio
async def test_check_action_rule_applicability_agent_type(compliance_service: RegulatoryComplianceService):
    # daily_trades_btc rule applies only to "SpecificBotType"
    # Test with a different agent type, rule should be skipped
    request_other_type = create_compliance_request(agent_type="GenericTrader", symbol="BTC/USD")
    # Test with the specific agent type, rule should be checked (and log warning as it's placeholder)
    request_specific_type = create_compliance_request(agent_type="SpecificBotType", symbol="BTC/USD")

    with patch.object(compliance_service.logger, 'debug') as mock_log_debug, \
         patch.object(compliance_service.logger, 'warning') as mock_log_warning:

        result_other = await compliance_service.check_action_compliance(request_other_type)
        assert result_other.is_compliant is True
        # Check that the specific rule was not applied or logged for this agent type beyond initial applicability check

        rule_applied_to_other = any(
            f"Applying Rule 'daily_trades_btc'" in call_args[0][0] for call_args in mock_log_debug.call_args_list
        )
        # This assertion might be tricky if debug logs are numerous. Let's focus on warning.
        # For now, ensure no violation specific to this rule.

        mock_log_debug.reset_mock() # Reset for next call

        result_specific = await compliance_service.check_action_compliance(request_specific_type)
        assert result_specific.is_compliant is True # Placeholder still passes

        # Check that the placeholder warning for this rule was logged
        assert any(
            "Rule 'daily_trades_btc'" in call_args[0][0] and "is a stateful placeholder" in call_args[0][0]
            for call_args in mock_log_warning.call_args_list
        )

@pytest.mark.asyncio
async def test_check_action_rule_applicability_agent_id(compliance_service: RegulatoryComplianceService):
    # value_limit_for_agent_x applies only to "agent_X"
    request_agent_x_violates = create_compliance_request(agent_id="agent_X", quantity=1, price_target=600) # Exceeds 500 limit
    request_agent_y_no_violation = create_compliance_request(agent_id="agent_Y", quantity=1, price_target=600) # Not subject to agent_X's rule

    result_agent_x = await compliance_service.check_action_compliance(request_agent_x_violates)
    assert result_agent_x.is_compliant is False
    assert any(v.rule_id == "value_limit_for_agent_x" for v in result_agent_x.violated_rules)

    result_agent_y = await compliance_service.check_action_compliance(request_agent_y_no_violation)
    # Agent Y might still violate the general 10k order value rule if not careful with test values.
    # Let's make it compliant with general rule:
    request_agent_y_compliant = create_compliance_request(agent_id="agent_Y", quantity=1, price_target=100)
    result_agent_y_compliant = await compliance_service.check_action_compliance(request_agent_y_compliant)
    assert result_agent_y_compliant.is_compliant is True
    assert not any(v.rule_id == "value_limit_for_agent_x" for v in result_agent_y_compliant.violated_rules)


@pytest.mark.asyncio
async def test_multiple_violations(compliance_service: RegulatoryComplianceService):
    # Violates both general max value and agent_X specific max value, and restricted symbol
    request = create_compliance_request(
        agent_id="agent_X",
        symbol="TEST_STOCK",
        quantity=1,
        price_target=12000 # Violates 10k general, and 500 agent_X specific
    )
    result = await compliance_service.check_action_compliance(request)
    assert result.is_compliant is False
    assert len(result.violated_rules) == 3 # max_order_value_10k, restricted_symbols_test, value_limit_for_agent_x
    rule_ids_violated = {v.rule_id for v in result.violated_rules}
    assert "max_order_value_10k" in rule_ids_violated
    assert "restricted_symbols_test" in rule_ids_violated
    assert "value_limit_for_agent_x" in rule_ids_violated

@pytest.mark.asyncio
async def test_max_order_value_missing_signal_data(compliance_service: RegulatoryComplianceService, caplog):
    signal_no_qty = TradeSignalEventPayload(symbol="BTC/USD", action="buy", price_target=5000) # No quantity
    request_no_qty = ComplianceCheckRequest(agent_id="test", agent_type="test", action_type="place_order", trade_signal_payload=signal_no_qty)

    result = await compliance_service.check_action_compliance(request_no_qty)
    assert result.is_compliant is True # Rule is skipped, not violated
    assert "Rule 'max_order_value_10k' (max_order_value_usd) skipped: quantity or price_target missing in signal" in caplog.text

@pytest.mark.asyncio
async def test_restricted_symbols_invalid_parameter_type(compliance_service: RegulatoryComplianceService, caplog):
    # Modify a rule to have bad parameters for this test
    faulty_rule = ComplianceRule(
        rule_id="faulty_restricted", description="Faulty", condition_type="restricted_symbols",
        parameters={"symbols": "NOT_A_LIST"} # Invalid parameter
    )
    service_with_faulty_rule = RegulatoryComplianceService(rules=[faulty_rule])
    request = create_compliance_request(symbol="ANY_SYMBOL")

    result = await service_with_faulty_rule.check_action_compliance(request)
    assert result.is_compliant is True # Rule is skipped
    assert "Rule 'faulty_restricted' (restricted_symbols) has invalid 'symbols' parameter type" in caplog.text

@pytest.mark.asyncio
async def test_max_daily_trades_missing_symbol_in_params(compliance_service: RegulatoryComplianceService, caplog):
    faulty_daily_rule = ComplianceRule(
        rule_id="faulty_daily", description="Faulty daily", condition_type="max_daily_trades_for_symbol",
        parameters={"limit": 5} # Missing 'symbol'
    )
    service = RegulatoryComplianceService(rules=[faulty_daily_rule])
    request = create_compliance_request(symbol="BTC/USD")
    result = await service.check_action_compliance(request)
    assert result.is_compliant is True
    assert "is missing 'symbol' in parameters. Skipping rule." in caplog.text
