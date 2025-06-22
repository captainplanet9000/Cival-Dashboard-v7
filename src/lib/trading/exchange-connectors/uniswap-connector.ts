import { ethers } from 'ethers';
import { 
  BaseExchangeConnector, 
  ExchangeCredentials, 
  ExchangeInfo, 
  MarketData, 
  OrderBook, 
  Balance, 
  Position, 
  Order, 
  Trade,
  WebSocketConfig 
} from './base-connector';

interface UniswapConfig extends ExchangeCredentials {
  chainId?: number;
  rpcUrl?: string;
  privateKey?: string;
  walletAddress?: string;
  slippageTolerance?: number;
  gasLimit?: number;
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface SwapRoute {
  path: string[];
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  gasEstimate: string;
}

interface LiquidityPool {
  token0: TokenInfo;
  token1: TokenInfo;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

interface LiquidityPosition {
  tokenId: string;
  token0: TokenInfo;
  token1: TokenInfo;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  tokensOwed0: string;
  tokensOwed1: string;
  feeGrowthInside0LastX128: string;
  feeGrowthInside1LastX128: string;
}

// Uniswap V3 Contract ABIs (simplified)
const UNISWAP_V3_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountIn)',
  'function multicall(uint256 deadline, bytes[] calldata data) external payable returns (bytes[] memory results)'
];

const UNISWAP_V3_QUOTER_ABI = [
  'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
  'function quoteExactOutputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountIn)'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
];

export class UniswapConnector extends BaseExchangeConnector {
  private provider: ethers.Provider;
  private wallet?: ethers.Wallet;
  private chainId: number;
  private slippageTolerance: number;
  private gasLimit: number;
  
  // Contract addresses (Ethereum mainnet)
  private readonly ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
  private readonly QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
  private readonly WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  
  private routerContract?: ethers.Contract;
  private quoterContract?: ethers.Contract;
  private tokenCache: Map<string, TokenInfo> = new Map();

  constructor(config: UniswapConfig) {
    super(config);
    this.chainId = config.chainId || 1; // Ethereum mainnet
    this.slippageTolerance = config.slippageTolerance || 0.005; // 0.5%
    this.gasLimit = config.gasLimit || 300000;
    
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(
      config.rpcUrl || `https://mainnet.infura.io/v3/${config.apiKey}`
    );
    
    // Initialize wallet if private key provided
    if (config.privateKey) {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
      this.initializeContracts();
    }
  }

  private initializeContracts(): void {
    if (!this.wallet) return;
    
    this.routerContract = new ethers.Contract(
      this.ROUTER_ADDRESS, 
      UNISWAP_V3_ROUTER_ABI, 
      this.wallet
    );
    
    this.quoterContract = new ethers.Contract(
      this.QUOTER_ADDRESS, 
      UNISWAP_V3_QUOTER_ABI, 
      this.provider
    );
  }

  protected formatSymbol(symbol: string): string {
    // Convert common symbols to token addresses
    const symbolMap: Record<string, string> = {
      'ETH': this.WETH_ADDRESS,
      'WETH': this.WETH_ADDRESS,
      'USDC': '0xA0b86a33E6441d8b8A83B6C9F2d9c1F4aC31F02f', // USDC
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
      'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',  // DAI
      'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
    };
    
    return symbolMap[symbol.toUpperCase()] || symbol;
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    if (this.tokenCache.has(tokenAddress)) {
      return this.tokenCache.get(tokenAddress)!;
    }

    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      const [symbol, name, decimals] = await Promise.all([
        tokenContract.symbol(),
        tokenContract.name(),
        tokenContract.decimals()
      ]);

      const tokenInfo: TokenInfo = {
        address: tokenAddress,
        symbol,
        name,
        decimals: Number(decimals)
      };

      this.tokenCache.set(tokenAddress, tokenInfo);
      return tokenInfo;
    } catch (error) {
      throw new Error(`Failed to get token info for ${tokenAddress}: ${error}`);
    }
  }

  async getExchangeInfo(): Promise<ExchangeInfo> {
    try {
      // Popular tokens on Uniswap
      const popularTokens = [
        'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE', 'COMP', 'MKR'
      ];

      return {
        name: 'Uniswap V3',
        type: 'dex',
        symbols: popularTokens,
        minOrderSizes: popularTokens.reduce((acc, symbol) => {
          acc[symbol] = 0.000001; // Very small minimum for DEX
          return acc;
        }, {} as Record<string, number>),
        tickSizes: popularTokens.reduce((acc, symbol) => {
          acc[symbol] = 0.000001;
          return acc;
        }, {} as Record<string, number>),
        fees: {
          maker: 0.0005, // 0.05% typical Uniswap fee
          taker: 0.003,  // 0.3% typical Uniswap fee
        },
        limits: {
          maxOrderSize: popularTokens.reduce((acc, symbol) => {
            acc[symbol] = 1000000; // Very high limit
            return acc;
          }, {} as Record<string, number>),
          maxPositions: 1000,
        },
      };
    } catch (error) {
      throw new Error(`Failed to get exchange info: ${error}`);
    }
  }

  async getMarketData(symbol: string): Promise<MarketData> {
    try {
      const tokenAddress = this.formatSymbol(symbol);
      const baseTokenAddress = this.WETH_ADDRESS; // Use WETH as base
      
      if (!this.quoterContract) {
        throw new Error('Quoter contract not initialized');
      }

      // Get price by simulating a 1 ETH swap
      const amountIn = ethers.parseEther('1');
      const fee = 3000; // 0.3% fee tier
      
      const amountOut = await this.quoterContract.quoteExactInputSingle(
        baseTokenAddress,
        tokenAddress,
        fee,
        amountIn,
        0
      );

      const price = Number(ethers.formatEther(amountOut));
      
      // For DEX, we don't have traditional order book data
      // We'll approximate these values
      return {
        symbol,
        price,
        volume: 0, // Would need to query events or external APIs
        high24h: price * 1.1,
        low24h: price * 0.9,
        change24h: 0,
        changePercent24h: 0,
        timestamp: Date.now(),
        bid: price * 0.999,
        ask: price * 1.001,
        spread: price * 0.002,
      };
    } catch (error) {
      throw new Error(`Failed to get market data for ${symbol}: ${error}`);
    }
  }

  async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
    // Uniswap doesn't have traditional order books
    // We'll simulate one based on liquidity distribution
    const marketData = await this.getMarketData(symbol);
    const price = marketData.price;
    
    const bids: [number, number][] = [];
    const asks: [number, number][] = [];
    
    // Simulate order book based on liquidity curve
    for (let i = 0; i < limit; i++) {
      const bidPrice = price * (1 - (i + 1) * 0.001);
      const askPrice = price * (1 + (i + 1) * 0.001);
      const liquidity = 1000 / (i + 1); // Decreasing liquidity
      
      bids.push([bidPrice, liquidity]);
      asks.push([askPrice, liquidity]);
    }
    
    return {
      symbol,
      bids: bids.sort((a, b) => b[0] - a[0]),
      asks: asks.sort((a, b) => a[0] - b[0]),
      timestamp: Date.now(),
    };
  }

  async getBalances(): Promise<Balance[]> {
    try {
      if (!this.wallet) {
        throw new Error('Wallet not initialized');
      }

      const balances: Balance[] = [];
      
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(this.wallet.address);
      balances.push({
        asset: 'ETH',
        free: Number(ethers.formatEther(ethBalance)),
        locked: 0,
        total: Number(ethers.formatEther(ethBalance)),
        usdValue: Number(ethers.formatEther(ethBalance)) * 2000, // Approximate ETH price
      });

      // Get token balances for common tokens
      const tokenAddresses = [
        { symbol: 'USDC', address: '0xA0b86a33E6441d8b8A83B6C9F2d9c1F4aC31F02f' },
        { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
      ];

      for (const token of tokenAddresses) {
        try {
          const tokenContract = new ethers.Contract(token.address, ERC20_ABI, this.provider);
          const balance = await tokenContract.balanceOf(this.wallet.address);
          const decimals = await tokenContract.decimals();
          const formattedBalance = Number(ethers.formatUnits(balance, decimals));
          
          if (formattedBalance > 0) {
            balances.push({
              asset: token.symbol,
              free: formattedBalance,
              locked: 0,
              total: formattedBalance,
              usdValue: formattedBalance, // Assume stablecoins = $1
            });
          }
        } catch (error) {
          console.warn(`Failed to get balance for ${token.symbol}:`, error);
        }
      }

      return balances;
    } catch (error) {
      throw new Error(`Failed to get balances: ${error}`);
    }
  }

  async getPositions(): Promise<Position[]> {
    // For Uniswap, positions are liquidity positions
    // This would require querying the NonFungiblePositionManager contract
    return [];
  }

  async getOrders(symbol?: string): Promise<Order[]> {
    // Uniswap doesn't have pending orders in the traditional sense
    // All swaps are executed immediately
    return [];
  }

  async placeOrder(trade: Trade): Promise<Order> {
    try {
      if (!this.wallet || !this.routerContract) {
        throw new Error('Wallet or router contract not initialized');
      }

      const tokenIn = this.formatSymbol(trade.symbol.split('/')[0]);
      const tokenOut = this.formatSymbol(trade.symbol.split('/')[1]);
      const fee = 3000; // 0.3% fee tier
      
      // Convert amount to wei
      const tokenInInfo = await this.getTokenInfo(tokenIn);
      const amountIn = ethers.parseUnits(trade.quantity.toString(), tokenInInfo.decimals);
      
      // Get quote for minimum amount out
      const amountOutMin = await this.quoterContract!.quoteExactInputSingle(
        tokenIn,
        tokenOut,
        fee,
        amountIn,
        0
      );
      
      // Apply slippage tolerance
      const amountOutMinWithSlippage = amountOutMin * BigInt(Math.floor((1 - this.slippageTolerance) * 10000)) / BigInt(10000);
      
      // Check if we need to approve tokens
      if (tokenIn !== this.WETH_ADDRESS) {
        const tokenContract = new ethers.Contract(tokenIn, ERC20_ABI, this.wallet);
        const allowance = await tokenContract.allowance(this.wallet.address, this.ROUTER_ADDRESS);
        
        if (allowance < amountIn) {
          const approveTx = await tokenContract.approve(this.ROUTER_ADDRESS, amountIn);
          await approveTx.wait();
        }
      }
      
      // Prepare swap parameters
      const params = {
        tokenIn,
        tokenOut,
        fee,
        recipient: this.wallet.address,
        deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
        amountIn,
        amountOutMinimum: amountOutMinWithSlippage,
        sqrtPriceLimitX96: 0,
      };
      
      // Execute swap
      const tx = await this.routerContract.exactInputSingle(params, {
        value: tokenIn === this.WETH_ADDRESS ? amountIn : 0,
        gasLimit: this.gasLimit,
      });
      
      const receipt = await tx.wait();
      
      return {
        ...trade,
        id: tx.hash,
        status: receipt?.status === 1 ? 'filled' : 'rejected',
        filledQuantity: trade.quantity,
        averagePrice: trade.price || 0,
        fees: Number(ethers.formatEther(receipt?.gasUsed * receipt?.gasPrice || 0)),
        timestamp: Date.now(),
        updateTime: Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to place swap order: ${error}`);
    }
  }

  async cancelOrder(orderId: string, symbol: string): Promise<boolean> {
    // Cannot cancel orders on Uniswap as they execute immediately
    return false;
  }

  async cancelAllOrders(symbol?: string): Promise<boolean> {
    // Cannot cancel orders on Uniswap as they execute immediately
    return false;
  }

  // WebSocket implementation (would connect to external data providers)
  async connectWebSocket(config: WebSocketConfig): Promise<void> {
    // For real-time data, we'd need to connect to external providers
    // like The Graph Protocol or other indexing services
    console.log('WebSocket not implemented for Uniswap - consider using The Graph Protocol');
  }

  async subscribeToMarketData(symbols: string[]): Promise<void> {
    // Implementation would depend on external data provider
  }

  async subscribeToOrderBook(symbols: string[]): Promise<void> {
    // Implementation would depend on external data provider
  }

  async subscribeToTrades(symbols: string[]): Promise<void> {
    // Implementation would depend on external data provider
  }

  async subscribeToOrders(): Promise<void> {
    // No pending orders on Uniswap
  }

  async subscribeToPositions(): Promise<void> {
    // Would need to subscribe to position manager events
  }

  // Uniswap-specific methods
  async addLiquidity(
    tokenA: string,
    tokenB: string,
    fee: number,
    amountADesired: string,
    amountBDesired: string,
    amountAMin: string,
    amountBMin: string,
    tickLower: number,
    tickUpper: number
  ): Promise<string> {
    // Implementation for adding liquidity to Uniswap V3
    throw new Error('addLiquidity not implemented');
  }

  async removeLiquidity(tokenId: string, liquidityPercentage: number): Promise<string> {
    // Implementation for removing liquidity from Uniswap V3
    throw new Error('removeLiquidity not implemented');
  }

  async getLiquidityPositions(): Promise<LiquidityPosition[]> {
    // Get user's liquidity positions from NonFungiblePositionManager
    return [];
  }

  // Standardization methods (simplified for DEX)
  protected standardizeMarketData(rawData: any): MarketData {
    return rawData; // Already in correct format
  }

  protected standardizeOrderBook(rawData: any): OrderBook {
    return rawData; // Already in correct format
  }

  protected standardizeOrder(rawData: any): Order {
    return rawData; // Already in correct format
  }

  protected standardizePosition(rawData: any): Position {
    return rawData; // Already in correct format
  }

  protected standardizeBalance(rawData: any): Balance {
    return rawData; // Already in correct format
  }
}

export default UniswapConnector; 