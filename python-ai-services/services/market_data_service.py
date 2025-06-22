from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from loguru import logger
from python_ai_services.models.market_data_models import Kline, OrderBookSnapshot, Trade
from python_ai_services.utils.hyperliquid_data_fetcher import HyperliquidMarketDataFetcher, HyperliquidMarketDataFetcherError

class MarketDataServiceError(Exception):
    pass

class MarketDataService:
    def __init__(self, fetcher: HyperliquidMarketDataFetcher):
        if not fetcher:
            logger.error("MarketDataService initialized with no fetcher.")
            raise ValueError("HyperliquidMarketDataFetcher instance is required.")
        self.fetcher = fetcher
        logger.info("MarketDataService initialized with HyperliquidMarketDataFetcher.")

    async def get_historical_klines(
        self,
        symbol: str,
        interval: str,
        start_time: datetime,
        end_time: datetime,
        # limit: int = 100 # Limit is often implicit in start/end for klines, or handled by fetcher if applicable
    ) -> List[Kline]:
        logger.info(f"MarketDataService: Fetching klines for {symbol} (interval: {interval}) from {start_time} to {end_time}")

        if not symbol:
            raise MarketDataServiceError("Symbol must be provided for fetching klines.")
        if not interval:
            raise MarketDataServiceError("Interval must be provided for fetching klines.")
        if not start_time or not end_time:
            raise MarketDataServiceError("Start time and end time must be provided for fetching klines.")
        if start_time >= end_time:
            raise MarketDataServiceError("Start time must be before end time.")

        # Convert datetimes to milliseconds for Hyperliquid API
        start_time_ms = int(start_time.timestamp() * 1000)
        end_time_ms = int(end_time.timestamp() * 1000)

        try:
            klines = await self.fetcher.get_klines(
                symbol=symbol,
                interval=interval,
                start_time_ms=start_time_ms,
                end_time_ms=end_time_ms
            )
            logger.info(f"MarketDataService: Successfully fetched {len(klines)} klines for {symbol}.")
            return klines
        except HyperliquidMarketDataFetcherError as e:
            logger.error(f"MarketDataService: Error fetching klines for {symbol}: {e}")
            raise MarketDataServiceError(f"Failed to fetch klines for {symbol}: {e}")
        except Exception as e: # Catch any other unexpected errors
            logger.error(f"MarketDataService: Unexpected error fetching klines for {symbol}: {e}")
            raise MarketDataServiceError(f"An unexpected error occurred while fetching klines for {symbol}.")

    async def get_current_order_book(self, symbol: str, n_levels: int = 20) -> OrderBookSnapshot:
        logger.info(f"MarketDataService: Fetching order book for {symbol} (top {n_levels} levels)")
        if not symbol:
            raise MarketDataServiceError("Symbol must be provided for fetching order book.")
        try:
            order_book = await self.fetcher.get_order_book(symbol=symbol, n_levels=n_levels)
            logger.info(f"MarketDataService: Successfully fetched order book for {symbol}.")
            return order_book
        except HyperliquidMarketDataFetcherError as e:
            logger.error(f"MarketDataService: Error fetching order book for {symbol}: {e}")
            raise MarketDataServiceError(f"Failed to fetch order book for {symbol}: {e}")
        except Exception as e:
            logger.error(f"MarketDataService: Unexpected error fetching order book for {symbol}: {e}")
            raise MarketDataServiceError(f"An unexpected error occurred while fetching order book for {symbol}.")

    async def get_recent_trades(self, symbol: str, limit: int = 100) -> List[Trade]:
        logger.info(f"MarketDataService: Fetching last {limit} trades for {symbol}")
        if not symbol:
            raise MarketDataServiceError("Symbol must be provided for fetching recent trades.")
        try:
            trades = await self.fetcher.get_trades(symbol=symbol, limit=limit)
            logger.info(f"MarketDataService: Successfully fetched {len(trades)} trades for {symbol}.")
            return trades
        except HyperliquidMarketDataFetcherError as e:
            logger.error(f"MarketDataService: Error fetching recent trades for {symbol}: {e}")
            raise MarketDataServiceError(f"Failed to fetch recent trades for {symbol}: {e}")
        except Exception as e:
            logger.error(f"MarketDataService: Unexpected error fetching recent trades for {symbol}: {e}")
            raise MarketDataServiceError(f"An unexpected error occurred while fetching recent trades for {symbol}.")
