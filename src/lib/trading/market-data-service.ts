/**
 * Real-Time Market Data Service
 * Comprehensive market data aggregation across multiple sources
 */

export interface MarketDataConfig {
  // API Keys
  coinGeckoApiKey?: string
  binanceApiKey?: string
  coinbaseApiKey?: string
  alphaVantageApiKey?: string
  
  // WebSocket endpoints
  binanceWsUrl?: string
  coinbaseWsUrl?: string
  hyperliquidWsUrl?: string
  
  // Cache settings
  priceUpdateInterval: number // milliseconds
  historyRetentionHours: number
  enableWebSocket: boolean
  
  // Rate limiting
  maxRequestsPerMinute: number
  backoffMultiplier: number
}

export interface PriceData {
  symbol: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  high24h: number
  low24h: number
  marketCap?: number
  timestamp: number
  source: string
}

export interface OHLCVData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OrderBookData {
  symbol: string
  bids: [number, number][] // [price, quantity]
  asks: [number, number][]
  timestamp: number
  source: string
}

export interface MarketStats {
  symbol: string
  marketCap: number
  volume24h: number
  circulatingSupply: number
  totalSupply: number
  rank: number
  dominance?: number
  timestamp: number
}

export interface TradingPair {
  symbol: string
  baseAsset: string
  quoteAsset: string
  active: boolean
  minOrderSize: number
  maxOrderSize: number
  tickSize: number
  stepSize: number
  exchange: string
}

export interface MarketSubscription {
  id: string
  symbol: string
  type: 'price' | 'orderbook' | 'trades' | 'klines'
  callback: (data: any) => void
  source: string
  isActive: boolean
}

export class MarketDataService {
  private config: MarketDataConfig
  private priceCache: Map<string, PriceData> = new Map()
  private historyCache: Map<string, OHLCVData[]> = new Map()
  private orderBookCache: Map<string, OrderBookData> = new Map()
  private subscriptions: Map<string, MarketSubscription> = new Map()
  private webSockets: Map<string, WebSocket> = new Map()
  private updateInterval?: NodeJS.Timeout
  private rateLimitCounts: Map<string, number> = new Map()
  private lastRequestTimes: Map<string, number> = new Map()

  constructor(config: MarketDataConfig) {
    this.config = config
    this.startPriceUpdates()
    this.initializeWebSockets()
  }

  /**
   * Get current price for a symbol
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    // Check cache first
    const cached = this.priceCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.config.priceUpdateInterval) {
      return cached
    }

    // Fetch from multiple sources and return best data
    const sources = await Promise.allSettled([
      this.getCoinGeckoPrice(symbol),
      this.getBinancePrice(symbol),
      this.getCoinbasePrice(symbol)
    ])

    for (const result of sources) {
      if (result.status === 'fulfilled' && result.value) {
        this.priceCache.set(symbol, result.value)
        return result.value
      }
    }

    return cached || null // Return cached if available, otherwise null
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(symbols: string[]): Promise<Map<string, PriceData>> {
    const prices = new Map<string, PriceData>()
    
    // Use Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled(
      symbols.map(symbol => this.getPrice(symbol))
    )

    symbols.forEach((symbol, index) => {
      const result = results[index]
      if (result.status === 'fulfilled' && result.value) {
        prices.set(symbol, result.value)
      }
    })

    return prices
  }

  /**
   * Get historical OHLCV data
   */
  async getHistoricalData(
    symbol: string, 
    interval: '1m' | '5m' | '1h' | '1d' = '1h',
    limit: number = 100
  ): Promise<OHLCVData[]> {
    const cacheKey = `${symbol}-${interval}`
    
    // Check cache
    const cached = this.historyCache.get(cacheKey)
    if (cached && cached.length > 0) {
      const latestTime = cached[cached.length - 1].timestamp
      if (Date.now() - latestTime < this.getIntervalMs(interval)) {
        return cached.slice(-limit)
      }
    }

    // Fetch from multiple sources
    try {
      let data = await this.getBinanceHistoricalData(symbol, interval, limit)
      if (!data || data.length === 0) {
        data = await this.getCoinGeckoHistoricalData(symbol, interval, limit)
      }
      
      if (data && data.length > 0) {
        this.historyCache.set(cacheKey, data)
        return data
      }
    } catch (error) {
      console.error(`Failed to get historical data for ${symbol}:`, error)
    }

    return cached?.slice(-limit) || []
  }

  /**
   * Get order book data
   */
  async getOrderBook(symbol: string, depth: number = 20): Promise<OrderBookData | null> {
    const cached = this.orderBookCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < 5000) { // 5 second cache
      return cached
    }

    try {
      // Try Binance first (usually has better liquidity)
      let orderBook = await this.getBinanceOrderBook(symbol, depth)
      if (!orderBook) {
        orderBook = await this.getCoinbaseOrderBook(symbol, depth)
      }

      if (orderBook) {
        this.orderBookCache.set(symbol, orderBook)
        return orderBook
      }
    } catch (error) {
      console.error(`Failed to get order book for ${symbol}:`, error)
    }

    return cached || null
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToPrices(
    symbols: string[],
    callback: (symbol: string, price: PriceData) => void
  ): string {
    const subscriptionId = `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: MarketSubscription = {
      id: subscriptionId,
      symbol: symbols.join(','),
      type: 'price',
      callback: (data: PriceData) => callback(data.symbol, data),
      source: 'multiple',
      isActive: true
    }

    this.subscriptions.set(subscriptionId, subscription)

    // Subscribe to WebSocket feeds
    if (this.config.enableWebSocket) {
      this.subscribeToWebSocketPrices(symbols, subscriptionId)
    }

    return subscriptionId
  }

  /**
   * Subscribe to order book updates
   */
  subscribeToOrderBook(
    symbol: string,
    callback: (orderBook: OrderBookData) => void
  ): string {
    const subscriptionId = `orderbook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: MarketSubscription = {
      id: subscriptionId,
      symbol,
      type: 'orderbook',
      callback,
      source: 'binance',
      isActive: true
    }

    this.subscriptions.set(subscriptionId, subscription)

    if (this.config.enableWebSocket) {
      this.subscribeToWebSocketOrderBook(symbol, subscriptionId)
    }

    return subscriptionId
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      subscription.isActive = false
      this.subscriptions.delete(subscriptionId)
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStats(symbol: string): Promise<MarketStats | null> {
    try {
      // Use CoinGecko for comprehensive market data
      const response = await this.rateLimitedFetch(
        `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}`,
        'coingecko'
      )

      if (response.ok) {
        const data = await response.json()
        return {
          symbol: data.symbol.toUpperCase(),
          marketCap: data.market_data.market_cap.usd,
          volume24h: data.market_data.total_volume.usd,
          circulatingSupply: data.market_data.circulating_supply,
          totalSupply: data.market_data.total_supply,
          rank: data.market_data.market_cap_rank,
          timestamp: Date.now()
        }
      }
    } catch (error) {
      console.error(`Failed to get market stats for ${symbol}:`, error)
    }

    return null
  }

  /**
   * Get available trading pairs
   */
  async getTradingPairs(exchange: string = 'binance'): Promise<TradingPair[]> {
    try {
      if (exchange === 'binance') {
        return await this.getBinanceTradingPairs()
      } else if (exchange === 'coinbase') {
        return await this.getCoinbaseTradingPairs()
      }
    } catch (error) {
      console.error(`Failed to get trading pairs for ${exchange}:`, error)
    }

    return []
  }

  /**
   * Search for symbols/coins
   */
  async searchSymbols(query: string): Promise<{symbol: string, name: string, exchange: string}[]> {
    try {
      const response = await this.rateLimitedFetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        'coingecko'
      )

      if (response.ok) {
        const data = await response.json()
        return data.coins.slice(0, 10).map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          exchange: 'coingecko'
        }))
      }
    } catch (error) {
      console.error('Symbol search failed:', error)
    }

    return []
  }

  // =====================
  // PRICE SOURCE METHODS
  // =====================

  /**
   * Get price from CoinGecko
   */
  private async getCoinGeckoPrice(symbol: string): Promise<PriceData | null> {
    try {
      const coinId = symbol.toLowerCase()
      const response = await this.rateLimitedFetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        'coingecko'
      )

      if (response.ok) {
        const data = await response.json()
        const coinData = data[coinId]
        
        if (coinData) {
          return {
            symbol: symbol.toUpperCase(),
            price: coinData.usd,
            change24h: coinData.usd_24h_change || 0,
            changePercent24h: coinData.usd_24h_change || 0,
            volume24h: coinData.usd_24h_vol || 0,
            high24h: 0, // Not available in simple API
            low24h: 0,
            timestamp: Date.now(),
            source: 'coingecko'
          }
        }
      }
    } catch (error) {
      console.error(`CoinGecko price fetch failed for ${symbol}:`, error)
    }

    return null
  }

  /**
   * Get price from Binance
   */
  private async getBinancePrice(symbol: string): Promise<PriceData | null> {
    try {
      const pair = `${symbol}USDT`
      const response = await this.rateLimitedFetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`,
        'binance'
      )

      if (response.ok) {
        const data = await response.json()
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChange),
          changePercent24h: parseFloat(data.priceChangePercent),
          volume24h: parseFloat(data.volume),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          timestamp: Date.now(),
          source: 'binance'
        }
      }
    } catch (error) {
      console.error(`Binance price fetch failed for ${symbol}:`, error)
    }

    return null
  }

  /**
   * Get price from Coinbase
   */
  private async getCoinbasePrice(symbol: string): Promise<PriceData | null> {
    try {
      const pair = `${symbol}-USD`
      const response = await this.rateLimitedFetch(
        `https://api.exchange.coinbase.com/products/${pair}/ticker`,
        'coinbase'
      )

      if (response.ok) {
        const data = await response.json()
        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.price),
          change24h: 0, // Calculate from 24h stats if needed
          changePercent24h: 0,
          volume24h: parseFloat(data.volume),
          high24h: 0,
          low24h: 0,
          timestamp: Date.now(),
          source: 'coinbase'
        }
      }
    } catch (error) {
      console.error(`Coinbase price fetch failed for ${symbol}:`, error)
    }

    return null
  }

  // =========================
  // HISTORICAL DATA METHODS
  // =========================

  /**
   * Get historical data from Binance
   */
  private async getBinanceHistoricalData(
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<OHLCVData[]> {
    try {
      const pair = `${symbol}USDT`
      const response = await this.rateLimitedFetch(
        `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`,
        'binance'
      )

      if (response.ok) {
        const data = await response.json()
        return data.map((candle: any[]) => ({
          timestamp: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }))
      }
    } catch (error) {
      console.error(`Binance historical data fetch failed for ${symbol}:`, error)
    }

    return []
  }

  /**
   * Get historical data from CoinGecko
   */
  private async getCoinGeckoHistoricalData(
    symbol: string, 
    interval: string, 
    limit: number
  ): Promise<OHLCVData[]> {
    try {
      const days = this.getIntervalDays(interval, limit)
      const coinId = symbol.toLowerCase()
      const response = await this.rateLimitedFetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`,
        'coingecko'
      )

      if (response.ok) {
        const data = await response.json()
        return data.map((candle: number[]) => ({
          timestamp: candle[0],
          open: candle[1],
          high: candle[2],
          low: candle[3],
          close: candle[4],
          volume: 0 // Not provided in OHLC endpoint
        }))
      }
    } catch (error) {
      console.error(`CoinGecko historical data fetch failed for ${symbol}:`, error)
    }

    return []
  }

  // =======================
  // ORDER BOOK METHODS
  // =======================

  /**
   * Get order book from Binance
   */
  private async getBinanceOrderBook(symbol: string, depth: number): Promise<OrderBookData | null> {
    try {
      const pair = `${symbol}USDT`
      const response = await this.rateLimitedFetch(
        `https://api.binance.com/api/v3/depth?symbol=${pair}&limit=${depth}`,
        'binance'
      )

      if (response.ok) {
        const data = await response.json()
        return {
          symbol: symbol.toUpperCase(),
          bids: data.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
          asks: data.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
          timestamp: Date.now(),
          source: 'binance'
        }
      }
    } catch (error) {
      console.error(`Binance order book fetch failed for ${symbol}:`, error)
    }

    return null
  }

  /**
   * Get order book from Coinbase
   */
  private async getCoinbaseOrderBook(symbol: string, depth: number): Promise<OrderBookData | null> {
    try {
      const pair = `${symbol}-USD`
      const level = depth <= 50 ? 2 : 3
      const response = await this.rateLimitedFetch(
        `https://api.exchange.coinbase.com/products/${pair}/book?level=${level}`,
        'coinbase'
      )

      if (response.ok) {
        const data = await response.json()
        return {
          symbol: symbol.toUpperCase(),
          bids: data.bids.slice(0, depth).map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])]),
          asks: data.asks.slice(0, depth).map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
          timestamp: Date.now(),
          source: 'coinbase'
        }
      }
    } catch (error) {
      console.error(`Coinbase order book fetch failed for ${symbol}:`, error)
    }

    return null
  }

  // =======================
  // TRADING PAIRS METHODS
  // =======================

  /**
   * Get trading pairs from Binance
   */
  private async getBinanceTradingPairs(): Promise<TradingPair[]> {
    try {
      const response = await this.rateLimitedFetch(
        'https://api.binance.com/api/v3/exchangeInfo',
        'binance'
      )

      if (response.ok) {
        const data = await response.json()
        return data.symbols
          .filter((symbol: any) => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
          .map((symbol: any) => ({
            symbol: symbol.symbol,
            baseAsset: symbol.baseAsset,
            quoteAsset: symbol.quoteAsset,
            active: symbol.status === 'TRADING',
            minOrderSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0'),
            maxOrderSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.maxQty || '0'),
            tickSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize || '0'),
            stepSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.stepSize || '0'),
            exchange: 'binance'
          }))
      }
    } catch (error) {
      console.error('Failed to get Binance trading pairs:', error)
    }

    return []
  }

  /**
   * Get trading pairs from Coinbase
   */
  private async getCoinbaseTradingPairs(): Promise<TradingPair[]> {
    try {
      const response = await this.rateLimitedFetch(
        'https://api.exchange.coinbase.com/products',
        'coinbase'
      )

      if (response.ok) {
        const data = await response.json()
        return data
          .filter((product: any) => product.quote_currency === 'USD' && !product.trading_disabled)
          .map((product: any) => ({
            symbol: product.id,
            baseAsset: product.base_currency,
            quoteAsset: product.quote_currency,
            active: !product.trading_disabled,
            minOrderSize: parseFloat(product.base_min_size),
            maxOrderSize: parseFloat(product.base_max_size),
            tickSize: parseFloat(product.quote_increment),
            stepSize: parseFloat(product.base_increment),
            exchange: 'coinbase'
          }))
      }
    } catch (error) {
      console.error('Failed to get Coinbase trading pairs:', error)
    }

    return []
  }

  // ===================
  // WEBSOCKET METHODS
  // ===================

  /**
   * Initialize WebSocket connections
   */
  private initializeWebSockets(): void {
    if (!this.config.enableWebSocket) return

    // Initialize Binance WebSocket
    if (this.config.binanceWsUrl) {
      this.connectBinanceWebSocket()
    }

    // Initialize Coinbase WebSocket
    if (this.config.coinbaseWsUrl) {
      this.connectCoinbaseWebSocket()
    }
  }

  /**
   * Connect to Binance WebSocket
   */
  private connectBinanceWebSocket(): void {
    try {
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr')
      
      ws.onopen = () => {
        console.log('Connected to Binance WebSocket')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (Array.isArray(data)) {
            for (const ticker of data) {
              this.handleBinanceTickerUpdate(ticker)
            }
          }
        } catch (error) {
          console.error('Error parsing Binance WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Binance WebSocket closed, reconnecting...')
        setTimeout(() => this.connectBinanceWebSocket(), 5000)
      }

      ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error)
      }

      this.webSockets.set('binance', ws)
    } catch (error) {
      console.error('Failed to connect Binance WebSocket:', error)
    }
  }

  /**
   * Connect to Coinbase WebSocket
   */
  private connectCoinbaseWebSocket(): void {
    try {
      const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com')
      
      ws.onopen = () => {
        console.log('Connected to Coinbase WebSocket')
        // Subscribe to ticker channel
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['ticker'],
          product_ids: ['BTC-USD', 'ETH-USD', 'ADA-USD', 'DOT-USD', 'LINK-USD']
        }))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'ticker') {
            this.handleCoinbaseTickerUpdate(data)
          }
        } catch (error) {
          console.error('Error parsing Coinbase WebSocket message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Coinbase WebSocket closed, reconnecting...')
        setTimeout(() => this.connectCoinbaseWebSocket(), 5000)
      }

      ws.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error)
      }

      this.webSockets.set('coinbase', ws)
    } catch (error) {
      console.error('Failed to connect Coinbase WebSocket:', error)
    }
  }

  /**
   * Handle Binance ticker updates
   */
  private handleBinanceTickerUpdate(ticker: any): void {
    if (!ticker.s.endsWith('USDT')) return

    const symbol = ticker.s.replace('USDT', '')
    const priceData: PriceData = {
      symbol,
      price: parseFloat(ticker.c),
      change24h: parseFloat(ticker.P),
      changePercent24h: parseFloat(ticker.P),
      volume24h: parseFloat(ticker.v),
      high24h: parseFloat(ticker.h),
      low24h: parseFloat(ticker.l),
      timestamp: Date.now(),
      source: 'binance_ws'
    }

    this.priceCache.set(symbol, priceData)
    this.notifySubscribers('price', symbol, priceData)
  }

  /**
   * Handle Coinbase ticker updates
   */
  private handleCoinbaseTickerUpdate(ticker: any): void {
    const symbol = ticker.product_id.replace('-USD', '')
    const priceData: PriceData = {
      symbol,
      price: parseFloat(ticker.price),
      change24h: parseFloat(ticker.open_24h) - parseFloat(ticker.price),
      changePercent24h: ((parseFloat(ticker.price) - parseFloat(ticker.open_24h)) / parseFloat(ticker.open_24h)) * 100,
      volume24h: parseFloat(ticker.volume_24h),
      high24h: parseFloat(ticker.high_24h),
      low24h: parseFloat(ticker.low_24h),
      timestamp: Date.now(),
      source: 'coinbase_ws'
    }

    this.priceCache.set(symbol, priceData)
    this.notifySubscribers('price', symbol, priceData)
  }

  /**
   * Subscribe to WebSocket price updates
   */
  private subscribeToWebSocketPrices(symbols: string[], subscriptionId: string): void {
    // WebSocket subscriptions are handled automatically by the general connections
    // Individual symbol filtering is done in the message handlers
  }

  /**
   * Subscribe to WebSocket order book updates
   */
  private subscribeToWebSocketOrderBook(symbol: string, subscriptionId: string): void {
    // Implementation would depend on specific exchange WebSocket protocols
    // This is a placeholder for order book subscriptions
  }

  /**
   * Notify subscribers of updates
   */
  private notifySubscribers(type: string, symbol: string, data: any): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.isActive && subscription.type === type) {
        if (subscription.symbol === symbol || subscription.symbol.includes(symbol)) {
          try {
            subscription.callback(data)
          } catch (error) {
            console.error('Error in subscription callback:', error)
          }
        }
      }
    }
  }

  // ==================
  // UTILITY METHODS
  // ==================

  /**
   * Rate-limited fetch with backoff
   */
  private async rateLimitedFetch(url: string, source: string): Promise<Response> {
    const now = Date.now()
    const lastRequest = this.lastRequestTimes.get(source) || 0
    const requestCount = this.rateLimitCounts.get(source) || 0

    // Reset count every minute
    if (now - lastRequest > 60000) {
      this.rateLimitCounts.set(source, 0)
    }

    // Check rate limit
    if (requestCount >= this.config.maxRequestsPerMinute) {
      throw new Error(`Rate limit exceeded for ${source}`)
    }

    // Update counters
    this.rateLimitCounts.set(source, requestCount + 1)
    this.lastRequestTimes.set(source, now)

    return fetch(url)
  }

  /**
   * Start periodic price updates
   */
  private startPriceUpdates(): void {
    this.updateInterval = setInterval(async () => {
      // Update cached prices for active symbols
      const activeSymbols = new Set<string>()
      
      for (const subscription of this.subscriptions.values()) {
        if (subscription.isActive && subscription.type === 'price') {
          subscription.symbol.split(',').forEach(symbol => activeSymbols.add(symbol))
        }
      }

      // Update prices for active symbols
      for (const symbol of activeSymbols) {
        try {
          await this.getPrice(symbol)
        } catch (error) {
          console.error(`Failed to update price for ${symbol}:`, error)
        }
      }
    }, this.config.priceUpdateInterval)
  }

  /**
   * Convert interval string to milliseconds
   */
  private getIntervalMs(interval: string): number {
    const multipliers: {[key: string]: number} = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    }
    return multipliers[interval] || 60 * 60 * 1000
  }

  /**
   * Convert interval and limit to days for CoinGecko
   */
  private getIntervalDays(interval: string, limit: number): number {
    const intervalMs = this.getIntervalMs(interval)
    return Math.ceil((intervalMs * limit) / (24 * 60 * 60 * 1000))
  }

  /**
   * Stop all updates and close connections
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = undefined
    }

    // Close all WebSocket connections
    for (const ws of this.webSockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }

    // Clear all subscriptions
    this.subscriptions.clear()
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    isHealthy: boolean
    activeSources: string[]
    activeSubscriptions: number
    cacheSize: number
    webSocketStatus: {[source: string]: string}
  } {
    const webSocketStatus: {[source: string]: string} = {}
    
    for (const [source, ws] of this.webSockets.entries()) {
      webSocketStatus[source] = ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'
    }

    return {
      isHealthy: true,
      activeSources: Array.from(this.webSockets.keys()),
      activeSubscriptions: this.subscriptions.size,
      cacheSize: this.priceCache.size,
      webSocketStatus
    }
  }
}

export default MarketDataService