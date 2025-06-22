import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import List, Dict, Any, Optional

from python_ai_services.services.news_analysis_service import NewsAnalysisService
from python_ai_services.services.event_bus_service import EventBusService
from python_ai_services.services.learning_data_logger_service import LearningDataLoggerService
from python_ai_services.models.agent_models import AgentConfigOutput, AgentStrategyConfig, AgentRiskConfig
from python_ai_services.models.event_bus_models import Event, NewsArticleEventPayload
from python_ai_services.models.learning_models import LearningLogEntry
from datetime import datetime, timezone
import feedparser # For mocking feedparser.parse

# --- Fixtures ---
@pytest_asyncio.fixture
def mock_event_bus():
    return AsyncMock(spec=EventBusService)

@pytest_asyncio.fixture
def mock_learning_logger_service():
    return AsyncMock(spec=LearningDataLoggerService)

def create_news_agent_config(
    agent_id: str,
    rss_urls: List[str],
    symbols_of_interest: Optional[List[str]] = None,
    keywords_pos: Optional[List[str]] = None,
    keywords_neg: Optional[List[str]] = None,
    fetch_limit: Optional[int] = 5
) -> AgentConfigOutput:
    news_params = AgentStrategyConfig.NewsAnalysisParams(
        rss_feed_urls=rss_urls,
        symbols_of_interest=symbols_of_interest if symbols_of_interest is not None else [],
        keywords_positive=keywords_pos if keywords_pos is not None else ["good", "positive"],
        keywords_negative=keywords_neg if keywords_neg is not None else ["bad", "negative"],
        fetch_limit_per_feed=fetch_limit
    )
    return AgentConfigOutput(
        agent_id=agent_id, name=f"NewsAgent_{agent_id}", agent_type="NewsAnalysisAgent",
        strategy=AgentStrategyConfig(strategy_name="NewsStrategy", news_analysis_params=news_params),
        risk_config=AgentRiskConfig(max_capital_allocation_usd=1000, risk_per_trade_percentage=0.01) # Dummy
    )

@pytest_asyncio.fixture
def news_service(
    mock_event_bus: EventBusService,
    mock_learning_logger_service: LearningDataLoggerService
) -> NewsAnalysisService:
    # Default config for the service fixture
    agent_config = create_news_agent_config("news_test_agent", rss_urls=["http://test.feed/rss"])
    return NewsAnalysisService(
        agent_config=agent_config,
        event_bus=mock_event_bus,
        learning_logger_service=mock_learning_logger_service
    )

# Mock feedparser.parse response
def create_mock_feed(entries_data: List[Dict[str, Any]]):
    feed = MagicMock()
    feed.entries = []
    for entry_data in entries_data:
        mock_entry = MagicMock()
        for key, value in entry_data.items():
            setattr(mock_entry, key, value)
        # Ensure 'link' is present for processed_links set
        if 'link' not in entry_data: mock_entry.link = f"http://mock.link/{uuid.uuid4()}"
        feed.entries.append(mock_entry)
    return feed

# --- Test Cases ---
@pytest.mark.asyncio
@patch('feedparser.parse') # Patch feedparser.parse at the global level where it's imported
async def test_fetch_and_analyze_positive_news_logged(
    mock_feedparser_parse: MagicMock, # Corresponds to @patch
    news_service: NewsAnalysisService,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    symbol = "BTC"
    news_service.params.symbols_of_interest = [symbol] # Configure service instance

    mock_entry_data = [{
        "title": "BTC Skyrockets!", "summary": "Bitcoin price hits new all-time high, very good news.",
        "link": "http://news.com/btc_good",
        "published_parsed": datetime.now(timezone.utc).timetuple() # feedparser uses time.struct_time
    }]
    mock_feedparser_parse.return_value = create_mock_feed(mock_entry_data)

    await news_service.fetch_and_analyze_feeds()

    mock_event_bus.publish.assert_called_once()
    published_event: Event = mock_event_bus.publish.call_args[0][0]
    assert published_event.message_type == "NewsArticleEvent"
    payload = NewsArticleEventPayload(**published_event.payload)
    assert payload.sentiment_label == "positive"
    assert symbol in payload.mentioned_symbols

    # Check learning log
    mock_learning_logger_service.log_entry.assert_called_once()
    learning_entry: LearningLogEntry = mock_learning_logger_service.log_entry.call_args[0][0]
    assert learning_entry.event_type == "NewsArticleProcessed"
    assert learning_entry.primary_agent_id == news_service.agent_config.agent_id
    assert learning_entry.data_snapshot["headline"] == "BTC Skyrockets!"
    assert learning_entry.data_snapshot["sentiment_label"] == "positive"
    assert "news_analysis" in learning_entry.tags
    assert "positive" in learning_entry.tags
    assert f"symbol:{symbol}" in learning_entry.tags

@pytest.mark.asyncio
@patch('feedparser.parse')
async def test_fetch_and_analyze_no_feeds_configured(
    mock_feedparser_parse: MagicMock,
    news_service: NewsAnalysisService,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock
):
    news_service.params.rss_feed_urls = [] # No feeds

    await news_service.fetch_and_analyze_feeds()

    mock_feedparser_parse.assert_not_called()
    mock_event_bus.publish.assert_not_called()
    mock_learning_logger_service.log_entry.assert_not_called() # No articles processed

@pytest.mark.asyncio
@patch('feedparser.parse')
async def test_fetch_and_analyze_feed_error(
    mock_feedparser_parse: MagicMock,
    news_service: NewsAnalysisService,
    mock_event_bus: MagicMock,
    mock_learning_logger_service: MagicMock,
    caplog
):
    mock_feedparser_parse.side_effect = Exception("Failed to fetch")

    await news_service.fetch_and_analyze_feeds() # URL is "http://test.feed/rss" from fixture

    mock_event_bus.publish.assert_not_called()
    mock_learning_logger_service.log_entry.assert_not_called()
    assert f"Error fetching or parsing feed http://test.feed/rss: Failed to fetch" in caplog.text

# Need uuid for mock_entry.link default value if not provided in test data
import uuid
