/**
 * Portfolio Tracking and P&L Calculation System
 * Comprehensive portfolio management across multiple exchanges
 */

import HyperliquidConnector, { HyperliquidPosition } from './hyperliquid-connector'
import DEXConnector, { LiquidityPosition } from './dex-connector'
import CoinbaseProConnector, { CoinbaseAccount } from './coinbase-connector'

export interface TradingAccount {
  id: string
  name: string
  exchange: 'hyperliquid' | 'dex' | 'coinbase' | 'binance'
  connector: HyperliquidConnector | DEXConnector | CoinbaseProConnector
  isActive: boolean
  config: any
}

export interface UnifiedPosition {
  id: string
  symbol: string
  exchange: string
  type: 'spot' | 'futures' | 'liquidity'
  side: 'long' | 'short' | 'neutral'
  size: number
  entryPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnl: number
  realizedPnl: number
  fees: number
  leverage?: number
  marginUsed?: number
  lastUpdated: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCost: number
  totalGain: number
  totalGainPercentage: number
  availableCash: number
  investedAmount: number
  marginUsed: number
  dailyPnl: number
  weeklyPnl: number
  monthlyPnl: number
  allTimeHigh: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  totalTrades: number
  positions: UnifiedPosition[]
  byExchange: {[exchange: string]: ExchangePortfolio}
  byAsset: {[asset: string]: AssetAllocation}
  lastUpdated: number
}

export interface ExchangePortfolio {
  exchange: string
  totalValue: number
  unrealizedPnl: number
  realizedPnl: number
  positions: UnifiedPosition[]
  isConnected: boolean
  lastSync: number
}

export interface AssetAllocation {
  symbol: string
  totalValue: number
  totalSize: number
  averagePrice: number
  percentage: number
  exchanges: string[]
  unrealizedPnl: number
}

export interface PnLAnalysis {
  period: 'day' | 'week' | 'month' | 'year' | 'all'
  startDate: Date
  endDate: Date
  startingValue: number
  endingValue: number
  totalReturn: number
  totalReturnPercentage: number
  maxDrawdown: number
  maxDrawdownPercentage: number
  volatility: number
  sharpeRatio: number
  winningTrades: number
  losingTrades: number
  winRate: number
  largestWin: number
  largestLoss: number
  averageWin: number
  averageLoss: number
  profitFactor: number
}

export interface Trade {
  id: string
  exchange: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit' | 'stop'
  size: number
  price: number
  value: number
  fees: number
  timestamp: number
  orderId?: string
  isOpening: boolean
  isClosing: boolean
  pnl?: number
}

export class PortfolioTracker {
  private accounts: Map<string, TradingAccount> = new Map()
  private positions: Map<string, UnifiedPosition> = new Map()
  private trades: Trade[] = []
  private priceCache: Map<string, {price: number, timestamp: number}> = new Map()
  private portfolioHistory: {timestamp: number, value: number, pnl: number}[] = []
  private updateInterval?: NodeJS.Timeout

  constructor() {
    this.startPeriodicUpdates()
  }

  /**
   * Add trading account to portfolio tracking
   */
  addAccount(account: TradingAccount): void {
    this.accounts.set(account.id, account)
  }

  /**
   * Remove trading account
   */
  removeAccount(accountId: string): void {
    this.accounts.delete(accountId)
  }

  /**
   * Get current portfolio summary
   */
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    await this.syncAllPositions()
    
    const positions = Array.from(this.positions.values())
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0)
    const totalCost = positions.reduce((sum, pos) => sum + (pos.size * pos.entryPrice), 0)
    const totalGain = totalValue - totalCost
    const totalGainPercentage = totalCost > 0 ? (totalGain / totalCost) * 100 : 0
    
    const unrealizedPnl = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0)
    const realizedPnl = positions.reduce((sum, pos) => sum + pos.realizedPnl, 0)
    const marginUsed = positions.reduce((sum, pos) => sum + (pos.marginUsed || 0), 0)

    // Calculate available cash across exchanges
    const availableCash = await this.calculateAvailableCash()

    // Group positions by exchange
    const byExchange: {[exchange: string]: ExchangePortfolio} = {}
    for (const position of positions) {
      if (!byExchange[position.exchange]) {
        byExchange[position.exchange] = {
          exchange: position.exchange,
          totalValue: 0,
          unrealizedPnl: 0,
          realizedPnl: 0,
          positions: [],
          isConnected: true,
          lastSync: Date.now()
        }
      }
      byExchange[position.exchange].totalValue += position.marketValue
      byExchange[position.exchange].unrealizedPnl += position.unrealizedPnl
      byExchange[position.exchange].realizedPnl += position.realizedPnl
      byExchange[position.exchange].positions.push(position)
    }

    // Group positions by asset
    const byAsset: {[asset: string]: AssetAllocation} = {}
    for (const position of positions) {
      if (!byAsset[position.symbol]) {
        byAsset[position.symbol] = {
          symbol: position.symbol,
          totalValue: 0,
          totalSize: 0,
          averagePrice: 0,
          percentage: 0,
          exchanges: [],
          unrealizedPnl: 0
        }
      }
      byAsset[position.symbol].totalValue += position.marketValue
      byAsset[position.symbol].totalSize += position.size
      byAsset[position.symbol].unrealizedPnl += position.unrealizedPnl
      if (!byAsset[position.symbol].exchanges.includes(position.exchange)) {
        byAsset[position.symbol].exchanges.push(position.exchange)
      }
    }

    // Calculate average prices and percentages
    for (const asset of Object.values(byAsset)) {
      asset.averagePrice = asset.totalSize > 0 ? asset.totalValue / asset.totalSize : 0
      asset.percentage = totalValue > 0 ? (asset.totalValue / totalValue) * 100 : 0
    }

    // Calculate performance metrics
    const pnlAnalysis = await this.calculatePnLAnalysis('day')
    
    return {
      totalValue,
      totalCost,
      totalGain,
      totalGainPercentage,
      availableCash,
      investedAmount: totalCost,
      marginUsed,
      dailyPnl: pnlAnalysis.totalReturn,
      weeklyPnl: (await this.calculatePnLAnalysis('week')).totalReturn,
      monthlyPnl: (await this.calculatePnLAnalysis('month')).totalReturn,
      allTimeHigh: this.calculateAllTimeHigh(),
      maxDrawdown: pnlAnalysis.maxDrawdown,
      sharpeRatio: pnlAnalysis.sharpeRatio,
      winRate: pnlAnalysis.winRate,
      totalTrades: this.trades.length,
      positions,
      byExchange,
      byAsset,
      lastUpdated: Date.now()
    }
  }

  /**
   * Sync positions from all connected exchanges
   */
  private async syncAllPositions(): Promise<void> {
    const syncPromises: Promise<void>[] = []

    for (const account of this.accounts.values()) {
      if (!account.isActive) continue

      syncPromises.push(this.syncExchangePositions(account))
    }

    await Promise.all(syncPromises)
  }

  /**
   * Sync positions from specific exchange
   */
  private async syncExchangePositions(account: TradingAccount): Promise<void> {
    try {
      switch (account.exchange) {
        case 'hyperliquid':
          await this.syncHyperliquidPositions(account.connector as HyperliquidConnector, account.id)
          break
        case 'dex':
          await this.syncDEXPositions(account.connector as DEXConnector, account.id)
          break
        case 'coinbase':
          await this.syncCoinbasePositions(account.connector as CoinbaseProConnector, account.id)
          break
      }
    } catch (error) {
      console.error(`Failed to sync positions for ${account.exchange}:`, error)
    }
  }

  /**
   * Sync Hyperliquid positions
   */
  private async syncHyperliquidPositions(connector: HyperliquidConnector, accountId: string): Promise<void> {
    const positions = await connector.getPositions()
    const marketData = await connector.getMarketData()

    for (const hlPosition of positions) {
      const marketInfo = marketData.find(m => m.coin === hlPosition.coin)
      const currentPrice = marketInfo ? parseFloat(marketInfo.price) : 0

      const position: UnifiedPosition = {
        id: `${accountId}-${hlPosition.coin}`,
        symbol: hlPosition.coin,
        exchange: 'hyperliquid',
        type: 'futures',
        side: parseFloat(hlPosition.szi) > 0 ? 'long' : 'short',
        size: Math.abs(parseFloat(hlPosition.szi)),
        entryPrice: parseFloat(hlPosition.entryPx || '0'),
        currentPrice,
        marketValue: Math.abs(parseFloat(hlPosition.szi)) * currentPrice,
        unrealizedPnl: parseFloat(hlPosition.unrealizedPnl),
        realizedPnl: 0, // TODO: Get from trade history
        fees: 0, // TODO: Calculate from trades
        leverage: parseFloat(hlPosition.leverage),
        marginUsed: parseFloat(hlPosition.marginUsed),
        lastUpdated: Date.now()
      }

      this.positions.set(position.id, position)
    }
  }

  /**
   * Sync DEX liquidity positions
   */
  private async syncDEXPositions(connector: DEXConnector, accountId: string): Promise<void> {
    const liquidityPositions = await connector.getLiquidityPositions()

    for (const liqPosition of liquidityPositions) {
      // For DEX positions, we need to calculate the current value of the liquidity position
      const position: UnifiedPosition = {
        id: `${accountId}-${liqPosition.tokenId}`,
        symbol: `${liqPosition.token0}/${liqPosition.token1}`,
        exchange: 'dex',
        type: 'liquidity',
        side: 'neutral',
        size: parseFloat(liqPosition.liquidity),
        entryPrice: 0, // TODO: Calculate from initial deposit
        currentPrice: 0, // TODO: Calculate current LP token price
        marketValue: 0, // TODO: Calculate current value
        unrealizedPnl: 0, // TODO: Calculate based on impermanent loss
        realizedPnl: parseFloat(liqPosition.uncollectedFees0) + parseFloat(liqPosition.uncollectedFees1),
        fees: parseFloat(liqPosition.uncollectedFees0) + parseFloat(liqPosition.uncollectedFees1),
        lastUpdated: Date.now()
      }

      this.positions.set(position.id, position)
    }
  }

  /**
   * Sync Coinbase positions
   */
  private async syncCoinbasePositions(connector: CoinbaseProConnector, accountId: string): Promise<void> {
    const accounts = await connector.getAccounts()

    for (const account of accounts) {
      const balance = parseFloat(account.available_balance.value)
      if (balance <= 0) continue

      // Get current price for the asset
      const currentPrice = await this.getCurrentPrice(account.currency, 'coinbase')

      const position: UnifiedPosition = {
        id: `${accountId}-${account.currency}`,
        symbol: account.currency,
        exchange: 'coinbase',
        type: 'spot',
        side: 'long',
        size: balance,
        entryPrice: 0, // TODO: Calculate weighted average from trades
        currentPrice,
        marketValue: balance * currentPrice,
        unrealizedPnl: 0, // TODO: Calculate based on entry price
        realizedPnl: 0, // TODO: Calculate from trade history
        fees: 0,
        lastUpdated: Date.now()
      }

      this.positions.set(position.id, position)
    }
  }

  /**
   * Calculate available cash across exchanges
   */
  private async calculateAvailableCash(): Promise<number> {
    let totalCash = 0

    for (const account of this.accounts.values()) {
      try {
        switch (account.exchange) {
          case 'hyperliquid':
            const hlBalance = await (account.connector as HyperliquidConnector).getBalance()
            totalCash += hlBalance.availableMargin
            break
          case 'coinbase':
            const cbAccounts = await (account.connector as CoinbaseProConnector).getAccounts()
            const usdAccount = cbAccounts.find(acc => acc.currency === 'USD')
            if (usdAccount) {
              totalCash += parseFloat(usdAccount.available_balance.value)
            }
            break
          // TODO: Add DEX ETH balance calculation
        }
      } catch (error) {
        console.error(`Error calculating cash for ${account.exchange}:`, error)
      }
    }

    return totalCash
  }

  /**
   * Get current price for an asset
   */
  private async getCurrentPrice(symbol: string, exchange: string): Promise<number> {
    const cacheKey = `${symbol}-${exchange}`
    const cached = this.priceCache.get(cacheKey)
    
    // Use cached price if less than 30 seconds old
    if (cached && Date.now() - cached.timestamp < 30000) {
      return cached.price
    }

    try {
      let price = 0
      
      // Try to get price from the specific exchange first
      const account = Array.from(this.accounts.values()).find(acc => acc.exchange === exchange)
      if (account) {
        if (exchange === 'hyperliquid') {
          const marketData = await (account.connector as HyperliquidConnector).getMarketDataForCoin(symbol)
          price = marketData ? parseFloat(marketData.price) : 0
        } else if (exchange === 'coinbase') {
          const product = await (account.connector as CoinbaseProConnector).getProduct(`${symbol}-USD`)
          price = product ? parseFloat(product.price) : 0
        }
      }

      // Cache the price
      if (price > 0) {
        this.priceCache.set(cacheKey, { price, timestamp: Date.now() })
      }

      return price
    } catch (error) {
      console.error(`Error getting price for ${symbol} on ${exchange}:`, error)
      return 0
    }
  }

  /**
   * Add trade to tracking
   */
  addTrade(trade: Trade): void {
    this.trades.push(trade)
    
    // Update portfolio history
    this.portfolioHistory.push({
      timestamp: trade.timestamp,
      value: 0, // Will be calculated during next sync
      pnl: trade.pnl || 0
    })
  }

  /**
   * Calculate P&L analysis for a specific period
   */
  async calculatePnLAnalysis(period: 'day' | 'week' | 'month' | 'year' | 'all'): Promise<PnLAnalysis> {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0)
    }

    const periodTrades = this.trades.filter(trade => 
      trade.timestamp >= startDate.getTime() && trade.timestamp <= now.getTime()
    )

    const winningTrades = periodTrades.filter(trade => (trade.pnl || 0) > 0)
    const losingTrades = periodTrades.filter(trade => (trade.pnl || 0) < 0)
    
    const totalReturn = periodTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
    const winRate = periodTrades.length > 0 ? (winningTrades.length / periodTrades.length) * 100 : 0

    // Calculate other metrics
    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl || 0)) : 0
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl || 0)) : 0
    const averageWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length : 0
    const profitFactor = averageLoss !== 0 ? Math.abs(averageWin / averageLoss) : 0

    return {
      period,
      startDate,
      endDate: now,
      startingValue: 0, // TODO: Get historical portfolio value
      endingValue: 0, // TODO: Get current portfolio value
      totalReturn,
      totalReturnPercentage: 0, // TODO: Calculate based on starting value
      maxDrawdown: 0, // TODO: Calculate from portfolio history
      maxDrawdownPercentage: 0,
      volatility: 0, // TODO: Calculate volatility
      sharpeRatio: 0, // TODO: Calculate Sharpe ratio
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      largestWin,
      largestLoss,
      averageWin,
      averageLoss,
      profitFactor
    }
  }

  /**
   * Calculate all-time high portfolio value
   */
  private calculateAllTimeHigh(): number {
    if (this.portfolioHistory.length === 0) return 0
    return Math.max(...this.portfolioHistory.map(h => h.value))
  }

  /**
   * Get positions for specific exchange
   */
  getPositionsByExchange(exchange: string): UnifiedPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.exchange === exchange)
  }

  /**
   * Get positions for specific asset
   */
  getPositionsByAsset(symbol: string): UnifiedPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.symbol === symbol)
  }

  /**
   * Start periodic portfolio updates
   */
  private startPeriodicUpdates(): void {
    // Update portfolio every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        await this.syncAllPositions()
        
        // Update portfolio history
        const summary = await this.getPortfolioSummary()
        this.portfolioHistory.push({
          timestamp: Date.now(),
          value: summary.totalValue,
          pnl: summary.totalGain
        })

        // Keep only last 24 hours of history (2880 points at 30-second intervals)
        if (this.portfolioHistory.length > 2880) {
          this.portfolioHistory = this.portfolioHistory.slice(-2880)
        }
      } catch (error) {
        console.error('Portfolio update failed:', error)
      }
    }, 30000)
  }

  /**
   * Stop periodic updates
   */
  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = undefined
    }
  }

  /**
   * Export portfolio data
   */
  async exportPortfolioData(): Promise<{
    summary: PortfolioSummary
    trades: Trade[]
    history: {timestamp: number, value: number, pnl: number}[]
  }> {
    const summary = await this.getPortfolioSummary()
    
    return {
      summary,
      trades: this.trades,
      history: this.portfolioHistory
    }
  }

  /**
   * Health check for all connectors
   */
  async healthCheck(): Promise<{[accountId: string]: boolean}> {
    const health: {[accountId: string]: boolean} = {}

    for (const [accountId, account] of this.accounts.entries()) {
      try {
        let isHealthy = false
        
        if ('healthCheck' in account.connector && typeof account.connector.healthCheck === 'function') {
          isHealthy = await account.connector.healthCheck()
        } else {
          isHealthy = true // Assume healthy if no health check method
        }
        
        health[accountId] = isHealthy
      } catch (error) {
        health[accountId] = false
      }
    }

    return health
  }
}

export default PortfolioTracker