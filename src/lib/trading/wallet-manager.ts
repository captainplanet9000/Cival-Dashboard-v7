/**
 * Wallet Management System
 * Integration with existing master wallet system and trading connectors
 */

import { ethers } from 'ethers'
import HyperliquidConnector from './hyperliquid-connector'
import DEXConnector from './dex-connector'
import CoinbaseProConnector from './coinbase-connector'

// Import types from existing master wallet system
export interface MasterWalletConfig {
  wallet_id: string
  name: string
  description?: string
  primary_chain: string
  supported_chains: string[]
  auto_distribution: boolean
  performance_based_allocation: boolean
  risk_based_limits: boolean
  max_allocation_per_agent: number
  emergency_stop_threshold: number
  daily_loss_limit: number
  created_at: string
  updated_at: string
}

export interface WalletConfig {
  // Master wallet integration
  masterWalletId?: string
  
  // Ethereum/EVM wallets
  ethereumPrivateKey: string
  ethereumRpcUrl: string
  chainId: number
  
  // Exchange API credentials
  coinbaseApiKey?: string
  coinbasePrivateKey?: string
  binanceApiKey?: string
  binanceSecretKey?: string
  
  // Hyperliquid (uses Ethereum wallet)
  hyperliquidTestnet?: boolean
  
  // Security settings
  enableHardwareWallet?: boolean
  requireConfirmation?: boolean
  autoLockTimeout?: number // minutes
  
  // Integration with existing system
  backendApiUrl?: string
}

// Wallet balance compatible with master wallet system
export interface WalletBalance {
  symbol: string
  balance: string
  decimals: number
  usdValue: number
  exchange: string
  address?: string
  isNative: boolean
  isStaked?: boolean
  stakingRewards?: number
  // Master wallet compatibility
  asset_symbol?: string
  balance_usd?: number
  locked_balance?: string
  available_balance?: string
  last_updated?: string
}

// Transaction compatible with master wallet system  
export interface WalletTransaction {
  id: string
  hash?: string
  type: 'send' | 'receive' | 'swap' | 'stake' | 'unstake' | 'trade' | 'allocation' | 'collection'
  symbol: string
  amount: string
  from: string
  to: string
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  blockNumber?: number
  gasUsed?: string
  gasPrice?: string
  fee: string
  exchange: string
  metadata?: any
  // Master wallet compatibility
  transaction_id?: string
  transaction_type?: string
  asset_symbol?: string
  amount_usd?: number
  from_address?: string
  to_address?: string
  from_entity?: string
  to_entity?: string
  chain_id?: number
  tx_hash?: string
  block_number?: number
  gas_used?: string
  gas_price?: string
  error_message?: string
  created_at?: string
  confirmed_at?: string
}

export interface ConnectedWallet {
  id: string
  name: string
  address: string
  type: 'hot' | 'hardware' | 'exchange'
  provider: 'metamask' | 'walletconnect' | 'ledger' | 'trezor' | 'coinbase' | 'hyperliquid' | 'dex'
  chainId?: number
  isConnected: boolean
  balances: WalletBalance[]
  lastSync: number
  // Master wallet integration
  masterWalletId?: string
  allocation?: {
    target_type: 'agent' | 'farm' | 'goal'
    target_id: string
    allocated_amount_usd: number
    current_value_usd: number
    total_pnl: number
  }
}

export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
  coingeckoId?: string
  isStablecoin: boolean
  isWrapped: boolean
}

// Common token addresses for Ethereum mainnet
export const COMMON_TOKENS: {[symbol: string]: TokenInfo} = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isStablecoin: false,
    isWrapped: false
  },
  WETH: {
    address: '0xC02aaA39b223FE8C0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    isStablecoin: false,
    isWrapped: true
  },
  USDC: {
    address: '0xA0b86a33E6441E30160a447B8D04132d0d21C09e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isStablecoin: true,
    isWrapped: false
  },
  USDT: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    isStablecoin: true,
    isWrapped: false
  },
  DAI: {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    isStablecoin: true,
    isWrapped: false
  },
  WBTC: {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 8,
    isStablecoin: false,
    isWrapped: true
  }
}

export class WalletManager {
  private config: WalletConfig
  private wallets: Map<string, ConnectedWallet> = new Map()
  private providers: Map<number, ethers.JsonRpcProvider> = new Map()
  private signers: Map<string, ethers.Signer> = new Map()
  private transactions: WalletTransaction[] = []
  private syncInterval?: NodeJS.Timeout
  private priceCache: Map<string, {price: number, timestamp: number}> = new Map()
  private masterWalletConfig?: MasterWalletConfig

  constructor(config: WalletConfig) {
    this.config = config
    this.initializeProviders()
    this.initializeWallets()
    this.startPeriodicSync()
    
    // Initialize master wallet if configured
    if (config.masterWalletId) {
      this.initializeMasterWallet()
    }
  }

  /**
   * Initialize blockchain providers
   */
  private initializeProviders(): void {
    // Ethereum mainnet
    this.providers.set(1, new ethers.JsonRpcProvider(this.config.ethereumRpcUrl))
    
    // Add other networks as needed
    if (this.config.chainId !== 1) {
      this.providers.set(this.config.chainId, new ethers.JsonRpcProvider(this.config.ethereumRpcUrl))
    }
  }

  /**
   * Initialize master wallet integration
   */
  private async initializeMasterWallet(): Promise<void> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) return

      // Fetch master wallet configuration from backend
      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}`)
      if (response.ok) {
        const data = await response.json()
        this.masterWalletConfig = data.wallet?.config
        
        // Sync existing wallets with master wallet allocations
        await this.syncWithMasterWallet()
      }
    } catch (error) {
      console.error('Failed to initialize master wallet:', error)
    }
  }

  /**
   * Sync wallets with master wallet allocations
   */
  private async syncWithMasterWallet(): Promise<void> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) return

      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/allocations`)
      if (response.ok) {
        const data = await response.json()
        
        // Update wallet allocations
        for (const allocation of data.allocations || []) {
          const wallet = this.wallets.get(allocation.target_id)
          if (wallet) {
            wallet.allocation = {
              target_type: allocation.target_type,
              target_id: allocation.target_id,
              allocated_amount_usd: allocation.allocated_amount_usd,
              current_value_usd: allocation.current_value_usd,
              total_pnl: allocation.total_pnl
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync with master wallet:', error)
    }
  }

  /**
   * Initialize connected wallets
   */
  private async initializeWallets(): Promise<void> {
    try {
      // Initialize Ethereum wallet
      await this.addEthereumWallet()
      
      // Initialize exchange wallets
      if (this.config.coinbaseApiKey && this.config.coinbasePrivateKey) {
        await this.addCoinbaseWallet()
      }
      
      // Initialize Hyperliquid wallet (uses Ethereum key)
      await this.addHyperliquidWallet()
      
    } catch (error) {
      console.error('Failed to initialize wallets:', error)
    }
  }

  /**
   * Add Ethereum wallet
   */
  private async addEthereumWallet(): Promise<void> {
    const provider = this.providers.get(this.config.chainId)!
    const wallet = new ethers.Wallet(this.config.ethereumPrivateKey, provider)
    
    this.signers.set('ethereum', wallet)
    
    const ethWallet: ConnectedWallet = {
      id: 'ethereum',
      name: 'Ethereum Wallet',
      address: wallet.address,
      type: 'hot',
      provider: 'dex',
      chainId: this.config.chainId,
      isConnected: true,
      balances: [],
      lastSync: 0
    }
    
    this.wallets.set('ethereum', ethWallet)
    await this.syncWalletBalances('ethereum')
  }

  /**
   * Add Coinbase wallet
   */
  private async addCoinbaseWallet(): Promise<void> {
    if (!this.config.coinbaseApiKey || !this.config.coinbasePrivateKey) return

    const connector = new CoinbaseProConnector({
      apiKey: this.config.coinbaseApiKey,
      privateKey: this.config.coinbasePrivateKey
    })

    const coinbaseWallet: ConnectedWallet = {
      id: 'coinbase',
      name: 'Coinbase Pro',
      address: 'coinbase-pro-account',
      type: 'exchange',
      provider: 'coinbase',
      isConnected: true,
      balances: [],
      lastSync: 0
    }
    
    this.wallets.set('coinbase', coinbaseWallet)
    await this.syncCoinbaseBalances(connector)
  }

  /**
   * Add Hyperliquid wallet
   */
  private async addHyperliquidWallet(): Promise<void> {
    const connector = new HyperliquidConnector({
      privateKey: this.config.ethereumPrivateKey,
      testnet: this.config.hyperliquidTestnet || false
    })

    const hlWallet: ConnectedWallet = {
      id: 'hyperliquid',
      name: 'Hyperliquid',
      address: connector.getWalletAddress(),
      type: 'exchange',
      provider: 'hyperliquid',
      isConnected: true,
      balances: [],
      lastSync: 0
    }
    
    this.wallets.set('hyperliquid', hlWallet)
    await this.syncHyperliquidBalances(connector)
  }

  /**
   * Sync wallet balances
   */
  async syncWalletBalances(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId)
    if (!wallet) return

    try {
      switch (walletId) {
        case 'ethereum':
          await this.syncEthereumBalances(wallet)
          break
        case 'coinbase':
          const cbConnector = new CoinbaseProConnector({
            apiKey: this.config.coinbaseApiKey!,
            privateKey: this.config.coinbasePrivateKey!
          })
          await this.syncCoinbaseBalances(cbConnector)
          break
        case 'hyperliquid':
          const hlConnector = new HyperliquidConnector({
            privateKey: this.config.ethereumPrivateKey,
            testnet: this.config.hyperliquidTestnet || false
          })
          await this.syncHyperliquidBalances(hlConnector)
          break
      }
      
      wallet.lastSync = Date.now()
    } catch (error) {
      console.error(`Failed to sync ${walletId} balances:`, error)
    }
  }

  /**
   * Sync Ethereum balances
   */
  private async syncEthereumBalances(wallet: ConnectedWallet): Promise<void> {
    const provider = this.providers.get(this.config.chainId)!
    const balances: WalletBalance[] = []

    // Get ETH balance
    const ethBalance = await provider.getBalance(wallet.address)
    const ethPrice = await this.getTokenPrice('ETH')
    
    balances.push({
      symbol: 'ETH',
      balance: ethers.formatEther(ethBalance),
      decimals: 18,
      usdValue: parseFloat(ethers.formatEther(ethBalance)) * ethPrice,
      exchange: 'ethereum',
      address: wallet.address,
      isNative: true
    })

    // Get ERC20 token balances
    for (const token of Object.values(COMMON_TOKENS)) {
      if (token.symbol === 'ETH') continue
      
      try {
        const balance = await this.getERC20Balance(wallet.address, token.address, token.decimals)
        if (parseFloat(balance) > 0) {
          const price = await this.getTokenPrice(token.symbol)
          
          balances.push({
            symbol: token.symbol,
            balance,
            decimals: token.decimals,
            usdValue: parseFloat(balance) * price,
            exchange: 'ethereum',
            address: token.address,
            isNative: false
          })
        }
      } catch (error) {
        console.error(`Failed to get ${token.symbol} balance:`, error)
      }
    }

    wallet.balances = balances
  }

  /**
   * Sync Coinbase balances
   */
  private async syncCoinbaseBalances(connector: CoinbaseProConnector): Promise<void> {
    const wallet = this.wallets.get('coinbase')!
    const accounts = await connector.getAccounts()
    const balances: WalletBalance[] = []

    for (const account of accounts) {
      const balance = parseFloat(account.available_balance.value)
      if (balance > 0) {
        const price = await this.getTokenPrice(account.currency)
        
        balances.push({
          symbol: account.currency,
          balance: balance.toString(),
          decimals: account.currency === 'BTC' ? 8 : account.currency.includes('USD') ? 2 : 18,
          usdValue: balance * price,
          exchange: 'coinbase',
          isNative: false
        })
      }
    }

    wallet.balances = balances
  }

  /**
   * Sync Hyperliquid balances
   */
  private async syncHyperliquidBalances(connector: HyperliquidConnector): Promise<void> {
    const wallet = this.wallets.get('hyperliquid')!
    const balance = await connector.getBalance()
    const positions = await connector.getPositions()
    const balances: WalletBalance[] = []

    // Add USDC balance (Hyperliquid uses USDC as collateral)
    balances.push({
      symbol: 'USDC',
      balance: balance.availableMargin.toString(),
      decimals: 6,
      usdValue: balance.availableMargin,
      exchange: 'hyperliquid',
      isNative: false
    })

    // Add position values as balances
    for (const position of positions) {
      const marketData = await connector.getMarketDataForCoin(position.coin)
      const currentPrice = marketData ? parseFloat(marketData.price) : 0
      const positionValue = Math.abs(parseFloat(position.szi)) * currentPrice

      if (positionValue > 0) {
        balances.push({
          symbol: position.coin,
          balance: Math.abs(parseFloat(position.szi)).toString(),
          decimals: 8,
          usdValue: positionValue,
          exchange: 'hyperliquid',
          isNative: false
        })
      }
    }

    wallet.balances = balances
  }

  /**
   * Get ERC20 token balance
   */
  private async getERC20Balance(walletAddress: string, tokenAddress: string, decimals: number): Promise<string> {
    const provider = this.providers.get(this.config.chainId)!
    const contract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)'],
      provider
    )

    const balance = await contract.balanceOf(walletAddress)
    return ethers.formatUnits(balance, decimals)
  }

  /**
   * Get token price in USD
   */
  private async getTokenPrice(symbol: string): Promise<number> {
    const cached = this.priceCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.price
    }

    try {
      // This is a simplified price fetch - in production you'd use a proper price API
      let price = 0
      
      switch (symbol) {
        case 'ETH':
          price = 2000 // Placeholder
          break
        case 'BTC':
        case 'WBTC':
          price = 40000 // Placeholder
          break
        case 'USDC':
        case 'USDT':
        case 'DAI':
          price = 1
          break
        default:
          price = 1 // Default price
      }

      this.priceCache.set(symbol, { price, timestamp: Date.now() })
      return price
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error)
      return 0
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(
    fromWalletId: string,
    to: string,
    amount: string,
    tokenSymbol: string = 'ETH'
  ): Promise<WalletTransaction> {
    const wallet = this.wallets.get(fromWalletId)
    if (!wallet) {
      throw new Error(`Wallet ${fromWalletId} not found`)
    }

    const signer = this.signers.get(fromWalletId)
    if (!signer) {
      throw new Error(`Signer for ${fromWalletId} not found`)
    }

    const transaction: WalletTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'send',
      symbol: tokenSymbol,
      amount,
      from: wallet.address,
      to,
      timestamp: Date.now(),
      status: 'pending',
      fee: '0',
      exchange: fromWalletId
    }

    try {
      let txHash: string

      if (tokenSymbol === 'ETH') {
        // Send ETH
        const tx = await signer.sendTransaction({
          to,
          value: ethers.parseEther(amount)
        })
        txHash = tx.hash
      } else {
        // Send ERC20 token
        const token = COMMON_TOKENS[tokenSymbol]
        if (!token) {
          throw new Error(`Token ${tokenSymbol} not supported`)
        }

        const contract = new ethers.Contract(
          token.address,
          ['function transfer(address to, uint256 amount) external returns (bool)'],
          signer
        )

        const tx = await contract.transfer(to, ethers.parseUnits(amount, token.decimals))
        txHash = tx.hash
      }

      transaction.hash = txHash
      this.transactions.push(transaction)

      // Monitor transaction status
      this.monitorTransaction(transaction)

      return transaction
    } catch (error) {
      transaction.status = 'failed'
      this.transactions.push(transaction)
      throw error
    }
  }

  /**
   * Monitor transaction status
   */
  private async monitorTransaction(transaction: WalletTransaction): Promise<void> {
    if (!transaction.hash) return

    const provider = this.providers.get(this.config.chainId)!
    
    try {
      const receipt = await provider.waitForTransaction(transaction.hash)
      
      if (receipt) {
        transaction.status = receipt.status === 1 ? 'confirmed' : 'failed'
        transaction.blockNumber = receipt.blockNumber
        transaction.gasUsed = receipt.gasUsed.toString()
        transaction.fee = ethers.formatEther(receipt.gasUsed * (receipt.gasPrice || BigInt(0)))
      } else {
        transaction.status = 'failed'
      }
      
    } catch (error) {
      console.error('Transaction monitoring failed:', error)
      transaction.status = 'failed'
    }
  }

  /**
   * Get all wallet balances
   */
  getAllBalances(): WalletBalance[] {
    const allBalances: WalletBalance[] = []
    
    for (const wallet of this.wallets.values()) {
      allBalances.push(...wallet.balances)
    }
    
    return allBalances
  }

  /**
   * Get total portfolio value
   */
  getTotalPortfolioValue(): number {
    return this.getAllBalances().reduce((total, balance) => total + balance.usdValue, 0)
  }

  /**
   * Get balances by symbol
   */
  getBalancesBySymbol(symbol: string): WalletBalance[] {
    return this.getAllBalances().filter(balance => balance.symbol === symbol)
  }

  /**
   * Get wallet info
   */
  getWallet(walletId: string): ConnectedWallet | undefined {
    return this.wallets.get(walletId)
  }

  /**
   * Get all wallets
   */
  getAllWallets(): ConnectedWallet[] {
    return Array.from(this.wallets.values())
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(walletId?: string): WalletTransaction[] {
    if (walletId) {
      return this.transactions.filter(tx => tx.exchange === walletId)
    }
    return this.transactions
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): WalletTransaction[] {
    return this.transactions.filter(tx => tx.status === 'pending')
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(
    fromWalletId: string,
    to: string,
    amount: string,
    tokenSymbol: string = 'ETH'
  ): Promise<{gasLimit: string, gasPrice: string, totalCost: string}> {
    const signer = this.signers.get(fromWalletId)
    if (!signer) {
      throw new Error(`Signer for ${fromWalletId} not found`)
    }

    const provider = this.providers.get(this.config.chainId)!
    
    try {
      let gasLimit: bigint
      const gasPrice = await provider.getGasPrice()

      if (tokenSymbol === 'ETH') {
        gasLimit = await signer.estimateGas({
          to,
          value: ethers.parseEther(amount)
        })
      } else {
        const token = COMMON_TOKENS[tokenSymbol]
        if (!token) {
          throw new Error(`Token ${tokenSymbol} not supported`)
        }

        const contract = new ethers.Contract(
          token.address,
          ['function transfer(address to, uint256 amount) external returns (bool)'],
          signer
        )

        gasLimit = await contract.estimateGas.transfer(to, ethers.parseUnits(amount, token.decimals))
      }

      const totalCost = gasLimit.mul(gasPrice)

      return {
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        totalCost: ethers.formatEther(totalCost)
      }
    } catch (error) {
      console.error('Gas estimation failed:', error)
      throw error
    }
  }

  /**
   * Check if wallet has sufficient balance
   */
  async hasSufficientBalance(
    walletId: string,
    amount: string,
    tokenSymbol: string = 'ETH'
  ): Promise<boolean> {
    const wallet = this.wallets.get(walletId)
    if (!wallet) return false

    const balance = wallet.balances.find(b => b.symbol === tokenSymbol)
    if (!balance) return false

    return parseFloat(balance.balance) >= parseFloat(amount)
  }

  /**
   * Start periodic balance sync
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      for (const walletId of this.wallets.keys()) {
        await this.syncWalletBalances(walletId)
      }
    }, 60000) // Sync every minute
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
  }

  /**
   * Approve token spending
   */
  async approveToken(
    walletId: string,
    tokenSymbol: string,
    spenderAddress: string,
    amount?: string
  ): Promise<WalletTransaction> {
    const signer = this.signers.get(walletId)
    if (!signer) {
      throw new Error(`Signer for ${walletId} not found`)
    }

    const token = COMMON_TOKENS[tokenSymbol]
    if (!token) {
      throw new Error(`Token ${tokenSymbol} not supported`)
    }

    const contract = new ethers.Contract(
      token.address,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      signer
    )

    const approvalAmount = amount ? 
      ethers.parseUnits(amount, token.decimals) : 
      ethers.constants.MaxUint256

    const tx = await contract.approve(spenderAddress, approvalAmount)

    const transaction: WalletTransaction = {
      id: `approve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hash: tx.hash,
      type: 'send',
      symbol: tokenSymbol,
      amount: amount || 'unlimited',
      from: await signer.getAddress(),
      to: spenderAddress,
      timestamp: Date.now(),
      status: 'pending',
      fee: '0',
      exchange: walletId,
      metadata: { type: 'approval', spender: spenderAddress }
    }

    this.transactions.push(transaction)
    this.monitorTransaction(transaction)

    return transaction
  }

  /**
   * Get token allowance
   */
  async getTokenAllowance(
    walletId: string,
    tokenSymbol: string,
    spenderAddress: string
  ): Promise<string> {
    const wallet = this.wallets.get(walletId)
    if (!wallet) {
      throw new Error(`Wallet ${walletId} not found`)
    }

    const token = COMMON_TOKENS[tokenSymbol]
    if (!token) {
      throw new Error(`Token ${tokenSymbol} not supported`)
    }

    const provider = this.providers.get(this.config.chainId)!
    const contract = new ethers.Contract(
      token.address,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      provider
    )

    const allowance = await contract.allowance(wallet.address, spenderAddress)
    return ethers.formatUnits(allowance, token.decimals)
  }

  /**
   * Health check for all wallets
   */
  async healthCheck(): Promise<{[walletId: string]: boolean}> {
    const health: {[walletId: string]: boolean} = {}

    for (const [walletId, wallet] of this.wallets.entries()) {
      try {
        if (walletId === 'ethereum') {
          const provider = this.providers.get(this.config.chainId)!
          await provider.getBlockNumber()
          health[walletId] = true
        } else {
          health[walletId] = wallet.isConnected
        }
      } catch (error) {
        health[walletId] = false
      }
    }

    return health
  }

  /**
   * Create allocation request to master wallet
   */
  async createAllocation(
    targetType: 'agent' | 'farm' | 'goal',
    targetId: string,
    targetName: string,
    amountUsd: number
  ): Promise<{success: boolean, allocation?: any, error?: string}> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) {
        return {success: false, error: 'Master wallet not configured'}
      }

      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/allocate`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          target_name: targetName,
          amount_usd: amountUsd
        })
      })

      if (response.ok) {
        const data = await response.json()
        await this.syncWithMasterWallet() // Refresh allocations
        return {success: true, allocation: data.allocation}
      } else {
        const error = await response.text()
        return {success: false, error}
      }
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'}
    }
  }

  /**
   * Collect funds from allocation
   */
  async collectFromAllocation(
    allocationId: string,
    collectionType: 'partial' | 'full' | 'profits_only',
    amountUsd?: number
  ): Promise<{success: boolean, amount?: number, error?: string}> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) {
        return {success: false, error: 'Master wallet not configured'}
      }

      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/collect`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          allocation_id: allocationId,
          collection_type: collectionType,
          amount_usd: amountUsd
        })
      })

      if (response.ok) {
        const data = await response.json()
        await this.syncWithMasterWallet() // Refresh allocations
        return {success: true, amount: data.collected_amount}
      } else {
        const error = await response.text()
        return {success: false, error}
      }
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'}
    }
  }

  /**
   * Get master wallet performance
   */
  async getMasterWalletPerformance(): Promise<{success: boolean, performance?: any, error?: string}> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) {
        return {success: false, error: 'Master wallet not configured'}
      }

      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/performance`)
      
      if (response.ok) {
        const data = await response.json()
        return {success: true, performance: data.performance}
      } else {
        const error = await response.text()
        return {success: false, error}
      }
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'}
    }
  }

  /**
   * Update wallet performance with master wallet
   */
  async reportPerformanceToMaster(
    walletId: string,
    performanceData: {
      total_value_usd: number
      total_pnl: number
      total_pnl_percentage: number
      daily_pnl: number
      total_trades: number
      winning_trades: number
      win_rate: number
    }
  ): Promise<{success: boolean, error?: string}> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) {
        return {success: false, error: 'Master wallet not configured'}
      }

      const response = await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/performance`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          wallet_id: walletId,
          ...performanceData,
          calculated_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        return {success: true}
      } else {
        const error = await response.text()
        return {success: false, error}
      }
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'}
    }
  }

  /**
   * Get master wallet configuration
   */
  getMasterWalletConfig(): MasterWalletConfig | undefined {
    return this.masterWalletConfig
  }

  /**
   * Check if wallet is allocated from master wallet
   */
  isAllocatedWallet(walletId: string): boolean {
    const wallet = this.wallets.get(walletId)
    return wallet?.allocation !== undefined
  }

  /**
   * Get allocation details for wallet
   */
  getAllocationDetails(walletId: string): {
    target_type: 'agent' | 'farm' | 'goal'
    target_id: string
    allocated_amount_usd: number
    current_value_usd: number
    total_pnl: number
  } | undefined {
    const wallet = this.wallets.get(walletId)
    return wallet?.allocation
  }

  /**
   * Format transaction for master wallet compatibility
   */
  private formatTransactionForMaster(transaction: WalletTransaction): any {
    return {
      transaction_id: transaction.id,
      transaction_type: transaction.type,
      amount: parseFloat(transaction.amount),
      asset_symbol: transaction.symbol,
      amount_usd: transaction.metadata?.usdValue,
      from_address: transaction.from,
      to_address: transaction.to,
      chain_id: this.config.chainId,
      tx_hash: transaction.hash,
      block_number: transaction.blockNumber,
      gas_used: transaction.gasUsed,
      gas_price: transaction.gasPrice,
      status: transaction.status,
      error_message: transaction.metadata?.error,
      created_at: new Date(transaction.timestamp).toISOString(),
      confirmed_at: transaction.status === 'confirmed' ? new Date().toISOString() : undefined
    }
  }

  /**
   * Report transaction to master wallet
   */
  async reportTransactionToMaster(transaction: WalletTransaction): Promise<void> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) return

      const masterTransaction = this.formatTransactionForMaster(transaction)
      
      await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/transactions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          wallet_id: this.config.masterWalletId,
          ...masterTransaction
        })
      })
    } catch (error) {
      console.error('Failed to report transaction to master wallet:', error)
    }
  }

  /**
   * Format balance for master wallet compatibility
   */
  private formatBalanceForMaster(balance: WalletBalance): any {
    return {
      asset_symbol: balance.symbol,
      balance: parseFloat(balance.balance),
      balance_usd: balance.usdValue,
      available_balance: parseFloat(balance.balance), // Assuming all balance is available
      locked_balance: 0,
      last_updated: new Date().toISOString()
    }
  }

  /**
   * Report balances to master wallet
   */
  async reportBalancesToMaster(): Promise<void> {
    try {
      if (!this.config.masterWalletId || !this.config.backendApiUrl) return

      const allBalances = this.getAllBalances()
      const masterBalances = allBalances.map(balance => this.formatBalanceForMaster(balance))
      
      await fetch(`${this.config.backendApiUrl}/api/v1/wallets/master/${this.config.masterWalletId}/balances`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          wallet_id: this.config.masterWalletId,
          balances: masterBalances
        })
      })
    } catch (error) {
      console.error('Failed to report balances to master wallet:', error)
    }
  }

  /**
   * Export wallet data
   */
  exportWalletData(): {
    wallets: ConnectedWallet[]
    transactions: WalletTransaction[]
    totalValue: number
    masterWallet?: MasterWalletConfig
  } {
    return {
      wallets: this.getAllWallets(),
      transactions: this.transactions,
      totalValue: this.getTotalPortfolioValue(),
      masterWallet: this.masterWalletConfig
    }
  }
}

export default WalletManager