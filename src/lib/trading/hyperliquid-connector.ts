/**
 * Hyperliquid Exchange Connector
 * Full API integration for perpetual trading on Hyperliquid
 */

import { ethers } from 'ethers'
import crypto from 'crypto'

export interface HyperliquidConfig {
  apiKey?: string
  privateKey: string
  testnet?: boolean
  baseUrl?: string
}

export interface HyperliquidOrder {
  coin: string
  is_buy: boolean
  sz: number
  limit_px: number
  order_type: 'Limit' | 'Market' | 'Stop' | 'Scale'
  reduce_only?: boolean
  tif?: 'Alo' | 'Ioc' | 'Gtc'
}

export interface HyperliquidPosition {
  coin: string
  szi: string  // Position size
  entryPx?: string
  markPx: string
  pnl: string
  unrealizedPnl: string
  returnOnEquity: string
  leverage: string
  marginUsed: string
  maxLeverage: number
}

export interface HyperliquidOrderResult {
  status: 'ok' | 'error'
  response?: {
    type: 'order'
    data: {
      statuses: Array<{
        resting?: { oid: number }
        filled?: { totalSz: string, avgPx: string }
        error?: string
      }>
    }
  }
  error?: string
}

export interface HyperliquidAccountState {
  assetPositions: Array<{
    position: HyperliquidPosition
    type: 'oneWay'
  }>
  marginSummary: {
    accountValue: string
    totalMarginUsed: string
    totalNtlPos: string
    totalRawUsd: string
  }
  crossMarginSummary: {
    accountValue: string
    totalMarginUsed: string
    totalNtlPos: string
    totalRawUsd: string
  }
}

export interface HyperliquidMarketData {
  coin: string
  price: string
  dayChange: string
  volume: string
  openInterest: string
  funding: string
  premium: string
  markPx: string
  midPx: string
  prevDayPx: string
}

export class HyperliquidConnector {
  private config: HyperliquidConfig
  private wallet: ethers.Wallet
  private baseUrl: string
  private websocket?: WebSocket

  constructor(config: HyperliquidConfig) {
    this.config = config
    this.baseUrl = config.testnet 
      ? 'https://api.hyperliquid-testnet.xyz'
      : 'https://api.hyperliquid.xyz'
    
    // Initialize wallet for signing
    this.wallet = new ethers.Wallet(config.privateKey)
  }

  /**
   * Generate authentication signature for Hyperliquid API
   */
  private async generateSignature(timestamp: number, payload: any): Promise<string> {
    const message = JSON.stringify({
      timestamp,
      ...payload
    })
    
    const signature = await this.wallet.signMessage(message)
    return signature
  }

  /**
   * Make authenticated API request to Hyperliquid
   */
  private async makeRequest(endpoint: string, payload: any = {}): Promise<any> {
    const timestamp = Date.now()
    const signature = await this.generateSignature(timestamp, payload)
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Timestamp': timestamp.toString(),
        'X-Signature': signature,
        'X-Address': this.wallet.address
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get account information and positions
   */
  async getAccountState(): Promise<HyperliquidAccountState> {
    return this.makeRequest('/info', {
      type: 'clearinghouseState',
      user: this.wallet.address
    })
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<HyperliquidPosition[]> {
    const accountState = await this.getAccountState()
    return accountState.assetPositions
      .map(pos => pos.position)
      .filter(pos => parseFloat(pos.szi) !== 0)
  }

  /**
   * Get market data for all instruments
   */
  async getMarketData(): Promise<HyperliquidMarketData[]> {
    return this.makeRequest('/info', {
      type: 'allMids'
    })
  }

  /**
   * Get market data for specific coin
   */
  async getMarketDataForCoin(coin: string): Promise<HyperliquidMarketData | null> {
    const allData = await this.getMarketData()
    return allData.find(data => data.coin === coin) || null
  }

  /**
   * Place a new order
   */
  async placeOrder(order: HyperliquidOrder): Promise<HyperliquidOrderResult> {
    const timestamp = Date.now()
    const orderData = {
      coin: order.coin,
      is_buy: order.is_buy,
      sz: order.sz,
      limit_px: order.limit_px,
      order_type: { limit: { tif: order.tif || 'Gtc' } },
      reduce_only: order.reduce_only || false
    }

    // Create order hash for signing
    const orderHash = this.createOrderHash(orderData, timestamp)
    const signature = await this.wallet.signMessage(orderHash)

    return this.makeRequest('/exchange', {
      type: 'order',
      orders: [orderData],
      signature,
      timestamp
    })
  }

  /**
   * Place multiple orders atomically
   */
  async placeOrders(orders: HyperliquidOrder[]): Promise<HyperliquidOrderResult> {
    const timestamp = Date.now()
    const orderDataArray = orders.map(order => ({
      coin: order.coin,
      is_buy: order.is_buy,
      sz: order.sz,
      limit_px: order.limit_px,
      order_type: { limit: { tif: order.tif || 'Gtc' } },
      reduce_only: order.reduce_only || false
    }))

    const orderHash = this.createOrderHash(orderDataArray, timestamp)
    const signature = await this.wallet.signMessage(orderHash)

    return this.makeRequest('/exchange', {
      type: 'order',
      orders: orderDataArray,
      signature,
      timestamp
    })
  }

  /**
   * Cancel an order by order ID
   */
  async cancelOrder(orderId: number): Promise<any> {
    const timestamp = Date.now()
    const cancelData = { oid: orderId }
    
    const cancelHash = this.createCancelHash(cancelData, timestamp)
    const signature = await this.wallet.signMessage(cancelHash)

    return this.makeRequest('/exchange', {
      type: 'cancel',
      cancels: [cancelData],
      signature,
      timestamp
    })
  }

  /**
   * Cancel all orders for a specific coin
   */
  async cancelAllOrders(coin?: string): Promise<any> {
    const timestamp = Date.now()
    const cancelData = coin ? { coin } : {}
    
    const cancelHash = this.createCancelHash(cancelData, timestamp)
    const signature = await this.wallet.signMessage(cancelHash)

    return this.makeRequest('/exchange', {
      type: 'cancelByCloid',
      cancels: [cancelData],
      signature,
      timestamp
    })
  }

  /**
   * Get open orders
   */
  async getOpenOrders(): Promise<any[]> {
    return this.makeRequest('/info', {
      type: 'openOrders',
      user: this.wallet.address
    })
  }

  /**
   * Get order history
   */
  async getOrderHistory(limit: number = 100): Promise<any[]> {
    return this.makeRequest('/info', {
      type: 'userFills',
      user: this.wallet.address,
      limit
    })
  }

  /**
   * Get account balance and margin info
   */
  async getBalance(): Promise<any> {
    const accountState = await this.getAccountState()
    return {
      accountValue: parseFloat(accountState.marginSummary.accountValue),
      totalMarginUsed: parseFloat(accountState.marginSummary.totalMarginUsed),
      availableMargin: parseFloat(accountState.marginSummary.accountValue) - 
                      parseFloat(accountState.marginSummary.totalMarginUsed),
      totalPosition: parseFloat(accountState.marginSummary.totalNtlPos)
    }
  }

  /**
   * Set leverage for a specific coin
   */
  async setLeverage(coin: string, leverage: number): Promise<any> {
    const timestamp = Date.now()
    const leverageData = { coin, leverage }
    
    const signature = await this.wallet.signMessage(JSON.stringify({
      timestamp,
      ...leverageData
    }))

    return this.makeRequest('/exchange', {
      type: 'updateLeverage',
      ...leverageData,
      signature,
      timestamp
    })
  }

  /**
   * Get funding rates
   */
  async getFundingRates(): Promise<any[]> {
    return this.makeRequest('/info', {
      type: 'fundingHistory'
    })
  }

  /**
   * Connect to real-time WebSocket feed
   */
  connectWebSocket(subscriptions: string[] = ['allMids']): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.testnet
        ? 'wss://api.hyperliquid-testnet.xyz/ws'
        : 'wss://api.hyperliquid.xyz/ws'

      this.websocket = new WebSocket(wsUrl)

      this.websocket.onopen = () => {
        // Subscribe to data feeds
        subscriptions.forEach(subscription => {
          this.websocket?.send(JSON.stringify({
            method: 'subscribe',
            subscription: {
              type: subscription,
              user: subscription.includes('user') ? this.wallet.address : undefined
            }
          }))
        })
        resolve(this.websocket!)
      }

      this.websocket.onerror = (error) => {
        reject(error)
      }

      this.websocket.onclose = () => {
        console.log('Hyperliquid WebSocket connection closed')
      }
    })
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket(): void {
    if (this.websocket) {
      this.websocket.close()
      this.websocket = undefined
    }
  }

  /**
   * Helper function to create order hash for signing
   */
  private createOrderHash(orderData: any, timestamp: number): string {
    const hashData = {
      source: 'a',
      connectionId: crypto.randomBytes(16).toString('hex'),
      timestamp,
      orders: Array.isArray(orderData) ? orderData : [orderData]
    }
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(hashData)))
  }

  /**
   * Helper function to create cancel hash for signing
   */
  private createCancelHash(cancelData: any, timestamp: number): string {
    const hashData = {
      source: 'a',
      connectionId: crypto.randomBytes(16).toString('hex'),
      timestamp,
      cancels: Array.isArray(cancelData) ? cancelData : [cancelData]
    }
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(hashData)))
  }

  /**
   * Calculate position size in USD
   */
  calculatePositionSize(coin: string, sizeInCoin: number, price: number): number {
    return sizeInCoin * price
  }

  /**
   * Calculate required margin for position
   */
  calculateRequiredMargin(positionSize: number, leverage: number): number {
    return positionSize / leverage
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getMarketData()
      return true
    } catch (error) {
      console.error('Hyperliquid health check failed:', error)
      return false
    }
  }
}

export default HyperliquidConnector