/**
 * Risk Management System
 * Comprehensive risk control for trading operations
 */

import PortfolioTracker, { PortfolioSummary, UnifiedPosition } from './portfolio-tracker'
import { UnifiedOrder, OrderResult } from './order-management'

export interface RiskConfig {
  // Position sizing rules
  maxPositionSizePercent: number      // Max % of portfolio per position
  maxTotalExposure: number            // Max total exposure across all positions
  maxLeverage: number                 // Maximum allowed leverage
  
  // Risk limits
  dailyLossLimit: number              // Max daily loss in USD
  weeklyLossLimit: number             // Max weekly loss in USD
  monthlyLossLimit: number            // Max monthly loss in USD
  maxDrawdownPercent: number          // Max portfolio drawdown %
  
  // Trading limits
  maxOrdersPerDay: number             // Max orders per day
  maxOrdersPerHour: number            // Max orders per hour
  minTimeBetweenOrders: number        // Min seconds between orders
  
  // Concentration limits
  maxAssetConcentration: number       // Max % allocation to single asset
  maxExchangeConcentration: number    // Max % allocation to single exchange
  
  // Stop loss and take profit
  defaultStopLossPercent: number      // Default stop loss %
  defaultTakeProfitPercent: number    // Default take profit %
  trailingStopPercent: number         // Trailing stop %
  
  // Correlation limits
  maxCorrelatedPositions: number      // Max correlated positions
  correlationThreshold: number        // Correlation threshold (0-1)
  
  // Volatility controls
  maxVolatilityPercent: number        // Max allowed asset volatility
  volatilityLookbackDays: number      // Days to calculate volatility
  
  // Emergency controls
  enableEmergencyStop: boolean        // Enable emergency stop
  emergencyStopTrigger: number        // Emergency stop trigger %
  
  // Margin and liquidity
  minMarginRatio: number              // Minimum margin ratio
  maxMarginUtilization: number        // Max margin utilization %
  liquidityBuffer: number             // Liquidity buffer in USD
}

export interface RiskMetrics {
  // Current risk exposure
  totalExposure: number
  marginUtilization: number
  leverageRatio: number
  concentrationRisk: number
  
  // Historical metrics
  currentDrawdown: number
  maxDrawdown: number
  volatility: number
  sharpeRatio: number
  valueAtRisk: number
  
  // Position metrics
  numberOfPositions: number
  averagePositionSize: number
  largestPosition: number
  correlationMatrix: {[pair: string]: number}
  
  // Trading metrics
  ordersToday: number
  ordersThisHour: number
  lastOrderTime: number
  
  // P&L tracking
  dailyPnL: number
  weeklyPnL: number
  monthlyPnL: number
  realizedPnL: number
  unrealizedPnL: number
}

export interface RiskCheck {
  allowed: boolean
  reason: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  action: 'allow' | 'warn' | 'block' | 'reduce_size' | 'emergency_stop'
  suggestedSize?: number
  details?: any
}

export interface RiskAlert {
  id: string
  type: 'position_limit' | 'loss_limit' | 'margin_call' | 'correlation' | 'volatility' | 'emergency'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  acknowledged: boolean
  data?: any
}

export class RiskManager {
  private config: RiskConfig
  private portfolioTracker: PortfolioTracker
  private orderHistory: Array<{timestamp: number, orderId: string}> = []
  private alerts: RiskAlert[] = []
  private emergencyMode: boolean = false
  private riskMetricsCache?: {metrics: RiskMetrics, timestamp: number}

  constructor(config: RiskConfig, portfolioTracker: PortfolioTracker) {
    this.config = config
    this.portfolioTracker = portfolioTracker
  }

  /**
   * Pre-trade risk check for orders
   */
  async preTradeRiskCheck(order: UnifiedOrder): Promise<RiskCheck> {
    try {
      const portfolio = await this.portfolioTracker.getPortfolioSummary()
      const metrics = await this.calculateRiskMetrics(portfolio)

      // Check order frequency limits
      const frequencyCheck = this.checkOrderFrequency()
      if (!frequencyCheck.allowed) return frequencyCheck

      // Check position size limits
      const positionSizeCheck = this.checkPositionSize(order, portfolio)
      if (!positionSizeCheck.allowed) return positionSizeCheck

      // Check total exposure limits
      const exposureCheck = this.checkTotalExposure(order, portfolio)
      if (!exposureCheck.allowed) return exposureCheck

      // Check concentration limits
      const concentrationCheck = this.checkConcentrationLimits(order, portfolio)
      if (!concentrationCheck.allowed) return concentrationCheck

      // Check leverage limits
      const leverageCheck = this.checkLeverageLimits(order, portfolio)
      if (!leverageCheck.allowed) return leverageCheck

      // Check loss limits
      const lossLimitCheck = this.checkLossLimits(portfolio)
      if (!lossLimitCheck.allowed) return lossLimitCheck

      // Check margin requirements
      const marginCheck = this.checkMarginRequirements(order, portfolio)
      if (!marginCheck.allowed) return marginCheck

      // Check volatility limits
      const volatilityCheck = await this.checkVolatilityLimits(order)
      if (!volatilityCheck.allowed) return volatilityCheck

      // Check correlation limits
      const correlationCheck = await this.checkCorrelationLimits(order, portfolio)
      if (!correlationCheck.allowed) return correlationCheck

      // Emergency mode check
      if (this.emergencyMode) {
        return {
          allowed: false,
          reason: 'Emergency stop is active - all trading suspended',
          severity: 'critical',
          action: 'emergency_stop'
        }
      }

      return {
        allowed: true,
        reason: 'All risk checks passed',
        severity: 'low',
        action: 'allow'
      }

    } catch (error) {
      console.error('Risk check failed:', error)
      return {
        allowed: false,
        reason: `Risk check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
        action: 'block'
      }
    }
  }

  /**
   * Post-trade risk monitoring
   */
  async postTradeRiskCheck(orderResult: OrderResult): Promise<void> {
    if (orderResult.success && orderResult.orderId) {
      // Track order execution
      this.orderHistory.push({
        timestamp: orderResult.timestamp,
        orderId: orderResult.orderId
      })

      // Clean old order history (keep last 24 hours)
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000
      this.orderHistory = this.orderHistory.filter(order => order.timestamp > dayAgo)

      // Check for new risk alerts
      await this.generateRiskAlerts()
    }
  }

  /**
   * Calculate comprehensive risk metrics
   */
  async calculateRiskMetrics(portfolio?: PortfolioSummary): Promise<RiskMetrics> {
    // Use cached metrics if less than 60 seconds old
    if (this.riskMetricsCache && Date.now() - this.riskMetricsCache.timestamp < 60000) {
      return this.riskMetricsCache.metrics
    }

    if (!portfolio) {
      portfolio = await this.portfolioTracker.getPortfolioSummary()
    }

    const positions = portfolio.positions
    const totalValue = portfolio.totalValue

    // Calculate exposure and leverage
    const totalExposure = positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
    const marginUsed = positions.reduce((sum, pos) => sum + (pos.marginUsed || 0), 0)
    const leverageRatio = totalValue > 0 ? totalExposure / totalValue : 0
    const marginUtilization = totalValue > 0 ? marginUsed / totalValue : 0

    // Calculate concentration risk
    const largestPosition = positions.length > 0 ? Math.max(...positions.map(p => p.marketValue)) : 0
    const concentrationRisk = totalValue > 0 ? largestPosition / totalValue : 0

    // Calculate Value at Risk (95% confidence, 1-day)
    const valueAtRisk = this.calculateVaR(positions, 0.95, 1)

    // Calculate correlation matrix
    const correlationMatrix = await this.calculateCorrelationMatrix(positions)

    // Count orders
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const hourAgo = now - 60 * 60 * 1000
    const ordersToday = this.orderHistory.filter(o => o.timestamp > dayAgo).length
    const ordersThisHour = this.orderHistory.filter(o => o.timestamp > hourAgo).length
    const lastOrderTime = this.orderHistory.length > 0 ? 
      Math.max(...this.orderHistory.map(o => o.timestamp)) : 0

    const metrics: RiskMetrics = {
      totalExposure,
      marginUtilization,
      leverageRatio,
      concentrationRisk,
      currentDrawdown: this.calculateCurrentDrawdown(portfolio),
      maxDrawdown: portfolio.maxDrawdown,
      volatility: 0, // TODO: Calculate portfolio volatility
      sharpeRatio: portfolio.sharpeRatio,
      valueAtRisk,
      numberOfPositions: positions.length,
      averagePositionSize: positions.length > 0 ? totalExposure / positions.length : 0,
      largestPosition,
      correlationMatrix,
      ordersToday,
      ordersThisHour,
      lastOrderTime,
      dailyPnL: portfolio.dailyPnl,
      weeklyPnL: portfolio.weeklyPnl,
      monthlyPnL: portfolio.monthlyPnl,
      realizedPnL: positions.reduce((sum, pos) => sum + pos.realizedPnl, 0),
      unrealizedPnL: positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)
    }

    // Cache the metrics
    this.riskMetricsCache = {
      metrics,
      timestamp: Date.now()
    }

    return metrics
  }

  /**
   * Check order frequency limits
   */
  private checkOrderFrequency(): RiskCheck {
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    const hourAgo = now - 60 * 60 * 1000

    const ordersToday = this.orderHistory.filter(o => o.timestamp > dayAgo).length
    const ordersThisHour = this.orderHistory.filter(o => o.timestamp > hourAgo).length
    const lastOrderTime = this.orderHistory.length > 0 ? 
      Math.max(...this.orderHistory.map(o => o.timestamp)) : 0

    if (ordersToday >= this.config.maxOrdersPerDay) {
      return {
        allowed: false,
        reason: `Daily order limit exceeded (${ordersToday}/${this.config.maxOrdersPerDay})`,
        severity: 'medium',
        action: 'block'
      }
    }

    if (ordersThisHour >= this.config.maxOrdersPerHour) {
      return {
        allowed: false,
        reason: `Hourly order limit exceeded (${ordersThisHour}/${this.config.maxOrdersPerHour})`,
        severity: 'medium',
        action: 'block'
      }
    }

    if (lastOrderTime > 0 && now - lastOrderTime < this.config.minTimeBetweenOrders * 1000) {
      const waitTime = Math.ceil((this.config.minTimeBetweenOrders * 1000 - (now - lastOrderTime)) / 1000)
      return {
        allowed: false,
        reason: `Must wait ${waitTime} seconds before next order`,
        severity: 'low',
        action: 'warn'
      }
    }

    return {
      allowed: true,
      reason: 'Order frequency within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check position size limits
   */
  private checkPositionSize(order: UnifiedOrder, portfolio: PortfolioSummary): RiskCheck {
    const orderValue = order.quantity * (order.price || 0)
    const maxPositionValue = portfolio.totalValue * (this.config.maxPositionSizePercent / 100)

    if (orderValue > maxPositionValue) {
      const suggestedSize = maxPositionValue / (order.price || 1)
      return {
        allowed: false,
        reason: `Position size too large: $${orderValue.toFixed(2)} > $${maxPositionValue.toFixed(2)} max`,
        severity: 'medium',
        action: 'reduce_size',
        suggestedSize
      }
    }

    return {
      allowed: true,
      reason: 'Position size within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check total exposure limits
   */
  private checkTotalExposure(order: UnifiedOrder, portfolio: PortfolioSummary): RiskCheck {
    const orderValue = order.quantity * (order.price || 0)
    const currentExposure = portfolio.positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
    const newTotalExposure = currentExposure + orderValue

    if (newTotalExposure > this.config.maxTotalExposure) {
      return {
        allowed: false,
        reason: `Total exposure limit exceeded: $${newTotalExposure.toFixed(2)} > $${this.config.maxTotalExposure.toFixed(2)}`,
        severity: 'high',
        action: 'block'
      }
    }

    return {
      allowed: true,
      reason: 'Total exposure within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check concentration limits
   */
  private checkConcentrationLimits(order: UnifiedOrder, portfolio: PortfolioSummary): RiskCheck {
    const orderValue = order.quantity * (order.price || 0)
    
    // Check asset concentration
    const assetPositions = portfolio.positions.filter(pos => pos.symbol === order.asset)
    const currentAssetValue = assetPositions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const newAssetValue = currentAssetValue + orderValue
    const assetConcentration = newAssetValue / portfolio.totalValue

    if (assetConcentration > this.config.maxAssetConcentration / 100) {
      return {
        allowed: false,
        reason: `Asset concentration too high: ${(assetConcentration * 100).toFixed(1)}% > ${this.config.maxAssetConcentration}%`,
        severity: 'medium',
        action: 'reduce_size'
      }
    }

    // Check exchange concentration
    const exchangePositions = portfolio.positions.filter(pos => pos.exchange === order.exchange)
    const currentExchangeValue = exchangePositions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const newExchangeValue = currentExchangeValue + orderValue
    const exchangeConcentration = newExchangeValue / portfolio.totalValue

    if (exchangeConcentration > this.config.maxExchangeConcentration / 100) {
      return {
        allowed: false,
        reason: `Exchange concentration too high: ${(exchangeConcentration * 100).toFixed(1)}% > ${this.config.maxExchangeConcentration}%`,
        severity: 'medium',
        action: 'reduce_size'
      }
    }

    return {
      allowed: true,
      reason: 'Concentration limits within bounds',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check leverage limits
   */
  private checkLeverageLimits(order: UnifiedOrder, portfolio: PortfolioSummary): RiskCheck {
    const orderValue = order.quantity * (order.price || 0)
    const currentExposure = portfolio.positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
    const newTotalExposure = currentExposure + orderValue
    const newLeverage = newTotalExposure / portfolio.totalValue

    if (newLeverage > this.config.maxLeverage) {
      return {
        allowed: false,
        reason: `Leverage too high: ${newLeverage.toFixed(2)}x > ${this.config.maxLeverage}x`,
        severity: 'high',
        action: 'reduce_size'
      }
    }

    return {
      allowed: true,
      reason: 'Leverage within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check loss limits
   */
  private checkLossLimits(portfolio: PortfolioSummary): RiskCheck {
    if (portfolio.dailyPnl < -this.config.dailyLossLimit) {
      return {
        allowed: false,
        reason: `Daily loss limit exceeded: -$${Math.abs(portfolio.dailyPnl).toFixed(2)} > -$${this.config.dailyLossLimit.toFixed(2)}`,
        severity: 'high',
        action: 'block'
      }
    }

    if (portfolio.weeklyPnl < -this.config.weeklyLossLimit) {
      return {
        allowed: false,
        reason: `Weekly loss limit exceeded: -$${Math.abs(portfolio.weeklyPnl).toFixed(2)} > -$${this.config.weeklyLossLimit.toFixed(2)}`,
        severity: 'high',
        action: 'block'
      }
    }

    if (portfolio.monthlyPnl < -this.config.monthlyLossLimit) {
      return {
        allowed: false,
        reason: `Monthly loss limit exceeded: -$${Math.abs(portfolio.monthlyPnl).toFixed(2)} > -$${this.config.monthlyLossLimit.toFixed(2)}`,
        severity: 'critical',
        action: 'emergency_stop'
      }
    }

    const currentDrawdown = this.calculateCurrentDrawdown(portfolio)
    if (currentDrawdown > this.config.maxDrawdownPercent) {
      return {
        allowed: false,
        reason: `Maximum drawdown exceeded: ${currentDrawdown.toFixed(2)}% > ${this.config.maxDrawdownPercent}%`,
        severity: 'critical',
        action: 'emergency_stop'
      }
    }

    return {
      allowed: true,
      reason: 'Loss limits within bounds',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check margin requirements
   */
  private checkMarginRequirements(order: UnifiedOrder, portfolio: PortfolioSummary): RiskCheck {
    const marginUtilization = portfolio.marginUsed / portfolio.totalValue
    
    if (marginUtilization > this.config.maxMarginUtilization / 100) {
      return {
        allowed: false,
        reason: `Margin utilization too high: ${(marginUtilization * 100).toFixed(1)}% > ${this.config.maxMarginUtilization}%`,
        severity: 'high',
        action: 'block'
      }
    }

    if (portfolio.availableCash < this.config.liquidityBuffer) {
      return {
        allowed: false,
        reason: `Insufficient liquidity buffer: $${portfolio.availableCash.toFixed(2)} < $${this.config.liquidityBuffer.toFixed(2)}`,
        severity: 'medium',
        action: 'reduce_size'
      }
    }

    return {
      allowed: true,
      reason: 'Margin requirements met',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check volatility limits
   */
  private async checkVolatilityLimits(order: UnifiedOrder): Promise<RiskCheck> {
    // TODO: Implement volatility calculation from historical data
    // For now, assume volatility is within limits
    return {
      allowed: true,
      reason: 'Volatility within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Check correlation limits
   */
  private async checkCorrelationLimits(order: UnifiedOrder, portfolio: PortfolioSummary): Promise<RiskCheck> {
    // TODO: Implement correlation analysis
    // For now, assume correlation is within limits
    return {
      allowed: true,
      reason: 'Correlation within limits',
      severity: 'low',
      action: 'allow'
    }
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private calculateVaR(positions: UnifiedPosition[], confidence: number, days: number): number {
    // Simplified VaR calculation
    // In practice, this would use historical returns and correlation
    const totalValue = positions.reduce((sum, pos) => sum + Math.abs(pos.marketValue), 0)
    const assumedVolatility = 0.02 // 2% daily volatility assumption
    const zScore = confidence === 0.95 ? 1.645 : confidence === 0.99 ? 2.326 : 1.96
    
    return totalValue * assumedVolatility * zScore * Math.sqrt(days)
  }

  /**
   * Calculate correlation matrix for positions
   */
  private async calculateCorrelationMatrix(positions: UnifiedPosition[]): Promise<{[pair: string]: number}> {
    const matrix: {[pair: string]: number} = {}
    
    // TODO: Implement correlation calculation from price history
    // For now, return empty matrix
    
    return matrix
  }

  /**
   * Calculate current drawdown
   */
  private calculateCurrentDrawdown(portfolio: PortfolioSummary): number {
    if (portfolio.allTimeHigh <= 0) return 0
    return ((portfolio.allTimeHigh - portfolio.totalValue) / portfolio.allTimeHigh) * 100
  }

  /**
   * Generate risk alerts based on current metrics
   */
  private async generateRiskAlerts(): Promise<void> {
    const portfolio = await this.portfolioTracker.getPortfolioSummary()
    const metrics = await this.calculateRiskMetrics(portfolio)
    
    // Check for various risk conditions and generate alerts
    this.checkDrawdownAlert(portfolio)
    this.checkMarginAlert(metrics)
    this.checkConcentrationAlert(portfolio)
    this.checkLossLimitAlert(portfolio)
    
    // Trigger emergency stop if configured
    if (this.config.enableEmergencyStop) {
      const currentDrawdown = this.calculateCurrentDrawdown(portfolio)
      if (currentDrawdown > this.config.emergencyStopTrigger) {
        this.triggerEmergencyStop('Maximum drawdown exceeded')
      }
    }
  }

  /**
   * Check for drawdown alerts
   */
  private checkDrawdownAlert(portfolio: PortfolioSummary): void {
    const currentDrawdown = this.calculateCurrentDrawdown(portfolio)
    
    if (currentDrawdown > this.config.maxDrawdownPercent * 0.8) {
      this.addAlert({
        id: `drawdown-${Date.now()}`,
        type: 'position_limit',
        severity: currentDrawdown > this.config.maxDrawdownPercent ? 'critical' : 'high',
        message: `High drawdown detected: ${currentDrawdown.toFixed(2)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        data: { drawdown: currentDrawdown, limit: this.config.maxDrawdownPercent }
      })
    }
  }

  /**
   * Check for margin alerts
   */
  private checkMarginAlert(metrics: RiskMetrics): void {
    if (metrics.marginUtilization > this.config.maxMarginUtilization * 0.8 / 100) {
      this.addAlert({
        id: `margin-${Date.now()}`,
        type: 'margin_call',
        severity: metrics.marginUtilization > this.config.maxMarginUtilization / 100 ? 'critical' : 'high',
        message: `High margin utilization: ${(metrics.marginUtilization * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        acknowledged: false,
        data: { utilization: metrics.marginUtilization, limit: this.config.maxMarginUtilization / 100 }
      })
    }
  }

  /**
   * Check for concentration alerts
   */
  private checkConcentrationAlert(portfolio: PortfolioSummary): void {
    // Check asset concentration
    for (const [asset, allocation] of Object.entries(portfolio.byAsset)) {
      if (allocation.percentage > this.config.maxAssetConcentration * 0.8) {
        this.addAlert({
          id: `concentration-${asset}-${Date.now()}`,
          type: 'position_limit',
          severity: allocation.percentage > this.config.maxAssetConcentration ? 'high' : 'medium',
          message: `High asset concentration in ${asset}: ${allocation.percentage.toFixed(1)}%`,
          timestamp: Date.now(),
          acknowledged: false,
          data: { asset, percentage: allocation.percentage, limit: this.config.maxAssetConcentration }
        })
      }
    }
  }

  /**
   * Check for loss limit alerts
   */
  private checkLossLimitAlert(portfolio: PortfolioSummary): void {
    const dailyLossPercent = Math.abs(portfolio.dailyPnl) / this.config.dailyLossLimit * 100
    
    if (portfolio.dailyPnl < 0 && dailyLossPercent > 80) {
      this.addAlert({
        id: `loss-limit-${Date.now()}`,
        type: 'loss_limit',
        severity: dailyLossPercent > 100 ? 'critical' : 'high',
        message: `Approaching daily loss limit: -$${Math.abs(portfolio.dailyPnl).toFixed(2)}`,
        timestamp: Date.now(),
        acknowledged: false,
        data: { dailyPnl: portfolio.dailyPnl, limit: this.config.dailyLossLimit }
      })
    }
  }

  /**
   * Add risk alert
   */
  private addAlert(alert: RiskAlert): void {
    this.alerts.push(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }
  }

  /**
   * Trigger emergency stop
   */
  triggerEmergencyStop(reason: string): void {
    this.emergencyMode = true
    
    this.addAlert({
      id: `emergency-${Date.now()}`,
      type: 'emergency',
      severity: 'critical',
      message: `Emergency stop activated: ${reason}`,
      timestamp: Date.now(),
      acknowledged: false
    })
    
    console.error(`EMERGENCY STOP ACTIVATED: ${reason}`)
  }

  /**
   * Disable emergency stop
   */
  disableEmergencyStop(): void {
    this.emergencyMode = false
  }

  /**
   * Get current risk metrics
   */
  async getRiskMetrics(): Promise<RiskMetrics> {
    return this.calculateRiskMetrics()
  }

  /**
   * Get active alerts
   */
  getAlerts(): RiskAlert[] {
    return this.alerts.filter(alert => !alert.acknowledged)
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
    }
  }

  /**
   * Update risk configuration
   */
  updateConfig(newConfig: Partial<RiskConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get risk configuration
   */
  getConfig(): RiskConfig {
    return { ...this.config }
  }
}

export default RiskManager