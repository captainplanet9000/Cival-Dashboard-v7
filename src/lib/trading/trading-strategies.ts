/**
 * Trading Strategies and Signal Generation
 * Comprehensive algorithmic trading strategies implementation
 */

import MarketDataService, { PriceData, OHLCVData } from './market-data-service'

export interface StrategyConfig {
  name: string
  description: string
  enabled: boolean
  parameters: {[key: string]: any}
  riskLevel: 'low' | 'medium' | 'high'
  timeframe: string
  symbols: string[]
  maxPositions: number
  stopLoss: number
  takeProfit: number
}

export interface TradingSignal {
  id: string
  strategy: string
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  strength: number // 0-100
  price: number
  timestamp: number
  confidence: number // 0-1
  reasoning: string
  metadata: {[key: string]: any}
}

export interface StrategyPerformance {
  strategyName: string
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturn: number
  maxDrawdown: number
  sharpeRatio: number
  avgHoldTime: number
  profitFactor: number
}

export interface TechnicalIndicators {
  sma: (data: number[], period: number) => number[]
  ema: (data: number[], period: number) => number[]
  rsi: (data: number[], period: number) => number[]
  macd: (data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {macd: number[], signal: number[], histogram: number[]}
  bollingerBands: (data: number[], period: number, stdDev: number) => {upper: number[], middle: number[], lower: number[]}
  stochastic: (high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number) => {k: number[], d: number[]}
  atr: (high: number[], low: number[], close: number[], period: number) => number[]
  volumeProfile: (ohlcv: OHLCVData[]) => {price: number, volume: number}[]
}

export class TradingStrategies {
  private marketData: MarketDataService
  private strategies: Map<string, StrategyConfig> = new Map()
  private activeSignals: Map<string, TradingSignal[]> = new Map()
  private performance: Map<string, StrategyPerformance> = new Map()
  private indicators: TechnicalIndicators

  constructor(marketData: MarketDataService) {
    this.marketData = marketData
    this.indicators = this.initializeTechnicalIndicators()
    this.initializeDefaultStrategies()
  }

  /**
   * Initialize technical indicators
   */
  private initializeTechnicalIndicators(): TechnicalIndicators {
    return {
      sma: (data: number[], period: number): number[] => {
        const result: number[] = []
        for (let i = period - 1; i < data.length; i++) {
          const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
          result.push(sum / period)
        }
        return result
      },

      ema: (data: number[], period: number): number[] => {
        const result: number[] = []
        const multiplier = 2 / (period + 1)
        result[0] = data[0]

        for (let i = 1; i < data.length; i++) {
          result[i] = (data[i] * multiplier) + (result[i - 1] * (1 - multiplier))
        }
        return result
      },

      rsi: (data: number[], period: number): number[] => {
        const gains: number[] = []
        const losses: number[] = []
        const rsi: number[] = []

        for (let i = 1; i < data.length; i++) {
          const change = data[i] - data[i - 1]
          gains.push(change > 0 ? change : 0)
          losses.push(change < 0 ? Math.abs(change) : 0)
        }

        for (let i = period - 1; i < gains.length; i++) {
          const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
          const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
          const rs = avgGain / avgLoss
          rsi.push(100 - (100 / (1 + rs)))
        }

        return rsi
      },

      macd: (data: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
        const fastEMA = this.indicators.ema(data, fastPeriod)
        const slowEMA = this.indicators.ema(data, slowPeriod)
        const macd: number[] = []
        
        for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
          macd.push(fastEMA[i] - slowEMA[i])
        }

        const signal = this.indicators.ema(macd, signalPeriod)
        const histogram: number[] = []
        
        for (let i = 0; i < Math.min(macd.length, signal.length); i++) {
          histogram.push(macd[i] - signal[i])
        }

        return { macd, signal, histogram }
      },

      bollingerBands: (data: number[], period: number, stdDev: number) => {
        const sma = this.indicators.sma(data, period)
        const upper: number[] = []
        const middle: number[] = []
        const lower: number[] = []

        for (let i = period - 1; i < data.length; i++) {
          const slice = data.slice(i - period + 1, i + 1)
          const mean = slice.reduce((a, b) => a + b, 0) / period
          const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
          const standardDeviation = Math.sqrt(variance)

          middle.push(mean)
          upper.push(mean + (standardDeviation * stdDev))
          lower.push(mean - (standardDeviation * stdDev))
        }

        return { upper, middle, lower }
      },

      stochastic: (high: number[], low: number[], close: number[], kPeriod: number, dPeriod: number) => {
        const k: number[] = []
        
        for (let i = kPeriod - 1; i < close.length; i++) {
          const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1))
          const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1))
          k.push(((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100)
        }

        const d = this.indicators.sma(k, dPeriod)
        return { k, d }
      },

      atr: (high: number[], low: number[], close: number[], period: number): number[] => {
        const trueRanges: number[] = []
        
        for (let i = 1; i < high.length; i++) {
          const tr1 = high[i] - low[i]
          const tr2 = Math.abs(high[i] - close[i - 1])
          const tr3 = Math.abs(low[i] - close[i - 1])
          trueRanges.push(Math.max(tr1, tr2, tr3))
        }

        return this.indicators.sma(trueRanges, period)
      },

      volumeProfile: (ohlcv: OHLCVData[]): {price: number, volume: number}[] => {
        const priceVolume: {[price: string]: number} = {}
        
        for (const candle of ohlcv) {
          const avgPrice = (candle.high + candle.low) / 2
          const priceKey = avgPrice.toFixed(2)
          priceVolume[priceKey] = (priceVolume[priceKey] || 0) + candle.volume
        }

        return Object.entries(priceVolume)
          .map(([price, volume]) => ({ price: parseFloat(price), volume }))
          .sort((a, b) => b.volume - a.volume)
      }
    }
  }

  /**
   * Initialize default trading strategies
   */
  private initializeDefaultStrategies(): void {
    // Momentum Strategy
    this.strategies.set('momentum', {
      name: 'Momentum Strategy',
      description: 'Trend-following strategy using moving averages and RSI',
      enabled: true,
      parameters: {
        fastMA: 12,
        slowMA: 26,
        rsiPeriod: 14,
        rsiOverbought: 70,
        rsiOversold: 30,
        volumeThreshold: 1.5
      },
      riskLevel: 'medium',
      timeframe: '1h',
      symbols: ['BTC', 'ETH', 'ADA', 'DOT', 'LINK'],
      maxPositions: 3,
      stopLoss: 0.05,
      takeProfit: 0.15
    })

    // Mean Reversion Strategy
    this.strategies.set('mean_reversion', {
      name: 'Mean Reversion Strategy',
      description: 'Bollinger Bands based mean reversion strategy',
      enabled: true,
      parameters: {
        bbPeriod: 20,
        bbStdDev: 2,
        rsiPeriod: 14,
        rsiOverbought: 80,
        rsiOversold: 20
      },
      riskLevel: 'low',
      timeframe: '1h',
      symbols: ['BTC', 'ETH', 'ADA'],
      maxPositions: 2,
      stopLoss: 0.03,
      takeProfit: 0.08
    })

    // Breakout Strategy
    this.strategies.set('breakout', {
      name: 'Breakout Strategy',
      description: 'Price breakout strategy with volume confirmation',
      enabled: true,
      parameters: {
        lookbackPeriod: 20,
        volumeMultiplier: 2,
        atrPeriod: 14,
        atrMultiplier: 1.5
      },
      riskLevel: 'high',
      timeframe: '1h',
      symbols: ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'AVAX'],
      maxPositions: 5,
      stopLoss: 0.08,
      takeProfit: 0.20
    })

    // Arbitrage Strategy
    this.strategies.set('arbitrage', {
      name: 'Cross-Exchange Arbitrage',
      description: 'Exploit price differences across exchanges',
      enabled: true,
      parameters: {
        minSpreadPercent: 0.5,
        maxSlippage: 0.2,
        minVolume: 10000
      },
      riskLevel: 'low',
      timeframe: '1m',
      symbols: ['BTC', 'ETH', 'USDC'],
      maxPositions: 10,
      stopLoss: 0.01,
      takeProfit: 0.02
    })

    // Pairs Trading Strategy
    this.strategies.set('pairs_trading', {
      name: 'Statistical Arbitrage',
      description: 'Pairs trading based on correlation and cointegration',
      enabled: true,
      parameters: {
        correlationPeriod: 30,
        zScoreThreshold: 2,
        stopLossZScore: 3,
        minCorrelation: 0.7
      },
      riskLevel: 'medium',
      timeframe: '1h',
      symbols: ['BTC', 'ETH'],
      maxPositions: 3,
      stopLoss: 0.04,
      takeProfit: 0.06
    })
  }

  /**
   * Generate signals for all active strategies
   */
  async generateSignals(): Promise<Map<string, TradingSignal[]>> {
    const allSignals = new Map<string, TradingSignal[]>()

    for (const [strategyName, config] of this.strategies.entries()) {
      if (!config.enabled) continue

      try {
        let signals: TradingSignal[] = []

        switch (strategyName) {
          case 'momentum':
            signals = await this.generateMomentumSignals(config)
            break
          case 'mean_reversion':
            signals = await this.generateMeanReversionSignals(config)
            break
          case 'breakout':
            signals = await this.generateBreakoutSignals(config)
            break
          case 'arbitrage':
            signals = await this.generateArbitrageSignals(config)
            break
          case 'pairs_trading':
            signals = await this.generatePairsTradingSignals(config)
            break
        }

        if (signals.length > 0) {
          allSignals.set(strategyName, signals)
          this.activeSignals.set(strategyName, signals)
        }
      } catch (error) {
        console.error(`Error generating signals for ${strategyName}:`, error)
      }
    }

    return allSignals
  }

  /**
   * Momentum strategy signal generation
   */
  private async generateMomentumSignals(config: StrategyConfig): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []

    for (const symbol of config.symbols) {
      try {
        const currentPrice = await this.marketData.getPrice(symbol)
        const historicalData = await this.marketData.getHistoricalData(symbol, config.timeframe as '1m' | '1h' | '1d' | '5m' as '1m' | '1h' | '1d' | '5m', 100)
        
        if (!currentPrice || historicalData.length < 50) continue

        const closes = historicalData.map(d => d.close)
        const volumes = historicalData.map(d => d.volume)
        
        // Calculate indicators
        const fastMA = this.indicators.ema(closes, config.parameters.fastMA)
        const slowMA = this.indicators.ema(closes, config.parameters.slowMA)
        const rsi = this.indicators.rsi(closes, config.parameters.rsiPeriod)
        
        const currentFastMA = fastMA[fastMA.length - 1]
        const currentSlowMA = slowMA[slowMA.length - 1]
        const currentRSI = rsi[rsi.length - 1]
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
        const currentVolume = volumes[volumes.length - 1]

        // Generate signals
        let action: 'buy' | 'sell' | 'hold' = 'hold'
        let strength = 0
        let confidence = 0
        let reasoning = ''

        // Buy signal
        if (currentFastMA > currentSlowMA && 
            currentRSI < config.parameters.rsiOverbought &&
            currentRSI > config.parameters.rsiOversold &&
            currentVolume > avgVolume * config.parameters.volumeThreshold) {
          
          action = 'buy'
          strength = Math.min(100, ((currentFastMA - currentSlowMA) / currentSlowMA * 100) * 10)
          confidence = Math.min(1, (currentVolume / avgVolume) / config.parameters.volumeThreshold)
          reasoning = `Fast MA (${currentFastMA.toFixed(2)}) > Slow MA (${currentSlowMA.toFixed(2)}), RSI: ${currentRSI.toFixed(2)}, High volume`
        }

        // Sell signal
        if (currentFastMA < currentSlowMA && 
            currentRSI > config.parameters.rsiOversold &&
            currentVolume > avgVolume * config.parameters.volumeThreshold) {
          
          action = 'sell'
          strength = Math.min(100, ((currentSlowMA - currentFastMA) / currentSlowMA * 100) * 10)
          confidence = Math.min(1, (currentVolume / avgVolume) / config.parameters.volumeThreshold)
          reasoning = `Fast MA (${currentFastMA.toFixed(2)}) < Slow MA (${currentSlowMA.toFixed(2)}), RSI: ${currentRSI.toFixed(2)}, High volume`
        }

        if (action !== 'hold' && strength > 20) {
          signals.push({
            id: `momentum-${symbol}-${Date.now()}`,
            strategy: 'momentum',
            symbol,
            action,
            strength,
            price: currentPrice.price,
            timestamp: Date.now(),
            confidence,
            reasoning,
            metadata: {
              fastMA: currentFastMA,
              slowMA: currentSlowMA,
              rsi: currentRSI,
              volumeRatio: currentVolume / avgVolume
            }
          })
        }
      } catch (error) {
        console.error(`Error in momentum strategy for ${symbol}:`, error)
      }
    }

    return signals
  }

  /**
   * Mean reversion strategy signal generation
   */
  private async generateMeanReversionSignals(config: StrategyConfig): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []

    for (const symbol of config.symbols) {
      try {
        const currentPrice = await this.marketData.getPrice(symbol)
        const historicalData = await this.marketData.getHistoricalData(symbol, config.timeframe as '1m' | '1h' | '1d' | '5m' as '1m' | '1h' | '1d' | '5m', 100)
        
        if (!currentPrice || historicalData.length < 50) continue

        const closes = historicalData.map(d => d.close)
        
        // Calculate indicators
        const bb = this.indicators.bollingerBands(closes, config.parameters.bbPeriod, config.parameters.bbStdDev)
        const rsi = this.indicators.rsi(closes, config.parameters.rsiPeriod)
        
        const currentBBUpper = bb.upper[bb.upper.length - 1]
        const currentBBLower = bb.lower[bb.lower.length - 1]
        const currentBBMiddle = bb.middle[bb.middle.length - 1]
        const currentRSI = rsi[rsi.length - 1]
        const price = currentPrice.price

        let action: 'buy' | 'sell' | 'hold' = 'hold'
        let strength = 0
        let confidence = 0
        let reasoning = ''

        // Buy signal - price near lower band and oversold
        if (price <= currentBBLower && currentRSI <= config.parameters.rsiOversold) {
          action = 'buy'
          strength = Math.min(100, (config.parameters.rsiOversold - currentRSI) * 2)
          confidence = Math.min(1, (currentBBLower - price) / (currentBBMiddle - currentBBLower))
          reasoning = `Price (${price.toFixed(2)}) at lower BB (${currentBBLower.toFixed(2)}), RSI oversold: ${currentRSI.toFixed(2)}`
        }

        // Sell signal - price near upper band and overbought
        if (price >= currentBBUpper && currentRSI >= config.parameters.rsiOverbought) {
          action = 'sell'
          strength = Math.min(100, (currentRSI - config.parameters.rsiOverbought) * 2)
          confidence = Math.min(1, (price - currentBBUpper) / (currentBBUpper - currentBBMiddle))
          reasoning = `Price (${price.toFixed(2)}) at upper BB (${currentBBUpper.toFixed(2)}), RSI overbought: ${currentRSI.toFixed(2)}`
        }

        if (action !== 'hold' && strength > 15) {
          signals.push({
            id: `mean_reversion-${symbol}-${Date.now()}`,
            strategy: 'mean_reversion',
            symbol,
            action,
            strength,
            price,
            timestamp: Date.now(),
            confidence,
            reasoning,
            metadata: {
              bbUpper: currentBBUpper,
              bbMiddle: currentBBMiddle,
              bbLower: currentBBLower,
              rsi: currentRSI
            }
          })
        }
      } catch (error) {
        console.error(`Error in mean reversion strategy for ${symbol}:`, error)
      }
    }

    return signals
  }

  /**
   * Breakout strategy signal generation
   */
  private async generateBreakoutSignals(config: StrategyConfig): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []

    for (const symbol of config.symbols) {
      try {
        const currentPrice = await this.marketData.getPrice(symbol)
        const historicalData = await this.marketData.getHistoricalData(symbol, config.timeframe as '1m' | '1h' | '1d' | '5m' as '1m' | '1h' | '1d' | '5m', 100)
        
        if (!currentPrice || historicalData.length < 50) continue

        const highs = historicalData.map(d => d.high)
        const lows = historicalData.map(d => d.low)
        const closes = historicalData.map(d => d.close)
        const volumes = historicalData.map(d => d.volume)
        
        // Calculate indicators
        const atr = this.indicators.atr(highs, lows, closes, config.parameters.atrPeriod)
        const recentHighs = highs.slice(-config.parameters.lookbackPeriod)
        const recentLows = lows.slice(-config.parameters.lookbackPeriod)
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
        
        const resistanceLevel = Math.max(...recentHighs)
        const supportLevel = Math.min(...recentLows)
        const currentATR = atr[atr.length - 1]
        const price = currentPrice.price
        const currentVolume = currentPrice.volume24h

        let action: 'buy' | 'sell' | 'hold' = 'hold'
        let strength = 0
        let confidence = 0
        let reasoning = ''

        // Upward breakout
        if (price > resistanceLevel && 
            currentVolume > avgVolume * config.parameters.volumeMultiplier) {
          
          action = 'buy'
          strength = Math.min(100, ((price - resistanceLevel) / currentATR) * 25)
          confidence = Math.min(1, currentVolume / (avgVolume * config.parameters.volumeMultiplier))
          reasoning = `Upward breakout above resistance (${resistanceLevel.toFixed(2)}), high volume`
        }

        // Downward breakout
        if (price < supportLevel && 
            currentVolume > avgVolume * config.parameters.volumeMultiplier) {
          
          action = 'sell'
          strength = Math.min(100, ((supportLevel - price) / currentATR) * 25)
          confidence = Math.min(1, currentVolume / (avgVolume * config.parameters.volumeMultiplier))
          reasoning = `Downward breakout below support (${supportLevel.toFixed(2)}), high volume`
        }

        if (action !== 'hold' && strength > 30) {
          signals.push({
            id: `breakout-${symbol}-${Date.now()}`,
            strategy: 'breakout',
            symbol,
            action,
            strength,
            price,
            timestamp: Date.now(),
            confidence,
            reasoning,
            metadata: {
              resistanceLevel,
              supportLevel,
              atr: currentATR,
              volumeRatio: currentVolume / avgVolume
            }
          })
        }
      } catch (error) {
        console.error(`Error in breakout strategy for ${symbol}:`, error)
      }
    }

    return signals
  }

  /**
   * Arbitrage strategy signal generation
   */
  private async generateArbitrageSignals(config: StrategyConfig): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []

    for (const symbol of config.symbols) {
      try {
        // This would require multiple exchange price feeds
        // For now, we'll simulate with a basic implementation
        const currentPrice = await this.marketData.getPrice(symbol)
        if (!currentPrice) continue

        // Mock different exchange prices (in real implementation, fetch from multiple sources)
        const exchangePrices = {
          binance: currentPrice.price,
          coinbase: currentPrice.price * (1 + (Math.random() - 0.5) * 0.01), // ±0.5% variation
          kraken: currentPrice.price * (1 + (Math.random() - 0.5) * 0.01)
        }

        const prices = Object.values(exchangePrices)
        const maxPrice = Math.max(...prices)
        const minPrice = Math.min(...prices)
        const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100

        if (spreadPercent >= config.parameters.minSpreadPercent) {
          const buyExchange = Object.keys(exchangePrices).find(ex => exchangePrices[ex as keyof typeof exchangePrices] === minPrice)
          const sellExchange = Object.keys(exchangePrices).find(ex => exchangePrices[ex as keyof typeof exchangePrices] === maxPrice)

          signals.push({
            id: `arbitrage-${symbol}-${Date.now()}`,
            strategy: 'arbitrage',
            symbol,
            action: 'buy', // This strategy involves both buying and selling
            strength: Math.min(100, spreadPercent * 20),
            price: minPrice,
            timestamp: Date.now(),
            confidence: Math.min(1, spreadPercent / config.parameters.minSpreadPercent),
            reasoning: `Arbitrage opportunity: ${spreadPercent.toFixed(3)}% spread between ${buyExchange} and ${sellExchange}`,
            metadata: {
              buyExchange,
              sellExchange,
              buyPrice: minPrice,
              sellPrice: maxPrice,
              spreadPercent,
              exchangePrices
            }
          })
        }
      } catch (error) {
        console.error(`Error in arbitrage strategy for ${symbol}:`, error)
      }
    }

    return signals
  }

  /**
   * Pairs trading strategy signal generation
   */
  private async generatePairsTradingSignals(config: StrategyConfig): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = []

    try {
      // Example: BTC-ETH pairs trading
      const btcData = await this.marketData.getHistoricalData('BTC', config.timeframe as '1m' | '1h' | '1d' | '5m', 100)
      const ethData = await this.marketData.getHistoricalData('ETH', config.timeframe as '1m' | '1h' | '1d' | '5m', 100)
      
      if (btcData.length < 50 || ethData.length < 50) return signals

      const btcPrices = btcData.map(d => d.close)
      const ethPrices = ethData.map(d => d.close)
      
      // Calculate correlation
      const correlation = this.calculateCorrelation(btcPrices.slice(-config.parameters.correlationPeriod), 
                                                    ethPrices.slice(-config.parameters.correlationPeriod))
      
      if (correlation < config.parameters.minCorrelation) return signals

      // Calculate price ratio and z-score
      const ratios = btcPrices.map((btc, i) => btc / ethPrices[i])
      const recentRatios = ratios.slice(-config.parameters.correlationPeriod)
      const meanRatio = recentRatios.reduce((a, b) => a + b, 0) / recentRatios.length
      const stdRatio = Math.sqrt(recentRatios.reduce((a, b) => a + Math.pow(b - meanRatio, 2), 0) / recentRatios.length)
      const currentRatio = ratios[ratios.length - 1]
      const zScore = (currentRatio - meanRatio) / stdRatio

      if (Math.abs(zScore) >= config.parameters.zScoreThreshold) {
        const currentBTC = await this.marketData.getPrice('BTC')
        const currentETH = await this.marketData.getPrice('ETH')
        
        if (currentBTC && currentETH) {
          if (zScore > 0) {
            // BTC is overvalued relative to ETH - sell BTC, buy ETH
            signals.push({
              id: `pairs-BTC-${Date.now()}`,
              strategy: 'pairs_trading',
              symbol: 'BTC',
              action: 'sell',
              strength: Math.min(100, Math.abs(zScore) * 25),
              price: currentBTC.price,
              timestamp: Date.now(),
              confidence: Math.min(1, Math.abs(zScore) / config.parameters.zScoreThreshold),
              reasoning: `BTC overvalued vs ETH, Z-score: ${zScore.toFixed(2)}, Correlation: ${correlation.toFixed(3)}`,
              metadata: { zScore, correlation, ratio: currentRatio, meanRatio, pair: 'BTC-ETH' }
            })

            signals.push({
              id: `pairs-ETH-${Date.now()}`,
              strategy: 'pairs_trading',
              symbol: 'ETH',
              action: 'buy',
              strength: Math.min(100, Math.abs(zScore) * 25),
              price: currentETH.price,
              timestamp: Date.now(),
              confidence: Math.min(1, Math.abs(zScore) / config.parameters.zScoreThreshold),
              reasoning: `ETH undervalued vs BTC, Z-score: ${zScore.toFixed(2)}, Correlation: ${correlation.toFixed(3)}`,
              metadata: { zScore, correlation, ratio: currentRatio, meanRatio, pair: 'BTC-ETH' }
            })
          } else {
            // ETH is overvalued relative to BTC - sell ETH, buy BTC
            signals.push({
              id: `pairs-ETH-${Date.now()}`,
              strategy: 'pairs_trading',
              symbol: 'ETH',
              action: 'sell',
              strength: Math.min(100, Math.abs(zScore) * 25),
              price: currentETH.price,
              timestamp: Date.now(),
              confidence: Math.min(1, Math.abs(zScore) / config.parameters.zScoreThreshold),
              reasoning: `ETH overvalued vs BTC, Z-score: ${zScore.toFixed(2)}, Correlation: ${correlation.toFixed(3)}`,
              metadata: { zScore, correlation, ratio: currentRatio, meanRatio, pair: 'BTC-ETH' }
            })

            signals.push({
              id: `pairs-BTC-${Date.now()}`,
              strategy: 'pairs_trading',
              symbol: 'BTC',
              action: 'buy',
              strength: Math.min(100, Math.abs(zScore) * 25),
              price: currentBTC.price,
              timestamp: Date.now(),
              confidence: Math.min(1, Math.abs(zScore) / config.parameters.zScoreThreshold),
              reasoning: `BTC undervalued vs ETH, Z-score: ${zScore.toFixed(2)}, Correlation: ${correlation.toFixed(3)}`,
              metadata: { zScore, correlation, ratio: currentRatio, meanRatio, pair: 'BTC-ETH' }
            })
          }
        }
      }
    } catch (error) {
      console.error('Error in pairs trading strategy:', error)
    }

    return signals
  }

  /**
   * Calculate correlation between two arrays
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length)
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0)
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0)
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0)
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0)
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0)

    const numerator = (n * sumXY) - (sumX * sumY)
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)))

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Get active signals for a strategy
   */
  getActiveSignals(strategyName?: string): TradingSignal[] {
    if (strategyName) {
      return this.activeSignals.get(strategyName) || []
    }
    
    const allSignals: TradingSignal[] = []
    for (const signals of this.activeSignals.values()) {
      allSignals.push(...signals)
    }
    return allSignals
  }

  /**
   * Update strategy configuration
   */
  updateStrategy(name: string, config: Partial<StrategyConfig>): void {
    const existing = this.strategies.get(name)
    if (existing) {
      this.strategies.set(name, { ...existing, ...config })
    }
  }

  /**
   * Enable/disable strategy
   */
  toggleStrategy(name: string, enabled: boolean): void {
    const strategy = this.strategies.get(name)
    if (strategy) {
      strategy.enabled = enabled
      this.strategies.set(name, strategy)
    }
  }

  /**
   * Get strategy configuration
   */
  getStrategy(name: string): StrategyConfig | undefined {
    return this.strategies.get(name)
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): StrategyConfig[] {
    return Array.from(this.strategies.values())
  }

  /**
   * Calculate strategy performance
   */
  calculatePerformance(strategyName: string, trades: any[]): StrategyPerformance {
    const strategyTrades = trades.filter(trade => trade.strategy === strategyName)
    
    const totalTrades = strategyTrades.length
    const winningTrades = strategyTrades.filter(trade => trade.pnl > 0).length
    const losingTrades = totalTrades - winningTrades
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0
    
    const totalReturn = strategyTrades.reduce((sum, trade) => sum + trade.pnl, 0)
    const returns = strategyTrades.map(trade => trade.returnPercent || 0)
    const maxDrawdown = this.calculateMaxDrawdown(returns)
    const sharpeRatio = this.calculateSharpeRatio(returns)
    
    const avgHoldTime = strategyTrades.reduce((sum, trade) => sum + (trade.exitTime - trade.entryTime), 0) / totalTrades / (1000 * 60 * 60) // hours
    
    const grossProfit = strategyTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
    const grossLoss = Math.abs(strategyTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0

    const performance: StrategyPerformance = {
      strategyName,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalReturn,
      maxDrawdown,
      sharpeRatio,
      avgHoldTime,
      profitFactor
    }

    this.performance.set(strategyName, performance)
    return performance
  }

  /**
   * Calculate maximum drawdown
   */
  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0
    let peak = 1
    let cumulative = 1

    for (const ret of returns) {
      cumulative *= (1 + ret / 100)
      if (cumulative > peak) {
        peak = cumulative
      }
      const drawdown = (peak - cumulative) / peak
      maxDrawdown = Math.max(maxDrawdown, drawdown)
    }

    return maxDrawdown * 100
  }

  /**
   * Calculate Sharpe ratio
   */
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 2): number {
    if (returns.length < 2) return 0

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / (returns.length - 1)
    const volatility = Math.sqrt(variance)

    return volatility > 0 ? (avgReturn - riskFreeRate / 12) / volatility : 0
  }

  /**
   * Get strategy performance
   */
  getPerformance(strategyName?: string): StrategyPerformance | StrategyPerformance[] {
    if (strategyName) {
      return this.performance.get(strategyName) || {
        strategyName,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        avgHoldTime: 0,
        profitFactor: 0
      }
    }

    return Array.from(this.performance.values())
  }

  /**
   * Clear old signals
   */
  clearOldSignals(maxAge: number = 3600000): void { // 1 hour default
    const now = Date.now()
    
    for (const [strategy, signals] of this.activeSignals.entries()) {
      const filteredSignals = signals.filter(signal => now - signal.timestamp < maxAge)
      this.activeSignals.set(strategy, filteredSignals)
    }
  }
}

export default TradingStrategies