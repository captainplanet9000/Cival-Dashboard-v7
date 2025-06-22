import { NextRequest, NextResponse } from 'next/server';
import TradingManager, { TradingManagerConfig } from '@/lib/trading/trading-manager';

// Global trading manager instance (in production, this should be properly managed)
let tradingManager: TradingManager | null = null;

// Initialize trading manager with configuration
function initializeTradingManager(): TradingManager {
  if (tradingManager) {
    return tradingManager;
  }

  const config: TradingManagerConfig = {
    exchanges: {
      hyperliquid: {
        type: 'hyperliquid',
        credentials: {
          apiKey: process.env.HYPERLIQUID_API_KEY || '',
          apiSecret: process.env.HYPERLIQUID_API_SECRET || '',
          testnet: process.env.NODE_ENV !== 'production',
        },
        enabled: !!(process.env.HYPERLIQUID_API_KEY && process.env.HYPERLIQUID_API_SECRET),
        priority: 1,
      },
      uniswap: {
        type: 'uniswap',
        credentials: {
          apiKey: process.env.INFURA_PROJECT_ID || '',
          apiSecret: '',
          privateKey: process.env.ETHEREUM_PRIVATE_KEY,
        },
        enabled: !!(process.env.INFURA_PROJECT_ID),
        priority: 2,
      },
      vertex: {
        type: 'vertex',
        credentials: {
          apiKey: process.env.VERTEX_API_KEY || '',
          apiSecret: process.env.VERTEX_API_SECRET || '',
        },
        enabled: false, // TODO: Implement Vertex connector
        priority: 3,
      },
      bluefin: {
        type: 'bluefin',
        credentials: {
          apiKey: process.env.BLUEFIN_API_KEY || '',
          apiSecret: process.env.BLUEFIN_API_SECRET || '',
        },
        enabled: false, // TODO: Implement Bluefin connector
        priority: 4,
      },
      bybit: {
        type: 'bybit',
        credentials: {
          apiKey: process.env.BYBIT_API_KEY || '',
          apiSecret: process.env.BYBIT_API_SECRET || '',
        },
        enabled: false, // TODO: Implement Bybit connector
        priority: 5,
      },
    },
    defaultExchange: 'hyperliquid',
    realTimeDataEnabled: true,
    aggregateOrderBooks: true,
    riskManagement: {
      maxPositionSize: 1000000, // $1M max position
      maxDailyLoss: 50000, // $50K daily loss limit
      stopLossPercentage: 5, // 5% stop loss
      takeProfitPercentage: 15, // 15% take profit
    },
  };

  tradingManager = new TradingManager(config);
  
  // Initialize the trading manager
  tradingManager.initialize().catch(error => {
    console.error('Failed to initialize trading manager:', error);
  });

  // Set up event listeners for logging/monitoring
  tradingManager.on('exchangeConnected', ({ exchange }) => {
    console.log(`Exchange connected: ${exchange}`);
  });

  tradingManager.on('exchangeError', ({ exchange, error }) => {
    console.error(`Exchange error (${exchange}):`, error);
  });

  tradingManager.on('orderPlaced', ({ exchange, order }) => {
    console.log(`Order placed on ${exchange}:`, order.id);
  });

  return tradingManager;
}

// GET endpoint for portfolio and trading data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'portfolio';
    const symbol = searchParams.get('symbol');
    const exchange = searchParams.get('exchange');

    const manager = initializeTradingManager();

    switch (endpoint) {
      case 'portfolio': {
        const portfolio = await manager.getPortfolioSummary();
        const connectedExchanges = manager.getConnectedExchanges();
        
        return NextResponse.json({
          success: true,
          data: {
            ...portfolio,
            connectedExchanges,
            lastUpdated: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'market-data': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol parameter required' },
            { status: 400 }
          );
        }

        const marketData = await manager.getMarketData(symbol, exchange || undefined);
        
        return NextResponse.json({
          success: true,
          data: marketData,
          timestamp: new Date().toISOString(),
        });
      }

      case 'exchanges': {
        const exchangeInfo = await manager.getExchangeInfo(exchange || undefined);
        const connectedExchanges = manager.getConnectedExchanges();
        
        return NextResponse.json({
          success: true,
          data: {
            exchanges: exchangeInfo,
            connected: connectedExchanges,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'strategies': {
        const strategies = manager.getStrategies();
        
        return NextResponse.json({
          success: true,
          data: strategies,
          timestamp: new Date().toISOString(),
        });
      }

      case 'arbitrage': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Symbol parameter required' },
            { status: 400 }
          );
        }

        const opportunities = await manager.findArbitrageOpportunities(symbol);
        
        return NextResponse.json({
          success: true,
          data: opportunities,
          timestamp: new Date().toISOString(),
        });
      }

      case 'health': {
        const connectedExchanges = manager.getConnectedExchanges();
        const cache = manager.getMarketDataCache();
        
        return NextResponse.json({
          success: true,
          data: {
            status: 'healthy',
            connectedExchanges,
            cachedSymbols: Array.from(cache.keys()),
            uptime: process.uptime(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown endpoint: ${endpoint}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Trading API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST endpoint for trading operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    const manager = initializeTradingManager();

    switch (action) {
      case 'place-order': {
        const { trade, exchange } = params;
        
        if (!trade) {
          return NextResponse.json(
            { success: false, error: 'Trade parameters required' },
            { status: 400 }
          );
        }

        const order = await manager.placeOrder(trade, exchange);
        
        return NextResponse.json({
          success: true,
          data: order,
          message: `Order placed successfully on ${exchange || 'default exchange'}`,
          timestamp: new Date().toISOString(),
        });
      }

      case 'cancel-order': {
        const { orderId, symbol, exchange } = params;
        
        if (!orderId || !symbol || !exchange) {
          return NextResponse.json(
            { success: false, error: 'Order ID, symbol, and exchange required' },
            { status: 400 }
          );
        }

        const result = await manager.cancelOrder(orderId, symbol, exchange);
        
        return NextResponse.json({
          success: result,
          data: { orderId, symbol, exchange, cancelled: result },
          message: result ? 'Order cancelled successfully' : 'Failed to cancel order',
          timestamp: new Date().toISOString(),
        });
      }

      case 'add-strategy': {
        const { strategy } = params;
        
        if (!strategy) {
          return NextResponse.json(
            { success: false, error: 'Strategy configuration required' },
            { status: 400 }
          );
        }

        manager.addStrategy(strategy);
        
        return NextResponse.json({
          success: true,
          data: strategy,
          message: 'Strategy added successfully',
          timestamp: new Date().toISOString(),
        });
      }

      case 'update-strategy': {
        const { strategyId, updates } = params;
        
        if (!strategyId || !updates) {
          return NextResponse.json(
            { success: false, error: 'Strategy ID and updates required' },
            { status: 400 }
          );
        }

        manager.updateStrategy(strategyId, updates);
        
        return NextResponse.json({
          success: true,
          data: { strategyId, updates },
          message: 'Strategy updated successfully',
          timestamp: new Date().toISOString(),
        });
      }

      case 'remove-strategy': {
        const { strategyId } = params;
        
        if (!strategyId) {
          return NextResponse.json(
            { success: false, error: 'Strategy ID required' },
            { status: 400 }
          );
        }

        manager.removeStrategy(strategyId);
        
        return NextResponse.json({
          success: true,
          data: { strategyId },
          message: 'Strategy removed successfully',
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Trading API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// WebSocket endpoint for real-time data (in a real implementation, this would be a separate WebSocket server)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const manager = initializeTradingManager();

    switch (action) {
      case 'subscribe-market-data': {
        // In a real implementation, this would establish a WebSocket connection
        // For now, we'll return the current cached data
        const cache = manager.getMarketDataCache();
        const marketData: Record<string, any> = {};
        
        for (const [symbol, exchangeData] of cache) {
          marketData[symbol] = Object.fromEntries(exchangeData);
        }

        return NextResponse.json({
          success: true,
          data: {
            type: 'market-data-snapshot',
            marketData,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case 'get-real-time-status': {
        const connectedExchanges = manager.getConnectedExchanges();
        
        return NextResponse.json({
          success: true,
          data: {
            realTimeEnabled: true,
            connectedExchanges,
            dataStreams: ['market-data', 'order-books', 'user-orders', 'positions'],
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Trading WebSocket API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
} 