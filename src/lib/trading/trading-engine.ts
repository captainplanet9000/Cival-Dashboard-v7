/**
 * Complete Trading Engine Integration
 * Main orchestrator for all trading functionality
 */

// Trading Engine with proper TypeScript integration

import HyperliquidConnector from './hyperliquid-connector'
import DEXConnector from './dex-connector'
import CoinbaseProConnector from './coinbase-connector'
import OrderManagementSystem, { TradingConfig, UnifiedOrder } from './order-management'
import PortfolioTracker, { TradingAccount } from './portfolio-tracker'
import RiskManager, { RiskConfig } from './risk-manager'
import WalletManager, { WalletConfig } from './wallet-manager'
import MarketDataService, { MarketDataConfig } from './market-data-service'
import TradingStrategies, { StrategyConfig, TradingSignal } from './trading-strategies'
import WebSocketManager, { WebSocketConfig } from './websocket-manager'

export interface TradingEngineConfig {
  // Core trading configuration
  trading: TradingConfig
  
  // Risk management
  risk: RiskConfig
  
  // Wallet management
  wallet: WalletConfig
  
  // Market data
  marketData: MarketDataConfig
  
  // WebSocket real-time
  webSocket: WebSocketConfig
  
  // Strategy settings
  strategies: {
    enabled: string[]
    configs: {[strategyName: string]: StrategyConfig}
  }
  
  // Engine settings
  autoTrade: boolean
  simulationMode: boolean
  maxConcurrentOrders: number
  orderExecutionDelay: number
  signalProcessingInterval: number
}

export interface TradingEngineStatus {
  isRunning: boolean
  autoTradeEnabled: boolean
  simulationMode: boolean
  activeStrategies: number
  totalSignals: number
  pendingOrders: number
  connectedExchanges: number
  totalPortfolioValue: number
  dailyPnL: number
  riskScore: number
  lastUpdate: number
}

export interface TradingMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  maxDrawdown: number
  sharpeRatio: number
  totalVolume: number
  avgTradeSize: number
  totalFees: number
  profitFactor: number
  strategies: {[name: string]: any}
  exchanges: {[name: string]: any}
}

export class TradingEngine {
  private config: TradingEngineConfig
  private isRunning: boolean = false
  
  // Core trading components
  private hyperliquid?: HyperliquidConnector
  private dex?: DEXConnector
  private coinbase?: CoinbaseProConnector
  private orderManager?: OrderManagementSystem
  private portfolioTracker?: PortfolioTracker
  private riskManager?: RiskManager
  private walletManager?: WalletManager
  private marketData?: MarketDataService
  private strategies?: TradingStrategies
  private webSocketManager?: WebSocketManager
  
  // Operational state
  private activeOrders: Map<string, UnifiedOrder> = new Map()
  private pendingSignals: TradingSignal[] = []
  private executionQueue: Array<{signal: TradingSignal, priority: number}> = []
  private tradingHistory: any[] = []
  
  // Intervals and timers
  private signalProcessingInterval?: NodeJS.Timeout
  private portfolioUpdateInterval?: NodeJS.Timeout
  private riskMonitoringInterval?: NodeJS.Timeout
  private metricsUpdateInterval?: NodeJS.Timeout

  constructor(config: TradingEngineConfig) {
    this.config = config
    this.initializeComponents()
  }

  /**
   * Initialize all trading components
   */
  private initializeComponents(): void {
    try {
      // Initialize connectors
      this.hyperliquid = new HyperliquidConnector({
        privateKey: this.config.trading.hyperliquid.privateKey,
        testnet: this.config.trading.hyperliquid.testnet
      })

      this.dex = new DEXConnector({
        privateKey: this.config.trading.dex.privateKey,
        rpcUrl: this.config.trading.dex.rpcUrl,
        chainId: this.config.trading.dex.chainId,
        slippageTolerance: this.config.trading.dex.slippageTolerance
      })

      if (this.config.wallet.coinbaseApiKey && this.config.wallet.coinbasePrivateKey) {
        this.coinbase = new CoinbaseProConnector({
          apiKey: this.config.wallet.coinbaseApiKey,
          privateKey: this.config.wallet.coinbasePrivateKey
        })
      }

      // Initialize market data service
      this.marketData = new MarketDataService(this.config.marketData)

      // Initialize wallet manager
      this.walletManager = new WalletManager(this.config.wallet)

      // Initialize portfolio tracker
      this.portfolioTracker = new PortfolioTracker()
      
      // Add trading accounts to portfolio tracker
      this.setupTradingAccounts()

      // Initialize risk manager
      this.riskManager = new RiskManager(this.config.risk, this.portfolioTracker)

      // Initialize order management system
      this.orderManager = new OrderManagementSystem(this.config.trading)

      // Initialize trading strategies
      this.strategies = new TradingStrategies(this.marketData)
      this.configureStrategies()

      // Initialize WebSocket manager
      this.webSocketManager = new WebSocketManager(
        this.config.webSocket,
        this.marketData,
        this.orderManager,
        this.portfolioTracker,
        this.riskManager
      )

      console.log('Trading Engine initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Trading Engine:', error)
      throw error
    }
  }

  /**
   * Setup trading accounts for portfolio tracking
   */
  private setupTradingAccounts(): void {
    // Add Hyperliquid account
    if (this.portfolioTracker && this.hyperliquid) {
      this.portfolioTracker.addAccount({
        id: 'hyperliquid',
        name: 'Hyperliquid Perpetuals',
        exchange: 'hyperliquid',
        connector: this.hyperliquid,
        isActive: true,
        config: this.config.trading.hyperliquid
      })
    }

    // Add DEX account
    if (this.portfolioTracker && this.dex) {
      this.portfolioTracker.addAccount({
        id: 'dex',
        name: 'DEX Trading',
        exchange: 'dex',
        connector: this.dex,
        isActive: true,
        config: this.config.trading.dex
      })
    }

    // Add Coinbase account if configured
    if (this.coinbase && this.portfolioTracker) {
      this.portfolioTracker.addAccount({
        id: 'coinbase',
        name: 'Coinbase Pro',
        exchange: 'coinbase',
        connector: this.coinbase,
        isActive: true,
        config: {
          apiKey: this.config.wallet.coinbaseApiKey,
          privateKey: this.config.wallet.coinbasePrivateKey
        }
      })
    }
  }

  /**
   * Configure trading strategies
   */
  private configureStrategies(): void {
    if (!this.strategies) return;
    
    // Enable configured strategies
    for (const strategyName of this.config.strategies.enabled) {
      this.strategies.toggleStrategy(strategyName, true)
      
      // Apply custom configuration if provided
      const customConfig = this.config.strategies.configs[strategyName]
      if (customConfig) {
        this.strategies.updateStrategy(strategyName, customConfig)
      }
    }
  }

  /**
   * Start the trading engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Trading Engine is already running')
      return
    }

    try {
      console.log('Starting Trading Engine...')
      
      // Health checks for all components
      await this.performHealthChecks()

      // Start periodic processes
      this.startSignalProcessing()
      this.startPortfolioUpdates()
      this.startRiskMonitoring()
      this.startMetricsUpdates()

      // Subscribe to WebSocket events
      this.setupWebSocketSubscriptions()

      this.isRunning = true
      console.log('Trading Engine started successfully')

      // Initial signal generation
      await this.generateAndProcessSignals()
      
    } catch (error) {
      console.error('Failed to start Trading Engine:', error)
      throw error
    }
  }

  /**
   * Stop the trading engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Trading Engine is not running')
      return
    }

    try {
      console.log('Stopping Trading Engine...')

      // Clear all intervals
      if (this.signalProcessingInterval) {
        clearInterval(this.signalProcessingInterval)
        this.signalProcessingInterval = undefined
      }

      if (this.portfolioUpdateInterval) {
        clearInterval(this.portfolioUpdateInterval)
        this.portfolioUpdateInterval = undefined
      }

      if (this.riskMonitoringInterval) {
        clearInterval(this.riskMonitoringInterval)
        this.riskMonitoringInterval = undefined
      }

      if (this.metricsUpdateInterval) {
        clearInterval(this.metricsUpdateInterval)
        this.metricsUpdateInterval = undefined
      }

      // Cancel all pending orders
      await this.cancelAllOrders()

      // Close WebSocket connections
      this.webSocketManager?.close()

      // Stop wallet manager
      this.walletManager?.stopPeriodicSync()

      // Stop portfolio tracker
      this.portfolioTracker?.stopUpdates()

      // Stop market data service
      this.marketData?.stop()

      this.isRunning = false
      console.log('Trading Engine stopped successfully')
      
    } catch (error) {
      console.error('Error stopping Trading Engine:', error)
      throw error
    }
  }

  /**
   * Perform health checks on all components
   */
  private async performHealthChecks(): Promise<void> {
    const checks = await Promise.allSettled([
      this.hyperliquid?.healthCheck() || Promise.resolve(true),
      this.dex?.healthCheck() || Promise.resolve(true),
      this.coinbase?.healthCheck() || Promise.resolve(true),
      this.orderManager?.healthCheck() || Promise.resolve(true),
      this.walletManager?.healthCheck() || Promise.resolve(true)
    ])

    const failed = checks.filter(check => check.status === 'rejected' || check.value === false)
    
    if (failed.length > 0) {
      console.warn(`${failed.length} health checks failed, but continuing...`)
    }

    console.log('Health checks completed')
  }

  /**
   * Start signal processing
   */
  private startSignalProcessing(): void {
    this.signalProcessingInterval = setInterval(async () => {
      try {
        await this.generateAndProcessSignals()
      } catch (error) {
        console.error('Signal processing error:', error)
      }
    }, this.config.signalProcessingInterval)
  }

  /**
   * Generate and process trading signals
   */
  private async generateAndProcessSignals(): Promise<void> {
    try {
      // Generate signals from all strategies
      const signalMap = await this.strategies?.generateSignals() || new Map()
      
      // Flatten signals and add to processing queue
      for (const [strategyName, signals] of signalMap.entries()) {
        for (const signal of signals) {
          this.addSignalToQueue(signal)
        }
      }

      // Process signals in priority order
      await this.processSignalQueue()
      
    } catch (error) {
      console.error('Error generating signals:', error)
    }
  }

  /**
   * Add signal to execution queue with priority
   */
  private addSignalToQueue(signal: TradingSignal): void {
    let priority = signal.strength * signal.confidence
    
    // Boost priority for certain strategies
    if (signal.strategy === 'arbitrage') {
      priority *= 1.5
    }
    
    // Risk-adjusted priority
    if (signal.action === 'sell') {
      priority *= 1.2 // Prioritize risk reduction
    }

    this.executionQueue.push({ signal, priority })
    this.executionQueue.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Process signal execution queue
   */
  private async processSignalQueue(): Promise<void> {
    while (this.executionQueue.length > 0 && this.activeOrders.size < this.config.maxConcurrentOrders) {
      const { signal } = this.executionQueue.shift()!
      
      try {
        await this.executeSignal(signal)
        
        // Add delay between executions
        if (this.config.orderExecutionDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.orderExecutionDelay))
        }
      } catch (error) {
        console.error(`Error executing signal for ${signal.symbol}:`, error)
      }
    }
  }

  /**
   * Execute a trading signal
   */
  private async executeSignal(signal: TradingSignal): Promise<void> {
    try {
      // Skip if in simulation mode
      if (this.config.simulationMode) {
        console.log(`[SIMULATION] Would execute: ${signal.action} ${signal.symbol} at ${signal.price}`)
        return
      }

      // Skip if auto-trade is disabled
      if (!this.config.autoTrade) {
        console.log(`[MANUAL MODE] Signal generated: ${signal.action} ${signal.symbol} - Manual execution required`)
        return
      }

      // Create unified order from signal
      const order = this.convertSignalToOrder(signal)
      
      // Execute order through order management system
      const result = await this.orderManager?.placeOrder(order) || { success: false, error: 'Order manager not available' }
      
      if (result.success) {
        this.activeOrders.set(order.id, order)
        console.log(`Order executed: ${signal.action} ${signal.symbol} - Order ID: ${result.orderId}`)
        
        // Record trade
        this.recordTrade(signal, result)
      } else {
        console.error(`Order failed: ${(result as any).error || (result as any).message || 'Unknown error'}`)
      }
      
    } catch (error) {
      console.error(`Signal execution failed:`, error)
    }
  }

  /**
   * Convert trading signal to unified order
   */
  private convertSignalToOrder(signal: TradingSignal): UnifiedOrder {
    // Calculate position size based on portfolio and risk parameters
    const portfolioValue = 10000 // Default portfolio value for calculation
    const maxPositionValue = portfolioValue * 0.05 // 5% max per position
    const positionSize = maxPositionValue / signal.price

    return {
      id: `signal-${signal.strategy}-${signal.symbol}-${Date.now()}`,
      type: 'market', // Start with market orders for simplicity
      side: signal.action as 'buy' | 'sell',
      asset: signal.symbol,
      quantity: positionSize,
      price: signal.price,
      exchange: 'auto', // Let order manager decide
      timeInForce: 'IOC'
    }
  }

  /**
   * Record completed trade
   */
  private recordTrade(signal: TradingSignal, result: any): void {
    const trade = {
      id: result.orderId || `trade-${Date.now()}`,
      strategy: signal.strategy,
      symbol: signal.symbol,
      action: signal.action,
      price: result.executedPrice || signal.price,
      quantity: result.executedQuantity || 0,
      timestamp: Date.now(),
      fees: result.fees || 0,
      exchange: result.exchange,
      signalStrength: signal.strength,
      signalConfidence: signal.confidence,
      reasoning: signal.reasoning
    }

    this.tradingHistory.push(trade)
  }

  /**
   * Start portfolio updates
   */
  private startPortfolioUpdates(): void {
    this.portfolioUpdateInterval = setInterval(async () => {
      try {
        // Update portfolio metrics
        await this.portfolioTracker?.getPortfolioSummary()
        
        // Report to wallet manager if configured
        if (this.config.wallet.masterWalletId) {
          await this.reportPerformanceToMasterWallet()
        }
      } catch (error) {
        console.error('Portfolio update error:', error)
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Report performance to master wallet
   */
  private async reportPerformanceToMasterWallet(): Promise<void> {
    try {
      const portfolio = await this.portfolioTracker?.getPortfolioSummary()
      if (!portfolio || !this.walletManager) return
      
      await this.walletManager.reportPerformanceToMaster('trading-engine', {
        total_value_usd: portfolio.totalValue,
        total_pnl: portfolio.totalGain,
        total_pnl_percentage: portfolio.totalGainPercentage,
        daily_pnl: portfolio.dailyPnl,
        total_trades: this.tradingHistory.length,
        winning_trades: this.tradingHistory.filter(t => t.action === 'sell' && t.pnl > 0).length,
        win_rate: this.calculateWinRate()
      })
    } catch (error) {
      console.error('Error reporting to master wallet:', error)
    }
  }

  /**
   * Start risk monitoring
   */
  private startRiskMonitoring(): void {
    this.riskMonitoringInterval = setInterval(async () => {
      try {
        const alerts = this.riskManager?.getAlerts() || []
        
        for (const alert of alerts) {
          if (alert.severity === 'critical') {
            console.error(`CRITICAL RISK ALERT: ${alert.message}`)
            
            // Auto-action: Emergency stop
            await this.emergencyStop()
          }
        }
      } catch (error) {
        console.error('Risk monitoring error:', error)
      }
    }, 5000) // Every 5 seconds
  }

  /**
   * Start metrics updates
   */
  private startMetricsUpdates(): void {
    this.metricsUpdateInterval = setInterval(() => {
      try {
        // Update strategy performance metrics
        for (const strategyName of this.config.strategies.enabled) {
          const strategyTrades = this.tradingHistory.filter(t => t.strategy === strategyName)
          this.strategies?.calculatePerformance(strategyName, strategyTrades)
        }
      } catch (error) {
        console.error('Metrics update error:', error)
      }
    }, 60000) // Every minute
  }

  /**
   * Setup WebSocket subscriptions
   */
  private setupWebSocketSubscriptions(): void {
    // Subscribe to market data updates
    this.webSocketManager?.subscribe('market_data', (message) => {
      // Market data is handled by the market data service
      // This subscription is for logging/monitoring
    })

    // Subscribe to order updates
    this.webSocketManager?.subscribe('order_update', (message) => {
      const orderUpdate = message.data
      if (orderUpdate.status === 'filled' || orderUpdate.status === 'cancelled') {
        this.activeOrders.delete(orderUpdate.orderId)
      }
    })

    // Subscribe to risk alerts
    this.webSocketManager?.subscribe('risk_alert', (message) => {
      const alert = message.data
      console.warn(`Risk Alert [${alert.severity}]: ${alert.message}`)
    })
  }

  /**
   * Emergency stop - cancel all orders and close positions
   */
  async emergencyStop(): Promise<void> {
    try {
      console.error('EMERGENCY STOP ACTIVATED')
      
      // Cancel all active orders
      await this.cancelAllOrders()
      
      // Stop signal processing
      if (this.signalProcessingInterval) {
        clearInterval(this.signalProcessingInterval)
        this.signalProcessingInterval = undefined
      }
      
      // Emergency stop order management
      await this.orderManager?.emergencyStop()
      
      // Trigger risk manager emergency stop
      this.riskManager?.triggerEmergencyStop('Emergency stop activated by trading engine')
      
      console.error('EMERGENCY STOP COMPLETED')
    } catch (error) {
      console.error('Emergency stop failed:', error)
    }
  }

  /**
   * Cancel all active orders
   */
  private async cancelAllOrders(): Promise<void> {
    const cancelPromises: Promise<any>[] = []
    
    for (const [orderId, order] of this.activeOrders.entries()) {
      const promise = this.orderManager?.cancelOrder(orderId, order.exchange) || Promise.resolve({ success: false })
      cancelPromises.push(promise)
    }
    
    await Promise.allSettled(cancelPromises)
    this.activeOrders.clear()
  }

  /**
   * Calculate current win rate
   */
  private calculateWinRate(): number {
    const totalTrades = this.tradingHistory.length
    if (totalTrades === 0) return 0
    
    const winningTrades = this.tradingHistory.filter(trade => {
      // Simple P&L calculation (would be more complex in reality)
      return trade.action === 'sell' // Assuming sells close profitable positions
    }).length
    
    return (winningTrades / totalTrades) * 100
  }

  /**
   * Get trading engine status
   */
  getStatus(): TradingEngineStatus {
    return {
      isRunning: this.isRunning,
      autoTradeEnabled: this.config.autoTrade,
      simulationMode: this.config.simulationMode,
      activeStrategies: this.config.strategies.enabled.length,
      totalSignals: this.pendingSignals.length + this.executionQueue.length,
      pendingOrders: this.activeOrders.size,
      connectedExchanges: this.getConnectedExchangeCount(),
      totalPortfolioValue: 10000, // Default value for status
      dailyPnL: 0, // Would be calculated from portfolio
      riskScore: 0, // Would be calculated from risk manager
      lastUpdate: Date.now()
    }
  }

  /**
   * Get connected exchange count
   */
  private getConnectedExchangeCount(): number {
    let count = 0
    
    // Check each exchange health
    if (this.hyperliquid) count++
    if (this.dex) count++
    if (this.coinbase) count++
    
    return count
  }

  /**
   * Get trading metrics
   */
  async getMetrics(): Promise<TradingMetrics> {
    const totalTrades = this.tradingHistory.length
    const winningTrades = this.tradingHistory.filter(t => t.pnl > 0).length
    const losingTrades = totalTrades - winningTrades
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: this.calculateWinRate(),
      totalReturn: this.tradingHistory.reduce((sum, t) => sum + (t.pnl || 0), 0),
      maxDrawdown: 0, // Would calculate from portfolio history
      sharpeRatio: 0, // Would calculate from returns
      totalVolume: this.tradingHistory.reduce((sum, t) => sum + (t.price * t.quantity), 0),
      avgTradeSize: totalTrades > 0 ? this.tradingHistory.reduce((sum, t) => sum + t.quantity, 0) / totalTrades : 0,
      totalFees: this.tradingHistory.reduce((sum, t) => sum + (t.fees || 0), 0),
      profitFactor: 0, // Would calculate profit factor
      strategies: this.strategies?.getPerformance() || {},
      exchanges: {} // Would include per-exchange metrics
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TradingEngineConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update strategy configurations
    if (newConfig.strategies) {
      this.configureStrategies()
    }
  }

  /**
   * Get recent trading history
   */
  getTradingHistory(limit: number = 100): any[] {
    return this.tradingHistory.slice(-limit)
  }

  /**
   * Get active orders
   */
  getActiveOrders(): UnifiedOrder[] {
    return Array.from(this.activeOrders.values())
  }

  /**
   * Manual order execution
   */
  async executeManualOrder(order: UnifiedOrder): Promise<any> {
    try {
      const result = await this.orderManager?.placeOrder(order) || { success: false, error: 'Order manager not available' }
      
      if (result.success) {
        this.activeOrders.set(order.id, order)
      }
      
      return result
    } catch (error) {
      console.error('Manual order execution failed:', error)
      throw error
    }
  }
}

export default TradingEngine