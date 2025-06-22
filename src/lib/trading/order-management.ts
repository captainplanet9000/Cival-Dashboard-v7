/**
 * Order Management System
 * Unified order execution engine for centralized and decentralized exchanges
 */

import HyperliquidConnector, { HyperliquidOrder, HyperliquidOrderResult } from './hyperliquid-connector'
import DEXConnector, { SwapParams, DEXQuote } from './dex-connector'
import { authService } from '../auth/auth-service'

export interface TradingConfig {
  hyperliquid: {
    privateKey: string
    testnet: boolean
  }
  dex: {
    privateKey: string
    rpcUrl: string
    chainId: number
    slippageTolerance: number
  }
  riskManagement: {
    maxPositionSize: number
    maxDailyTrades: number
    stopLossPercentage: number
    takeProfitPercentage: number
  }
}

export interface UnifiedOrder {
  id: string
  type: 'market' | 'limit' | 'stop'
  side: 'buy' | 'sell'
  asset: string
  quantity: number
  price?: number
  stopPrice?: number
  exchange: 'hyperliquid' | 'uniswap' | '1inch' | 'auto'
  timeInForce?: 'GTC' | 'IOC' | 'FOK'
  reduceOnly?: boolean
  postOnly?: boolean
  clientOrderId?: string
}

export interface OrderResult {
  success: boolean
  orderId?: string
  transactionHash?: string
  message: string
  executedPrice?: number
  executedQuantity?: number
  fees?: number
  exchange: string
  timestamp: number
}

export interface Position {
  asset: string
  size: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  realizedPnl: number
  marginUsed: number
  leverage: number
  exchange: string
}

export interface Portfolio {
  totalValue: number
  availableBalance: number
  totalMarginUsed: number
  totalUnrealizedPnl: number
  totalRealizedPnl: number
  positions: Position[]
  dailyPnl: number
  dailyTrades: number
}

export interface MarketData {
  asset: string
  price: number
  change24h: number
  volume24h: number
  high24h: number
  low24h: number
  bid: number
  ask: number
  timestamp: number
  exchange: string
}

export class OrderManagementSystem {
  private hyperliquid: HyperliquidConnector
  private dex: DEXConnector
  private config: TradingConfig
  private orders: Map<string, UnifiedOrder> = new Map()
  private dailyTradeCount: number = 0
  private lastResetDate: string = new Date().toDateString()

  constructor(config: TradingConfig) {
    this.config = config
    
    // Initialize exchange connectors
    this.hyperliquid = new HyperliquidConnector({
      privateKey: config.hyperliquid.privateKey,
      testnet: config.hyperliquid.testnet
    })

    this.dex = new DEXConnector({
      privateKey: config.dex.privateKey,
      rpcUrl: config.dex.rpcUrl,
      chainId: config.dex.chainId,
      slippageTolerance: config.dex.slippageTolerance
    })
  }

  /**
   * Place a unified order that automatically routes to best exchange
   */
  async placeOrder(order: UnifiedOrder): Promise<OrderResult> {
    try {
      // Reset daily trade count if new day
      this.resetDailyCountIfNeeded()

      // Risk management checks
      const riskCheck = await this.performRiskChecks(order)
      if (!riskCheck.allowed) {
        return {
          success: false,
          message: riskCheck.reason,
          exchange: 'risk_management',
          timestamp: Date.now()
        }
      }

      // Route order based on exchange preference or auto-routing
      let result: OrderResult

      if (order.exchange === 'auto') {
        result = await this.autoRouteOrder(order)
      } else if (order.exchange === 'hyperliquid') {
        result = await this.executeHyperliquidOrder(order)
      } else {
        result = await this.executeDEXOrder(order)
      }

      // Track order
      if (result.success) {
        this.orders.set(order.id, order)
        this.dailyTradeCount++
      }

      return result

    } catch (error) {
      console.error('Order execution failed:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        exchange: 'error',
        timestamp: Date.now()
      }
    }
  }

  /**
   * Auto-route order to best exchange based on liquidity and fees
   */
  private async autoRouteOrder(order: UnifiedOrder): Promise<OrderResult> {
    try {
      // Get quotes from multiple sources for comparison
      const quotes = await this.getBestQuotes(order)
      
      if (quotes.length === 0) {
        throw new Error('No liquidity available for this trade')
      }

      // Sort by best execution price
      const bestQuote = quotes[0]
      
      // Route to the exchange with the best quote
      if (bestQuote.exchange.includes('Hyperliquid')) {
        return this.executeHyperliquidOrder(order)
      } else {
        return this.executeDEXOrder(order, bestQuote.exchange)
      }

    } catch (error) {
      throw new Error(`Auto-routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute order on Hyperliquid
   */
  private async executeHyperliquidOrder(order: UnifiedOrder): Promise<OrderResult> {
    try {
      const hlOrder: HyperliquidOrder = {
        coin: order.asset,
        is_buy: order.side === 'buy',
        sz: order.quantity,
        limit_px: order.price || 0,
        order_type: order.type === 'market' ? 'Market' : 'Limit',
        reduce_only: order.reduceOnly,
        tif: order.timeInForce === 'IOC' ? 'Ioc' : 'Gtc'
      }

      const result: HyperliquidOrderResult = await this.hyperliquid.placeOrder(hlOrder)

      if (result.status === 'ok' && result.response?.data.statuses[0].resting) {
        return {
          success: true,
          orderId: result.response.data.statuses[0].resting!.oid.toString(),
          message: 'Order placed successfully on Hyperliquid',
          exchange: 'hyperliquid',
          timestamp: Date.now()
        }
      } else if (result.response?.data.statuses[0].filled) {
        const filled = result.response.data.statuses[0].filled!
        return {
          success: true,
          message: 'Order filled successfully on Hyperliquid',
          executedPrice: parseFloat(filled.avgPx),
          executedQuantity: parseFloat(filled.totalSz),
          exchange: 'hyperliquid',
          timestamp: Date.now()
        }
      } else {
        throw new Error(result.response?.data.statuses[0].error || 'Order failed')
      }

    } catch (error) {
      throw new Error(`Hyperliquid execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Execute order on DEX
   */
  private async executeDEXOrder(order: UnifiedOrder, preferredExchange?: string): Promise<OrderResult> {
    try {
      // For DEX, we need to convert order to swap parameters
      const tokenIn = order.side === 'buy' ? 'USDC' : order.asset
      const tokenOut = order.side === 'buy' ? order.asset : 'USDC'
      const amountIn = order.side === 'buy' 
        ? (order.quantity * (order.price || 0)).toString()
        : order.quantity.toString()

      if (preferredExchange?.includes('1inch')) {
        // Execute via 1inch
        const tx = await this.dex.execute1inchSwap(tokenIn, tokenOut, amountIn)
        
        return {
          success: true,
          transactionHash: tx.hash,
          message: 'Swap executed successfully on 1inch',
          exchange: '1inch',
          timestamp: Date.now()
        }
      } else {
        // Execute via Uniswap V3
        const swapParams: SwapParams = {
          tokenIn,
          tokenOut,
          amountIn,
          fee: 3000, // 0.3% fee tier
          recipient: this.dex.getWalletAddress()
        }

        const tx = await this.dex.executeSwap(swapParams)

        return {
          success: true,
          transactionHash: tx.hash,
          message: 'Swap executed successfully on Uniswap V3',
          exchange: 'uniswap',
          timestamp: Date.now()
        }
      }

    } catch (error) {
      throw new Error(`DEX execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get best quotes from all exchanges
   */
  private async getBestQuotes(order: UnifiedOrder): Promise<DEXQuote[]> {
    const quotes: DEXQuote[] = []

    try {
      // Get Hyperliquid market data
      const hlMarketData = await this.hyperliquid.getMarketDataForCoin(order.asset)
      if (hlMarketData) {
        quotes.push({
          tokenIn: order.side === 'buy' ? 'USDC' : order.asset,
          tokenOut: order.side === 'buy' ? order.asset : 'USDC',
          amountIn: (order.quantity * parseFloat(hlMarketData.price)).toString(),
          amountOut: order.quantity.toString(),
          priceImpact: 0.01, // Assume low impact for centralized exchange
          gasEstimate: '0',
          route: ['direct'],
          exchange: 'Hyperliquid'
        })
      }

      // Get DEX quotes
      const tokenIn = order.side === 'buy' ? 'USDC' : order.asset
      const tokenOut = order.side === 'buy' ? order.asset : 'USDC'
      const amountIn = (order.quantity * (order.price || 0)).toString()

      const dexQuotes = await this.dex.getQuotes(tokenIn, tokenOut, amountIn)
      quotes.push(...dexQuotes)

    } catch (error) {
      console.error('Error getting quotes:', error)
    }

    return quotes.sort((a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut))
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, exchange: string): Promise<boolean> {
    try {
      if (exchange === 'hyperliquid') {
        await this.hyperliquid.cancelOrder(parseInt(orderId))
        return true
      } else {
        // DEX orders are typically filled immediately or fail
        // So cancellation isn't typically needed
        console.warn('DEX orders cannot be cancelled after submission')
        return false
      }
    } catch (error) {
      console.error('Order cancellation failed:', error)
      return false
    }
  }

  /**
   * Get current portfolio across all exchanges
   */
  async getPortfolio(): Promise<Portfolio> {
    try {
      const portfolio: Portfolio = {
        totalValue: 0,
        availableBalance: 0,
        totalMarginUsed: 0,
        totalUnrealizedPnl: 0,
        totalRealizedPnl: 0,
        positions: [],
        dailyPnl: 0,
        dailyTrades: this.dailyTradeCount
      }

      // Get Hyperliquid positions
      const hlPositions = await this.hyperliquid.getPositions()
      const hlBalance = await this.hyperliquid.getBalance()

      portfolio.availableBalance += hlBalance.availableMargin
      portfolio.totalMarginUsed += hlBalance.totalMarginUsed

      for (const pos of hlPositions) {
        const position: Position = {
          asset: pos.coin,
          size: parseFloat(pos.szi),
          entryPrice: parseFloat(pos.entryPx || '0'),
          currentPrice: parseFloat(pos.markPx),
          unrealizedPnl: parseFloat(pos.unrealizedPnl),
          realizedPnl: 0, // TODO: Get from trade history
          marginUsed: parseFloat(pos.marginUsed),
          leverage: parseFloat(pos.leverage),
          exchange: 'hyperliquid'
        }

        portfolio.positions.push(position)
        portfolio.totalUnrealizedPnl += position.unrealizedPnl
      }

      // Get DEX positions (liquidity positions)
      const dexPositions = await this.dex.getLiquidityPositions()
      // TODO: Convert DEX liquidity positions to unified format

      portfolio.totalValue = portfolio.availableBalance + portfolio.totalUnrealizedPnl

      return portfolio

    } catch (error) {
      console.error('Error getting portfolio:', error)
      throw error
    }
  }

  /**
   * Get real-time market data
   */
  async getMarketData(assets: string[]): Promise<MarketData[]> {
    const marketData: MarketData[] = []

    try {
      // Get Hyperliquid market data
      const hlMarketData = await this.hyperliquid.getMarketData()
      
      for (const asset of assets) {
        const hlData = hlMarketData.find(data => data.coin === asset)
        
        if (hlData) {
          marketData.push({
            asset: hlData.coin,
            price: parseFloat(hlData.price),
            change24h: parseFloat(hlData.dayChange),
            volume24h: parseFloat(hlData.volume),
            high24h: 0, // TODO: Get from 24h data
            low24h: 0,
            bid: parseFloat(hlData.midPx) - 0.01, // Approximate
            ask: parseFloat(hlData.midPx) + 0.01,
            timestamp: Date.now(),
            exchange: 'hyperliquid'
          })
        }
      }

      // TODO: Add DEX market data from price oracles

    } catch (error) {
      console.error('Error getting market data:', error)
    }

    return marketData
  }

  /**
   * Perform risk management checks
   */
  private async performRiskChecks(order: UnifiedOrder): Promise<{allowed: boolean, reason: string}> {
    // Check daily trade limit
    if (this.dailyTradeCount >= this.config.riskManagement.maxDailyTrades) {
      return {
        allowed: false,
        reason: 'Daily trade limit exceeded'
      }
    }

    // Check position size limit
    const orderValue = order.quantity * (order.price || 0)
    if (orderValue > this.config.riskManagement.maxPositionSize) {
      return {
        allowed: false,
        reason: 'Position size exceeds maximum allowed'
      }
    }

    // Check if user is authenticated and has trading permissions
    if (!authService.isAuthenticated() || !authService.canTrade()) {
      return {
        allowed: false,
        reason: 'User not authorized for trading'
      }
    }

    return { allowed: true, reason: '' }
  }

  /**
   * Reset daily trade count if needed
   */
  private resetDailyCountIfNeeded(): void {
    const currentDate = new Date().toDateString()
    if (currentDate !== this.lastResetDate) {
      this.dailyTradeCount = 0
      this.lastResetDate = currentDate
    }
  }

  /**
   * Get order history
   */
  async getOrderHistory(limit: number = 100): Promise<any[]> {
    try {
      // Get Hyperliquid order history
      const hlHistory = await this.hyperliquid.getOrderHistory(limit)
      
      // TODO: Get DEX transaction history
      
      return hlHistory
    } catch (error) {
      console.error('Error getting order history:', error)
      return []
    }
  }

  /**
   * Health check for all connected exchanges
   */
  async healthCheck(): Promise<{hyperliquid: boolean, dex: boolean}> {
    const [hlHealth, dexHealth] = await Promise.all([
      this.hyperliquid.healthCheck(),
      this.dex.healthCheck()
    ])

    return {
      hyperliquid: hlHealth,
      dex: dexHealth
    }
  }

  /**
   * Get wallet addresses
   */
  getWalletAddresses(): {hyperliquid: string, dex: string} {
    return {
      hyperliquid: this.hyperliquid.getWalletAddress(),
      dex: this.dex.getWalletAddress()
    }
  }

  /**
   * Emergency stop - cancel all orders
   */
  async emergencyStop(): Promise<void> {
    try {
      // Cancel all Hyperliquid orders
      await this.hyperliquid.cancelAllOrders()
      
      // Clear local order tracking
      this.orders.clear()
      
      console.log('Emergency stop executed - all orders cancelled')
    } catch (error) {
      console.error('Emergency stop failed:', error)
      throw error
    }
  }
}

export default OrderManagementSystem