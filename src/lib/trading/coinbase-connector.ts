/**
 * Coinbase Pro (Advanced Trade) API Connector
 * Professional trading integration with Coinbase Pro
 */

import crypto from 'crypto'
import { authService } from '../auth/auth-service'

export interface CoinbaseConfig {
  apiKey: string
  privateKey: string
  passphrase?: string
  sandbox?: boolean
}

export interface CoinbaseOrder {
  client_order_id?: string
  product_id: string
  side: 'buy' | 'sell'
  order_configuration: {
    market_market_ioc?: {
      quote_size?: string
      base_size?: string
    }
    limit_limit_gtc?: {
      base_size: string
      limit_price: string
      post_only?: boolean
    }
    limit_limit_gtd?: {
      base_size: string
      limit_price: string
      end_time: string
      post_only?: boolean
    }
    stop_limit_stop_limit_gtc?: {
      base_size: string
      limit_price: string
      stop_price: string
    }
  }
}

export interface CoinbaseOrderResult {
  success: boolean
  order_id?: string
  product_id?: string
  side?: string
  client_order_id?: string
  status?: string
  created_time?: string
  error_response?: {
    error: string
    message: string
    error_details: string
  }
}

export interface CoinbaseAccount {
  uuid: string
  name: string
  currency: string
  available_balance: {
    value: string
    currency: string
  }
  default: boolean
  active: boolean
  created_at: string
  updated_at: string
  deleted_at?: string
  type: string
  ready: boolean
  hold: {
    value: string
    currency: string
  }
}

export interface CoinbaseProduct {
  product_id: string
  price: string
  price_percentage_change_24h: string
  volume_24h: string
  volume_percentage_change_24h: string
  base_increment: string
  quote_increment: string
  quote_min_size: string
  quote_max_size: string
  base_min_size: string
  base_max_size: string
  base_name: string
  quote_name: string
  watched: boolean
  is_disabled: boolean
  new: boolean
  status: string
  cancel_only: boolean
  limit_only: boolean
  post_only: boolean
  trading_disabled: boolean
  auction_mode: boolean
  product_type: string
  quote_currency_id: string
  base_currency_id: string
  mid_market_price: string
}

export interface CoinbaseFill {
  entry_id: string
  trade_id: string
  order_id: string
  trade_time: string
  trade_type: string
  price: string
  size: string
  commission: string
  product_id: string
  sequence_timestamp: string
  liquidity_indicator: string
  size_in_quote: boolean
  user_id: string
  side: string
}

export class CoinbaseProConnector {
  private config: CoinbaseConfig
  private baseUrl: string
  private wsUrl: string

  constructor(config: CoinbaseConfig) {
    this.config = config
    this.baseUrl = config.sandbox
      ? 'https://api-public.sandbox.pro.coinbase.com'
      : 'https://api.coinbase.com/api/v3/brokerage'
    this.wsUrl = config.sandbox
      ? 'wss://ws-feed-public.sandbox.pro.coinbase.com'
      : 'wss://advanced-trade-ws.coinbase.com'
  }

  /**
   * Generate JWT token for API authentication
   */
  private generateJWT(): string {
    const header = {
      alg: 'ES256',
      kid: this.config.apiKey,
      nonce: crypto.randomBytes(16).toString('hex')
    }

    const payload = {
      sub: this.config.apiKey,
      iss: 'coinbase-cloud',
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120, // 2 minutes
      aud: ['retail_rest_api_proxy']
    }

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const message = `${encodedHeader}.${encodedPayload}`

    // Sign with EC private key
    const sign = crypto.createSign('SHA256')
    sign.update(message)
    const signature = sign.sign(this.config.privateKey, 'base64url')

    return `${message}.${signature}`
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<any> {
    const jwt = this.generateJWT()
    const url = `${this.baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Coinbase API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`)
    }

    return response.json()
  }

  /**
   * Get all accounts
   */
  async getAccounts(): Promise<CoinbaseAccount[]> {
    const response = await this.makeRequest('/accounts')
    return response.accounts || []
  }

  /**
   * Get specific account by currency
   */
  async getAccount(currency: string): Promise<CoinbaseAccount | null> {
    const accounts = await this.getAccounts()
    return accounts.find(account => account.currency === currency) || null
  }

  /**
   * Get all products (trading pairs)
   */
  async getProducts(): Promise<CoinbaseProduct[]> {
    const response = await this.makeRequest('/products')
    return response.products || []
  }

  /**
   * Get specific product
   */
  async getProduct(productId: string): Promise<CoinbaseProduct | null> {
    try {
      const response = await this.makeRequest(`/products/${productId}`)
      return response
    } catch (error) {
      console.error(`Error getting product ${productId}:`, error)
      return null
    }
  }

  /**
   * Get market data for all products
   */
  async getMarketData(): Promise<CoinbaseProduct[]> {
    return this.getProducts()
  }

  /**
   * Place a new order
   */
  async placeOrder(order: CoinbaseOrder): Promise<CoinbaseOrderResult> {
    try {
      const response = await this.makeRequest('/orders', 'POST', order)
      
      return {
        success: true,
        order_id: response.order_id,
        product_id: response.product_id,
        side: response.side,
        client_order_id: response.client_order_id,
        status: response.status,
        created_time: response.created_time
      }
    } catch (error) {
      console.error('Coinbase order placement failed:', error)
      return {
        success: false,
        error_response: {
          error: 'ORDER_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          error_details: error instanceof Error ? error.stack || '' : ''
        }
      }
    }
  }

  /**
   * Place market order
   */
  async placeMarketOrder(
    productId: string,
    side: 'buy' | 'sell',
    size: string,
    sizeType: 'base' | 'quote' = 'base'
  ): Promise<CoinbaseOrderResult> {
    const order: CoinbaseOrder = {
      product_id: productId,
      side,
      order_configuration: {
        market_market_ioc: sizeType === 'base' 
          ? { base_size: size }
          : { quote_size: size }
      }
    }

    return this.placeOrder(order)
  }

  /**
   * Place limit order
   */
  async placeLimitOrder(
    productId: string,
    side: 'buy' | 'sell',
    size: string,
    price: string,
    postOnly: boolean = false
  ): Promise<CoinbaseOrderResult> {
    const order: CoinbaseOrder = {
      product_id: productId,
      side,
      order_configuration: {
        limit_limit_gtc: {
          base_size: size,
          limit_price: price,
          post_only: postOnly
        }
      }
    }

    return this.placeOrder(order)
  }

  /**
   * Place stop limit order
   */
  async placeStopLimitOrder(
    productId: string,
    side: 'buy' | 'sell',
    size: string,
    limitPrice: string,
    stopPrice: string
  ): Promise<CoinbaseOrderResult> {
    const order: CoinbaseOrder = {
      product_id: productId,
      side,
      order_configuration: {
        stop_limit_stop_limit_gtc: {
          base_size: size,
          limit_price: limitPrice,
          stop_price: stopPrice
        }
      }
    }

    return this.placeOrder(order)
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/orders/batch_cancel`, 'POST', {
        order_ids: [orderId]
      })
      return true
    } catch (error) {
      console.error('Order cancellation failed:', error)
      return false
    }
  }

  /**
   * Get open orders
   */
  async getOpenOrders(productId?: string): Promise<any[]> {
    const params = productId ? `?product_id=${productId}` : ''
    const response = await this.makeRequest(`/orders/historical/batch${params}`)
    return response.orders?.filter((order: any) => order.status === 'OPEN') || []
  }

  /**
   * Get order history
   */
  async getOrderHistory(limit: number = 100, productId?: string): Promise<any[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (productId) params.append('product_id', productId)

    const response = await this.makeRequest(`/orders/historical/batch?${params}`)
    return response.orders || []
  }

  /**
   * Get fills (executed trades)
   */
  async getFills(productId?: string, limit: number = 100): Promise<CoinbaseFill[]> {
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    if (productId) params.append('product_id', productId)

    const response = await this.makeRequest(`/orders/historical/fills?${params}`)
    return response.fills || []
  }

  /**
   * Get portfolio balances
   */
  async getPortfolio(): Promise<{[currency: string]: number}> {
    const accounts = await this.getAccounts()
    const portfolio: {[currency: string]: number} = {}

    for (const account of accounts) {
      const balance = parseFloat(account.available_balance.value)
      if (balance > 0) {
        portfolio[account.currency] = balance
      }
    }

    return portfolio
  }

  /**
   * Get trading fees
   */
  async getTradingFees(): Promise<any> {
    try {
      const response = await this.makeRequest('/transaction_summary')
      return response
    } catch (error) {
      console.error('Error getting trading fees:', error)
      return null
    }
  }

  /**
   * Get 24hr stats for a product
   */
  async getProduct24HrStats(productId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/products/${productId}/stats`)
      return response
    } catch (error) {
      console.error(`Error getting 24hr stats for ${productId}:`, error)
      return null
    }
  }

  /**
   * Connect to WebSocket for real-time data
   */
  connectWebSocket(channels: string[] = ['ticker'], productIds: string[] = []): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const jwt = this.generateJWT()
      const ws = new WebSocket(this.wsUrl)

      ws.onopen = () => {
        // Subscribe to channels
        const subscribeMessage = {
          type: 'subscribe',
          product_ids: productIds,
          channel: channels[0], // Coinbase Pro typically subscribes to one channel at a time
          jwt: jwt
        }

        ws.send(JSON.stringify(subscribeMessage))
        resolve(ws)
      }

      ws.onerror = (error) => {
        console.error('Coinbase WebSocket error:', error)
        reject(error)
      }

      ws.onclose = () => {
        console.log('Coinbase WebSocket connection closed')
      }
    })
  }

  /**
   * Get current user trading permissions
   */
  async getTradingPermissions(): Promise<any> {
    try {
      const response = await this.makeRequest('/accounts')
      return response
    } catch (error) {
      console.error('Error getting trading permissions:', error)
      return null
    }
  }

  /**
   * Calculate order size with proper precision
   */
  calculateOrderSize(
    product: CoinbaseProduct,
    usdAmount: number,
    currentPrice: number
  ): string {
    const baseSize = usdAmount / currentPrice
    const increment = parseFloat(product.base_increment)
    const adjustedSize = Math.floor(baseSize / increment) * increment
    
    return adjustedSize.toFixed(8).replace(/\.?0+$/, '')
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAccounts()
      return true
    } catch (error) {
      console.error('Coinbase health check failed:', error)
      return false
    }
  }

  /**
   * Get exchange info
   */
  getExchangeInfo(): {name: string, features: string[]} {
    return {
      name: 'Coinbase Pro',
      features: [
        'Spot Trading',
        'Limit Orders',
        'Market Orders',
        'Stop Orders',
        'Real-time Data',
        'Portfolio Management',
        'Fiat On/Off Ramp'
      ]
    }
  }
}

export default CoinbaseProConnector