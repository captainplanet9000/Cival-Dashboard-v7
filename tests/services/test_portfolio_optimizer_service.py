import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, call
from typing import List, Dict, Any, Optional, Literal # Added Literal

from python_ai_services.services.portfolio_optimizer_service import PortfolioOptimizerService
from python_ai_services.services.agent_management_service import AgentManagementService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.models.agent_models import (
    AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig,
    AgentUpdateRequest
)
from python_ai_services.models.event_bus_models import Event, MarketConditionEventPayload, NewsArticleEventPayload
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService # Added
from python_ai_services.models.learning_models import LearningLogEntry # Added
from datetime import datetime, timezone

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_agent_management_service() -> AgentManagementService:
    service = AsyncMock(spec=AgentManagementService)
    service.get_agent = AsyncMock()
    service.get_agents = AsyncMock()
    service.update_agent = AsyncMock()
    return service

@pytest_asyncio.fixture
def mock_event_bus() -> EventBusService:
    service = AsyncMock(spec=EventBusService)
    service.subscribe = AsyncMock()
    service.publish = AsyncMock()
    return service

@pytest_asyncio.fixture # Added
def mock_learning_logger_service() -> LearningDataLoggerService:
    service = AsyncMock(spec=LearningDataLoggerService)
    service.log_entry = AsyncMock()
    return service

@pytest_asyncio.fixture # Added central fixture for the service
def optimizer_service( # Renamed from optimizer_service_fixture for consistency
    mock_agent_management_service: AgentManagementService,
    mock_event_bus: EventBusService,
    mock_learning_logger_service: LearningDataLoggerService
) -> PortfolioOptimizerService:
    default_rule = AgentStrategyConfig.PortfolioOptimizerRule(rule_name="DefaultRuleForFixture")
    default_optimizer_config = create_optimizer_agent_config("optimizer_fixture_agent", rules=[default_rule])

    service = PortfolioOptimizerService(
        agent_config=default_optimizer_config,
        agent_management_service=mock_agent_management_service,
        event_bus=mock_event_bus,
        learning_logger_service=mock_learning_logger_service
    )
    return service

# Helper to create AgentConfigOutput for PortfolioOptimizerAgent
def create_optimizer_agent_config(
    agent_id: str,
    rules: List[AgentStrategyConfig.PortfolioOptimizerRule]
) -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id, name=f"Optimizer_{agent_id}", agent_type="PortfolioOptimizerAgent",
        strategy=AgentStrategyConfig(
            strategy_name="PortfolioOptimizerStrategy",
            portfolio_optimizer_params=AgentStrategyConfig.PortfolioOptimizerParams(rules=rules)
        ),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0),
        is_active=True, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )

# Helper to create AgentConfigOutput for a target agent
def create_target_agent_config(
    agent_id: str, agent_type: str = "GenericAgent",
    is_active: bool = True, op_params: Optional[Dict[str, Any]] = None,
    watched_symbols: Optional[List[str]] = None
) -> AgentConfigOutput:
    return AgentConfigOutput(
        agent_id=agent_id, name=f"Target_{agent_id}", agent_type=agent_type,
        strategy=AgentStrategyConfig(
            strategy_name="some_strat",
            parameters={},
            watched_symbols=watched_symbols if watched_symbols is not None else []
        ),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01),
        is_active=is_active, operational_parameters=op_params if op_params else {},
        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
    )

# --- Test Cases ---
@pytest.mark.asyncio
async def test_portfolio_optimizer_init_and_subscriptions(
    optimizer_service: PortfolioOptimizerService, # Use fixture
    mock_event_bus: MagicMock
):
    assert optimizer_service.params.rules[0].rule_name == "DefaultRuleForFixture"
    assert optimizer_service.learning_logger_service is not None

    await optimizer_service.setup_subscriptions()
    expected_calls = [
        call("MarketConditionEvent", optimizer_service.on_market_condition_event),
        call("NewsArticleEvent", optimizer_service.on_news_article_event)
    ]
    mock_event_bus.subscribe.assert_has_calls(expected_calls, any_order=True)
    assert mock_event_bus.subscribe.call_count == 2


@pytest.mark.asyncio
async def test_optimizer_init_no_params(
    mock_agent_management_service: MagicMock,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    agent_config_no_params = AgentConfigOutput(
        agent_id="opt_no_params", name="OptimizerNoParams", agent_type="PortfolioOptimizerAgent",
        strategy=AgentStrategyConfig(strategy_name="PortfolioOptimizerStrategy"),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=0, risk_per_trade_percentage=0)
    )
    service = PortfolioOptimizerService(
        agent_config_no_params,
        mock_agent_management_service,
        mock_event_bus,
        mock_learning_logger_service # Added
    )
    assert service.params.rules == []

@pytest.mark.asyncio
async def test_on_market_condition_event_no_matching_rule(
    optimizer_service: PortfolioOptimizerService, # Use fixture
    mock_learning_logger_service: MagicMock # Added
):
    # Configure specific rules for this test if needed
    custom_rules = [AgentStrategyConfig.PortfolioOptimizerRule(if_market_regime="trending_up")]
    optimizer_service.params.rules = custom_rules

    optimizer_service._apply_rule_to_targets = AsyncMock()

    event_payload = MarketConditionEventPayload(symbol="BTC/USD", regime="ranging")
    event = Event(event_id="evt1", publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

    await optimizer_service.on_market_condition_event(event)
    optimizer_service._apply_rule_to_targets.assert_not_called()
    # Assert that OptimizerRuleMatched was NOT logged
    matched_log_call = next((c for c in mock_learning_logger_service.log_entry.call_args_list if c[0][0].event_type == "OptimizerRuleMatched"), None)
    assert matched_log_call is None


@pytest.mark.asyncio
async def test_on_market_condition_event_applies_rule_target_id(
    optimizer_service: PortfolioOptimizerService, # Use fixture
    mock_agent_management_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    target_agent_id = "target_agent_for_id_rule"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="ActivateAgentOnTrendingUp",
        if_market_regime="trending_up",
        target_agent_id=target_agent_id,
        set_is_active=True,
        set_operational_parameters={"risk_factor": 0.5}
    )
    optimizer_service.params.rules = [rule] # Override rules from fixture

    target_agent_initial_config = create_target_agent_config(target_agent_id, is_active=False, op_params={"risk_factor": 1.0, "another_param": "value"})
    mock_agent_management_service.get_agent = AsyncMock(return_value=target_agent_initial_config)

    with patch.object(optimizer_service, '_apply_rule_to_targets', wraps=optimizer_service._apply_rule_to_targets) as spy_apply_rule:
        event_payload = MarketConditionEventPayload(symbol="ETH/USD", regime="trending_up")
        event = Event(event_id="evt_mc_apply_id", publisher_agent_id="mcc1", message_type="MarketConditionEvent", payload=event_payload.model_dump())

        await optimizer_service.on_market_condition_event(event)

        spy_apply_rule.assert_called_once_with(rule, event_context=event_payload, event_type="market_condition", trigger_event_id="evt_mc_apply_id")
        mock_agent_management_service.update_agent.assert_called_once()

        # Check learning logs
        log_calls = mock_learning_logger_service.log_entry.call_args_list
        assert any(c[0][0].event_type == "OptimizerRuleMatched" and c[0][0].triggering_event_id == "evt_mc_apply_id" for c in log_calls)
        assert any(c[0][0].event_type == "OptimizerAgentConfigUpdateAttempt" and c[0][0].data_snapshot["target_agent_id"] == target_agent_id for c in log_calls)
        assert any(c[0][0].event_type == "OptimizerAgentConfigUpdateResult" and c[0][0].outcome_or_result["success"] is True for c in log_calls)


# --- Tests for on_news_article_event (with learning log checks) ---
@pytest.mark.asyncio
async def test_on_news_article_event_no_matching_sentiment_rule(
    optimizer_service: PortfolioOptimizerService,
    mock_learning_logger_service: MagicMock
):
    custom_rules = [AgentStrategyConfig.PortfolioOptimizerRule(if_news_sentiment_is="positive")]
    optimizer_service.params.rules = custom_rules
    optimizer_service._apply_rule_to_targets = AsyncMock()

    news_payload = NewsArticleEventPayload(article_id="news1", title="Great News", sentiment_label="neutral", mentioned_symbols=["SYM1"])
    event = Event(event_id="evt_news1", publisher_agent_id="news_agent", message_type="NewsArticleEvent", payload=news_payload.model_dump())

    await optimizer_service.on_news_article_event(event)
    optimizer_service._apply_rule_to_targets.assert_not_called()
    assert not any(c[0][0].event_type == "OptimizerRuleMatched" for c in mock_learning_logger_service.log_entry.call_args_list)


@pytest.mark.asyncio
async def test_on_news_article_event_applies_rule_with_symbol_intersection(
    optimizer_service: PortfolioOptimizerService,
    mock_agent_management_service: MagicMock,
    mock_learning_logger_service: MagicMock
):
    target_agent_type = "NewsReactiveTrader"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="BoostOnNegativeNews", if_news_sentiment_is="negative",
        target_agent_type=target_agent_type, set_operational_parameters={"aggression": 1.5}
    )
    optimizer_service.params.rules = [rule]

    target1_conf = create_target_agent_config("target1_news", agent_type=target_agent_type, watched_symbols=["SYM1"], op_params={"aggression": 1.0})
    mock_agent_management_service.get_agents = AsyncMock(return_value=[target1_conf])

    with patch.object(optimizer_service, '_apply_rule_to_targets', wraps=optimizer_service._apply_rule_to_targets) as spy_apply_rule:
        news_payload = NewsArticleEventPayload(sentiment_label="negative", mentioned_symbols=["SYM1"])
        event = Event(event_id="evt_news_apply_sym_intersect", publisher_agent_id="news_agent", message_type="NewsArticleEvent", payload=news_payload.model_dump())
        await optimizer_service.on_news_article_event(event)

        spy_apply_rule.assert_called_once()
        mock_agent_management_service.update_agent.assert_called_once()

        log_calls = mock_learning_logger_service.log_entry.call_args_list
        assert any(c[0][0].event_type == "OptimizerRuleMatched" and c[0][0].triggering_event_id == "evt_news_apply_sym_intersect" for c in log_calls)
        update_attempt_log = next((c[0][0] for c in log_calls if c[0][0].event_type == "OptimizerAgentConfigUpdateAttempt"), None)
        assert update_attempt_log is not None
        assert update_attempt_log.data_snapshot["update_payload"]["operational_parameters"] == {"aggression": 1.5}
        assert any(c[0][0].event_type == "OptimizerAgentConfigUpdateResult" and c[0][0].outcome_or_result["success"] is True for c in log_calls)

# (Keep other existing tests like no_symbol_intersection, invalid_payload, and ensure they use optimizer_service fixture and mock_learning_logger_service if relevant)
# For brevity, only showing additions/key modifications for learning logger integration.
# The other tests like test_on_news_article_event_no_symbol_filter_in_event,
# test_on_news_article_event_no_symbol_intersection, test_on_news_article_event_invalid_payload
# would need to be updated to use the `optimizer_service` fixture and pass `mock_learning_logger_service`
# and potentially check that `OptimizerRuleMatched` is NOT called if no rule matches, or that specific logs are made.

@pytest.mark.asyncio
async def test_on_news_article_event_applies_rule_no_symbol_filter_in_event( # Added this missing test from previous state
    optimizer_service: PortfolioOptimizerService,
    mock_agent_management_service: MagicMock,
    mock_learning_logger_service: MagicMock
):
    target_agent_id = "target_for_news_any_sym"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(
        rule_name="ActivateOnPositiveNews", if_news_sentiment_is="positive",
        target_agent_id=target_agent_id, set_is_active=True
    )
    optimizer_service.params.rules = [rule]

    target_agent_conf = create_target_agent_config(target_agent_id, is_active=False, watched_symbols=["TARGET_SYM"])
    mock_agent_management_service.get_agent = AsyncMock(return_value=target_agent_conf)

    with patch.object(optimizer_service, '_apply_rule_to_targets', wraps=optimizer_service._apply_rule_to_targets) as spy_apply_rule:
        news_payload = NewsArticleEventPayload(
            article_id="news_any_sym_event", title="Market is Up!", sentiment_label="positive",
            mentioned_symbols=[]
        )
        event = Event(event_id="evt_news_any_sym", publisher_agent_id="news_agent", message_type="NewsArticleEvent", payload=news_payload.model_dump())

        await optimizer_service.on_news_article_event(event)

        spy_apply_rule.assert_called_once_with(rule, event_context=news_payload, event_type="news", trigger_event_id="evt_news_any_sym")
        mock_agent_management_service.update_agent.assert_called_once()
        # Assert learning logs
        log_calls = mock_learning_logger_service.log_entry.call_args_list
        assert any(c[0][0].event_type == "OptimizerRuleMatched" for c in log_calls)
        assert any(c[0][0].event_type == "OptimizerAgentConfigUpdateAttempt" for c in log_calls)
        assert any(c[0][0].event_type == "OptimizerAgentConfigUpdateResult" and c[0][0].outcome_or_result["success"] is True for c in log_calls)


@pytest.mark.asyncio
async def test_on_news_article_event_no_symbol_intersection(
    optimizer_service: PortfolioOptimizerService, # Use fixture
    mock_agent_management_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    target_agent_type = "NewsReactiveTrader"
    rule = AgentStrategyConfig.PortfolioOptimizerRule(if_news_sentiment_is="positive", target_agent_type=target_agent_type, rule_name="PositiveNewsRule")
    optimizer_service.params.rules = [rule] # Override default rules

    target_agent_conf = create_target_agent_config("target_news_no_match", agent_type=target_agent_type, watched_symbols=["OTHER_SYM"])
    mock_agent_management_service.get_agents = AsyncMock(return_value=[target_agent_conf])

    # Spy on _apply_rule_to_targets to ensure it's called, but let it run
    with patch.object(optimizer_service, '_apply_rule_to_targets', wraps=optimizer_service._apply_rule_to_targets) as spy_apply_rule:
        news_payload = NewsArticleEventPayload(sentiment_label="positive", mentioned_symbols=["SYM1", "SYM2"])
        event = Event(event_id="evt_news_no_intersect", publisher_agent_id="news_agent", message_type="NewsArticleEvent", payload=news_payload.model_dump())
        await optimizer_service.on_news_article_event(event)

        spy_apply_rule.assert_called_once() # Rule matched sentiment, so _apply_rule_to_targets is called
        mock_agent_management_service.update_agent.assert_not_called() # But no agent update due to no symbol intersection

        # Check learning logs: OptimizerRuleMatched (but no update logs or SkippedUpdate log if that's added)
        log_calls = mock_learning_logger_service.log_entry.call_args_list
        assert any(c[0][0].event_type == "OptimizerRuleMatched" and c[0][0].triggering_event_id == "evt_news_no_intersect" for c in log_calls)
        # Depending on whether _apply_rule_to_targets logs a "no targets found" or "skipped update", that could be asserted here.
        # The current _apply_rule_to_targets logs "No final target agents to apply rule..." - this is not a learning log yet.
        # It then calls _log_learning_event for "OptimizerAgentConfigUpdateSkipped" if no effective changes.
        # In this case, final_target_agents is empty, so it returns early.
        # If it logged "OptimizerRuleApplicationResult" with outcome "no_targets_matched_symbols", that would be more specific.
        # For now, just check no update attempt was logged.
        assert not any(c[0][0].event_type == "OptimizerAgentConfigUpdateAttempt" for c in log_calls)


@pytest.mark.asyncio
async def test_on_news_article_event_invalid_payload(
    optimizer_service: PortfolioOptimizerService, # Use fixture
    mock_agent_management_service: MagicMock,
    mock_learning_logger_service: MagicMock # Added
):
    rule = AgentStrategyConfig.PortfolioOptimizerRule(if_news_sentiment_is="positive", rule_name="PositiveNewsRule")
    optimizer_service.params.rules = [rule] # Override

    invalid_payload_event = Event(event_id="evt_news_bad", publisher_agent_id="news_agent", message_type="NewsArticleEvent", payload={"bad_data": True})
    with patch.object(optimizer_service.logger, 'error') as mock_log_error: # Still check regular error log
        await optimizer_service.on_news_article_event(invalid_payload_event)
        mock_log_error.assert_called_once()
        assert "Failed to parse NewsArticleEventPayload" in mock_log_error.call_args[0][0]

    mock_agent_management_service.update_agent.assert_not_called()
    # Check that no "OptimizerRuleMatched" learning log was made
    assert not any(c[0][0].event_type == "OptimizerRuleMatched" for c in mock_learning_logger_service.log_entry.call_args_list)

