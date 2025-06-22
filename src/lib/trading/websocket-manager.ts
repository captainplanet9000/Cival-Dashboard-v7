/**
 * WebSocket Real-Time Trading Manager
 * Comprehensive WebSocket management for real-time trading operations
 */

import HyperliquidConnector from './hyperliquid-connector'
import DEXConnector from './dex-connector'
import CoinbaseProConnector from './coinbase-connector'
import MarketDataService from './market-data-service'
import OrderManagementSystem from './order-management'
import PortfolioTracker from './portfolio-tracker'
import RiskManager from './risk-manager'

export interface WebSocketConfig {
  // Connection settings
  reconnectAttempts: number
  reconnectDelay: number
  heartbeatInterval: number
  
  // Subscriptions
  enableMarketData: boolean
  enableOrderUpdates: boolean
  enablePortfolioUpdates: boolean
  enableRiskAlerts: boolean
  
  // Rate limiting
  maxMessagesPerSecond: number
  bufferSize: number
  
  // Backend integration
  backendWsUrl?: string
  apiKey?: string
}

export interface WebSocketMessage {
  id: string
  type: 'market_data' | 'order_update' | 'portfolio_update' | 'risk_alert' | 'trade_signal' | 'system_status'
  data: any
  timestamp: number
  source: string
}

export interface ConnectionStatus {
  connected: boolean
  connectionTime: number
  lastMessage: number
  messageCount: number
  errors: number
  reconnectAttempts: number
}

export interface MarketDataUpdate {
  symbol: string
  price: number
  change24h: number
  volume24h: number
  timestamp: number
  source: string
}

export interface OrderUpdate {
  orderId: string
  symbol: string
  status: 'pending' | 'filled' | 'cancelled' | 'rejected'
  executedQuantity: number
  executedPrice: number
  timestamp: number
  exchange: string
}

export interface PortfolioUpdate {
  totalValue: number
  totalPnL: number
  positions: Array<{
    symbol: string
    size: number
    value: number
    pnl: number
    exchange: string
  }>
  timestamp: number
}

export interface RiskAlert {
  id: string
  type: 'position_limit' | 'loss_limit' | 'margin_call' | 'volatility' | 'correlation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  data: any
  timestamp: number
}

export interface TradeSignal {
  strategy: string
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  strength: number
  confidence: number
  price: number
  reasoning: string
  timestamp: number
}

export class WebSocketManager {
  private config: WebSocketConfig
  private connections: Map<string, WebSocket> = new Map()
  private connectionStatus: Map<string, ConnectionStatus> = new Map()
  private subscriptions: Map<string, Set<(message: WebSocketMessage) => void>> = new Map()
  private messageBuffer: WebSocketMessage[] = []
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map()
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  // Trading services
  private marketData: MarketDataService
  private orderManager: OrderManagementSystem
  private portfolioTracker: PortfolioTracker
  private riskManager: RiskManager
  
  // Message rate limiting
  private messageCount: number = 0
  private lastSecond: number = 0

  constructor(
    config: WebSocketConfig,
    marketData: MarketDataService,
    orderManager: OrderManagementSystem,
    portfolioTracker: PortfolioTracker,
    riskManager: RiskManager
  ) {
    this.config = config
    this.marketData = marketData
    this.orderManager = orderManager
    this.portfolioTracker = portfolioTracker
    this.riskManager = riskManager
    
    this.initializeConnections()
    this.startMessageProcessing()
  }

  /**
   * Initialize WebSocket connections
   */
  private async initializeConnections(): Promise<void> {
    try {
      // Connect to backend WebSocket
      if (this.config.backendWsUrl) {
        await this.connectToBackend()
      }

      // Connect to exchange WebSockets
      await this.connectToExchanges()

      // Setup data streams
      this.setupDataStreams()
      
      console.log('WebSocket connections initialized')
    } catch (error) {
      console.error('Failed to initialize WebSocket connections:', error)
    }
  }

  /**
   * Connect to backend WebSocket
   */
  private async connectToBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.config.backendWsUrl!)
        
        ws.onopen = () => {
          console.log('Connected to backend WebSocket')
          this.connections.set('backend', ws)
          this.connectionStatus.set('backend', {
            connected: true,
            connectionTime: Date.now(),
            lastMessage: Date.now(),
            messageCount: 0,
            errors: 0,
            reconnectAttempts: 0
          })
          
          // Authenticate if API key is provided
          if (this.config.apiKey) {
            this.sendMessage('backend', {
              type: 'auth',
              apiKey: this.config.apiKey
            })
          }
          
          this.startHeartbeat('backend')
          resolve()
        }

        ws.onmessage = (event) => {
          this.handleBackendMessage(event.data)
        }

        ws.onclose = () => {
          console.log('Backend WebSocket disconnected')
          this.handleDisconnection('backend')
        }

        ws.onerror = (error) => {
          console.error('Backend WebSocket error:', error)
          this.handleError('backend', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Connect to exchange WebSockets
   */
  private async connectToExchanges(): Promise<void> {
    const exchanges = ['binance', 'coinbase', 'hyperliquid']
    
    for (const exchange of exchanges) {
      try {
        await this.connectToExchange(exchange)
      } catch (error) {
        console.error(`Failed to connect to ${exchange} WebSocket:`, error)
      }
    }
  }

  /**
   * Connect to specific exchange WebSocket
   */
  private async connectToExchange(exchange: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let wsUrl: string
      
      switch (exchange) {
        case 'binance':
          wsUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr'
          break
        case 'coinbase':
          wsUrl = 'wss://ws-feed.exchange.coinbase.com'
          break
        case 'hyperliquid':
          wsUrl = 'wss://api.hyperliquid.xyz/ws'
          break
        default:
          reject(new Error(`Unknown exchange: ${exchange}`))
          return
      }

      try {
        const ws = new WebSocket(wsUrl)
        
        ws.onopen = () => {
          console.log(`Connected to ${exchange} WebSocket`)
          this.connections.set(exchange, ws)
          this.connectionStatus.set(exchange, {
            connected: true,
            connectionTime: Date.now(),
            lastMessage: Date.now(),
            messageCount: 0,
            errors: 0,
            reconnectAttempts: 0
          })
          
          this.subscribeToExchangeData(exchange, ws)
          this.startHeartbeat(exchange)
          resolve()
        }

        ws.onmessage = (event) => {
          this.handleExchangeMessage(exchange, event.data)
        }

        ws.onclose = () => {
          console.log(`${exchange} WebSocket disconnected`)
          this.handleDisconnection(exchange)
        }

        ws.onerror = (error) => {
          console.error(`${exchange} WebSocket error:`, error)
          this.handleError(exchange, error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Subscribe to exchange-specific data
   */
  private subscribeToExchangeData(exchange: string, ws: WebSocket): void {
    if (!this.config.enableMarketData) return

    switch (exchange) {
      case 'binance':
        // Already subscribed to all tickers via URL
        break
        
      case 'coinbase':
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['ticker', 'level2'],
          product_ids: ['BTC-USD', 'ETH-USD', 'ADA-USD', 'DOT-USD', 'LINK-USD']
        }))
        break
        
      case 'hyperliquid':
        ws.send(JSON.stringify({
          method: 'subscribe',
          subscription: { type: 'allMids' }
        }))
        break
    }
  }

  /**
   * Setup real-time data streams
   */
  private setupDataStreams(): void {
    // Market data updates
    if (this.config.enableMarketData) {
      setInterval(() => {
        this.broadcastMarketDataUpdate()
      }, 1000) // Every second
    }

    // Portfolio updates
    if (this.config.enablePortfolioUpdates) {
      setInterval(() => {
        this.broadcastPortfolioUpdate()
      }, 5000) // Every 5 seconds
    }

    // Risk monitoring
    if (this.config.enableRiskAlerts) {
      setInterval(() => {
        this.checkAndBroadcastRiskAlerts()
      }, 2000) // Every 2 seconds
    }
  }

  /**
   * Handle backend WebSocket messages
   */
  private handleBackendMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      
      this.updateConnectionStatus('backend')
      
      const wsMessage: WebSocketMessage = {
        id: `backend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: message.type,
        data: message.data,
        timestamp: Date.now(),
        source: 'backend'
      }

      this.processMessage(wsMessage)
    } catch (error) {
      console.error('Error parsing backend message:', error)
    }
  }

  /**
   * Handle exchange WebSocket messages
   */
  private handleExchangeMessage(exchange: string, data: string): void {
    try {
      const message = JSON.parse(data)
      
      this.updateConnectionStatus(exchange)
      
      // Convert exchange-specific format to unified format
      const wsMessage = this.convertExchangeMessage(exchange, message)
      
      if (wsMessage) {
        this.processMessage(wsMessage)
      }
    } catch (error) {
      console.error(`Error parsing ${exchange} message:`, error)
    }
  }

  /**
   * Convert exchange-specific message to unified format
   */
  private convertExchangeMessage(exchange: string, message: any): WebSocketMessage | null {
    try {
      let wsMessage: WebSocketMessage | null = null

      switch (exchange) {
        case 'binance':
          if (Array.isArray(message)) {
            // Multiple ticker updates
            wsMessage = {
              id: `binance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'market_data',
              data: {
                updates: message.map(ticker => ({
                  symbol: ticker.s.replace('USDT', ''),
                  price: parseFloat(ticker.c),
                  change24h: parseFloat(ticker.P),
                  volume24h: parseFloat(ticker.v),
                  timestamp: Date.now()
                })).filter(update => update.symbol !== 'USDT')
              },
              timestamp: Date.now(),
              source: 'binance'
            }
          }
          break

        case 'coinbase':
          if (message.type === 'ticker') {
            wsMessage = {
              id: `coinbase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'market_data',
              data: {
                symbol: message.product_id.replace('-USD', ''),
                price: parseFloat(message.price),
                change24h: ((parseFloat(message.price) - parseFloat(message.open_24h)) / parseFloat(message.open_24h)) * 100,
                volume24h: parseFloat(message.volume_24h),
                timestamp: Date.now()
              },
              timestamp: Date.now(),
              source: 'coinbase'
            }
          }
          break

        case 'hyperliquid':
          if (message.channel === 'allMids') {
            wsMessage = {
              id: `hyperliquid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'market_data',
              data: {
                updates: message.data.map((item: any) => ({
                  symbol: item.coin,
                  price: parseFloat(item.px),
                  timestamp: Date.now()
                }))
              },
              timestamp: Date.now(),
              source: 'hyperliquid'
            }
          }
          break
      }

      return wsMessage
    } catch (error) {
      console.error(`Error converting ${exchange} message:`, error)
      return null
    }
  }

  /**
   * Process incoming WebSocket message
   */
  private processMessage(message: WebSocketMessage): void {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      return
    }

    // Add to buffer
    this.messageBuffer.push(message)
    
    // Limit buffer size
    if (this.messageBuffer.length > this.config.bufferSize) {
      this.messageBuffer.shift()
    }

    // Notify subscribers
    this.notifySubscribers(message)

    // Handle specific message types
    this.handleMessageType(message)
  }

  /**
   * Handle specific message types
   */
  private handleMessageType(message: WebSocketMessage): void {
    switch (message.type) {
      case 'market_data':
        this.handleMarketDataMessage(message)
        break
      case 'order_update':
        this.handleOrderUpdateMessage(message)
        break
      case 'portfolio_update':
        this.handlePortfolioUpdateMessage(message)
        break
      case 'risk_alert':
        this.handleRiskAlertMessage(message)
        break
      case 'trade_signal':
        this.handleTradeSignalMessage(message)
        break
    }
  }

  /**
   * Handle market data messages
   */
  private handleMarketDataMessage(message: WebSocketMessage): void {
    // Update local market data cache
    if (message.data.updates) {
      // Multiple updates
      for (const update of message.data.updates) {
        // Process each market data update
        this.updateMarketDataCache(update)
      }
    } else {
      // Single update
      this.updateMarketDataCache(message.data)
    }
  }

  /**
   * Handle order update messages
   */
  private handleOrderUpdateMessage(message: WebSocketMessage): void {
    const orderUpdate: OrderUpdate = message.data
    
    // Notify order management system
    console.log(`Order update: ${orderUpdate.orderId} - ${orderUpdate.status}`)
    
    // Update portfolio if order is filled
    if (orderUpdate.status === 'filled') {
      this.triggerPortfolioUpdate()
    }
  }

  /**
   * Handle portfolio update messages
   */
  private handlePortfolioUpdateMessage(message: WebSocketMessage): void {
    const portfolioUpdate: PortfolioUpdate = message.data
    console.log(`Portfolio update: Total value: $${portfolioUpdate.totalValue.toFixed(2)}`)
  }

  /**
   * Handle risk alert messages
   */
  private handleRiskAlertMessage(message: WebSocketMessage): void {
    const riskAlert: RiskAlert = message.data
    
    console.warn(`Risk Alert [${riskAlert.severity.toUpperCase()}]: ${riskAlert.message}`)
    
    // Auto-action for critical alerts
    if (riskAlert.severity === 'critical') {
      this.handleCriticalRiskAlert(riskAlert)
    }
  }

  /**
   * Handle trade signal messages
   */
  private handleTradeSignalMessage(message: WebSocketMessage): void {
    const tradeSignal: TradeSignal = message.data
    
    console.log(`Trade Signal: ${tradeSignal.action.toUpperCase()} ${tradeSignal.symbol} - Strength: ${tradeSignal.strength}% - ${tradeSignal.reasoning}`)
  }

  /**
   * Broadcast market data update
   */
  private async broadcastMarketDataUpdate(): Promise<void> {
    try {
      // Get latest prices from market data service
      const symbols = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK']
      const prices = await this.marketData.getPrices(symbols)
      
      const updates: MarketDataUpdate[] = []
      for (const [symbol, priceData] of prices.entries()) {
        updates.push({
          symbol,
          price: priceData.price,
          change24h: priceData.changePercent24h,
          volume24h: priceData.volume24h,
          timestamp: Date.now(),
          source: 'market_data_service'
        })
      }

      if (updates.length > 0) {
        this.broadcast({
          id: `market-data-${Date.now()}`,
          type: 'market_data',
          data: { updates },
          timestamp: Date.now(),
          source: 'websocket_manager'
        })
      }
    } catch (error) {
      console.error('Error broadcasting market data update:', error)
    }
  }

  /**
   * Broadcast portfolio update
   */
  private async broadcastPortfolioUpdate(): Promise<void> {
    try {
      const portfolio = await this.portfolioTracker.getPortfolioSummary()
      
      const portfolioUpdate: PortfolioUpdate = {
        totalValue: portfolio.totalValue,
        totalPnL: portfolio.totalGain,
        positions: portfolio.positions.map(pos => ({
          symbol: pos.symbol,
          size: pos.size,
          value: pos.marketValue,
          pnl: pos.unrealizedPnl,
          exchange: pos.exchange
        })),
        timestamp: Date.now()
      }

      this.broadcast({
        id: `portfolio-${Date.now()}`,
        type: 'portfolio_update',
        data: portfolioUpdate,
        timestamp: Date.now(),
        source: 'portfolio_tracker'
      })
    } catch (error) {
      console.error('Error broadcasting portfolio update:', error)
    }
  }

  /**
   * Check and broadcast risk alerts
   */
  private async checkAndBroadcastRiskAlerts(): Promise<void> {
    try {
      const alerts = this.riskManager.getAlerts()
      
      for (const alert of alerts) {
        const riskAlert: RiskAlert = {
          id: alert.id,
          type: alert.type as any,
          severity: alert.severity as any,
          message: alert.message,
          data: alert.data,
          timestamp: alert.timestamp
        }

        this.broadcast({
          id: `risk-alert-${Date.now()}`,
          type: 'risk_alert',
          data: riskAlert,
          timestamp: Date.now(),
          source: 'risk_manager'
        })
      }
    } catch (error) {
      console.error('Error checking risk alerts:', error)
    }
  }

  /**
   * Update market data cache
   */
  private updateMarketDataCache(update: any): void {
    // This would update the local cache
    // Implementation depends on caching strategy
  }

  /**
   * Trigger portfolio update
   */
  private triggerPortfolioUpdate(): void {
    // Force portfolio recalculation
    setTimeout(() => {
      this.broadcastPortfolioUpdate()
    }, 1000)
  }

  /**
   * Handle critical risk alerts
   */
  private async handleCriticalRiskAlert(alert: RiskAlert): Promise<void> {
    try {
      console.error(`CRITICAL RISK ALERT: ${alert.message}`)
      
      // Auto-actions based on alert type
      switch (alert.type) {
        case 'position_limit':
        case 'loss_limit':
        case 'margin_call':
          // Emergency stop trading
          await this.orderManager.emergencyStop()
          break
      }
    } catch (error) {
      console.error('Error handling critical risk alert:', error)
    }
  }

  /**
   * Subscribe to WebSocket messages
   */
  subscribe(
    messageType: string,
    callback: (message: WebSocketMessage) => void
  ): string {
    const subscriptionId = `${messageType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    if (!this.subscriptions.has(messageType)) {
      this.subscriptions.set(messageType, new Set())
    }
    
    this.subscriptions.get(messageType)!.add(callback)
    return subscriptionId
  }

  /**
   * Unsubscribe from WebSocket messages
   */
  unsubscribe(messageType: string, callback: (message: WebSocketMessage) => void): void {
    const subscribers = this.subscriptions.get(messageType)
    if (subscribers) {
      subscribers.delete(callback)
    }
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(message: WebSocketMessage): void {
    const subscribers = this.subscriptions.get(message.type)
    if (subscribers) {
      for (const callback of subscribers) {
        try {
          callback(message)
        } catch (error) {
          console.error('Error in subscriber callback:', error)
        }
      }
    }

    // Also notify 'all' subscribers
    const allSubscribers = this.subscriptions.get('all')
    if (allSubscribers) {
      for (const callback of allSubscribers) {
        try {
          callback(message)
        } catch (error) {
          console.error('Error in all subscriber callback:', error)
        }
      }
    }
  }

  /**
   * Broadcast message to all connections
   */
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message)
    
    for (const [name, ws] of this.connections.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr)
        } catch (error) {
          console.error(`Error broadcasting to ${name}:`, error)
        }
      }
    }
  }

  /**
   * Send message to specific connection
   */
  private sendMessage(connectionName: string, data: any): void {
    const ws = this.connections.get(connectionName)
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data))
      } catch (error) {
        console.error(`Error sending message to ${connectionName}:`, error)
      }
    }
  }

  /**
   * Start heartbeat for connection
   */
  private startHeartbeat(connectionName: string): void {
    const interval = setInterval(() => {
      const ws = this.connections.get(connectionName)
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
        } catch (error) {
          console.error(`Heartbeat failed for ${connectionName}:`, error)
          this.handleDisconnection(connectionName)
        }
      } else {
        this.handleDisconnection(connectionName)
      }
    }, this.config.heartbeatInterval)

    this.heartbeatIntervals.set(connectionName, interval)
  }

  /**
   * Handle connection disconnection
   */
  private handleDisconnection(connectionName: string): void {
    const status = this.connectionStatus.get(connectionName)
    if (status) {
      status.connected = false
      status.reconnectAttempts++
    }

    // Clear heartbeat
    const heartbeat = this.heartbeatIntervals.get(connectionName)
    if (heartbeat) {
      clearInterval(heartbeat)
      this.heartbeatIntervals.delete(connectionName)
    }

    // Attempt reconnection
    this.attemptReconnection(connectionName)
  }

  /**
   * Handle connection error
   */
  private handleError(connectionName: string, error: any): void {
    const status = this.connectionStatus.get(connectionName)
    if (status) {
      status.errors++
    }

    console.error(`WebSocket error for ${connectionName}:`, error)
  }

  /**
   * Attempt reconnection
   */
  private attemptReconnection(connectionName: string): void {
    const status = this.connectionStatus.get(connectionName)
    if (!status || status.reconnectAttempts >= this.config.reconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${connectionName}`)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        console.log(`Attempting to reconnect to ${connectionName}...`)
        
        if (connectionName === 'backend') {
          await this.connectToBackend()
        } else {
          await this.connectToExchange(connectionName)
        }
      } catch (error) {
        console.error(`Reconnection failed for ${connectionName}:`, error)
        this.attemptReconnection(connectionName)
      }
    }, this.config.reconnectDelay * Math.pow(2, status.reconnectAttempts)) // Exponential backoff

    this.reconnectTimeouts.set(connectionName, timeout)
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(connectionName: string): void {
    const status = this.connectionStatus.get(connectionName)
    if (status) {
      status.lastMessage = Date.now()
      status.messageCount++
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Math.floor(Date.now() / 1000)
    
    if (now !== this.lastSecond) {
      this.messageCount = 0
      this.lastSecond = now
    }
    
    if (this.messageCount >= this.config.maxMessagesPerSecond) {
      return false
    }
    
    this.messageCount++
    return true
  }

  /**
   * Start message processing
   */
  private startMessageProcessing(): void {
    setInterval(() => {
      // Process any buffered messages
      this.processBufferedMessages()
    }, 100) // Process every 100ms
  }

  /**
   * Process buffered messages
   */
  private processBufferedMessages(): void {
    // Implementation for processing buffered messages
    // This could include batching, filtering, or other processing logic
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): Map<string, ConnectionStatus> {
    return new Map(this.connectionStatus)
  }

  /**
   * Get recent messages
   */
  getRecentMessages(count: number = 100): WebSocketMessage[] {
    return this.messageBuffer.slice(-count)
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean
    totalConnections: number
    activeConnections: number
    totalMessages: number
    errors: number
  } {
    let activeConnections = 0
    let totalMessages = 0
    let errors = 0

    for (const status of this.connectionStatus.values()) {
      if (status.connected) activeConnections++
      totalMessages += status.messageCount
      errors += status.errors
    }

    return {
      isHealthy: activeConnections > 0,
      totalConnections: this.connections.size,
      activeConnections,
      totalMessages,
      errors
    }
  }

  /**
   * Close all connections
   */
  close(): void {
    // Clear all intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval)
    }

    // Clear all timeouts
    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout)
    }

    // Close all WebSocket connections
    for (const ws of this.connections.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }

    // Clear all data
    this.connections.clear()
    this.connectionStatus.clear()
    this.subscriptions.clear()
    this.heartbeatIntervals.clear()
    this.reconnectTimeouts.clear()
    this.messageBuffer.length = 0

    console.log('WebSocket Manager closed')
  }
}

export default WebSocketManager