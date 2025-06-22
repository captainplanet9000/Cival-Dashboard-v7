import { NextRequest, NextResponse } from 'next/server';

// Mock portfolio data with real-time simulation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '1d';
    const metric = searchParams.get('metric') || 'overview';
    
    // Generate realistic portfolio data with some randomization
    const now = new Date();
    const baseValue = 125847.32;
    const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% variation
    
    const portfolioData = {
      totalValue: Math.round((baseValue * (1 + randomVariation)) * 100) / 100,
      dailyChange: Math.round((baseValue * randomVariation) * 100) / 100,
      dailyChangePercent: Math.round(randomVariation * 100 * 100) / 100,
      totalReturn: Math.round((baseValue * 0.2587) * 100) / 100,
      totalReturnPercent: 25.87,
      lastUpdated: now.toISOString(),
      
      // Performance metrics
      metrics: {
        sharpeRatio: 2.34 + (Math.random() - 0.5) * 0.2,
        maxDrawdown: -4.2 + (Math.random() - 0.5) * 1.0,
        winRate: 87.3 + (Math.random() - 0.5) * 4.0,
        volatility: 12.4 + (Math.random() - 0.5) * 2.0,
        sortino: 3.12 + (Math.random() - 0.5) * 0.3,
        beta: 0.78 + (Math.random() - 0.5) * 0.2,
      },
      
      // Holdings breakdown
      holdings: [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          quantity: 25,
          avgPrice: 185.50,
          currentPrice: 189.75 + (Math.random() - 0.5) * 10,
          marketValue: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 18.5,
        },
        {
          symbol: 'MSFT',
          name: 'Microsoft Corporation',
          quantity: 15,
          avgPrice: 342.00,
          currentPrice: 355.25 + (Math.random() - 0.5) * 15,
          marketValue: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 16.2,
        },
        {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          quantity: 10,
          avgPrice: 245.80,
          currentPrice: 265.40 + (Math.random() - 0.5) * 20,
          marketValue: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 12.8,
        },
        {
          symbol: 'NVDA',
          name: 'NVIDIA Corporation',
          quantity: 8,
          avgPrice: 425.75,
          currentPrice: 445.20 + (Math.random() - 0.5) * 25,
          marketValue: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 14.1,
        },
        {
          symbol: 'SPY',
          name: 'SPDR S&P 500 ETF',
          quantity: 50,
          avgPrice: 415.25,
          currentPrice: 425.80 + (Math.random() - 0.5) * 8,
          marketValue: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 25.4,
        },
      ].map(holding => {
        const marketValue = holding.quantity * holding.currentPrice;
        const costBasis = holding.quantity * holding.avgPrice;
        const pnl = marketValue - costBasis;
        const pnlPercent = (pnl / costBasis) * 100;
        
        return {
          ...holding,
          marketValue: Math.round(marketValue * 100) / 100,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
        };
      }),
      
      // Strategy performance
      strategies: [
        {
          id: 'darvas-box',
          name: 'Darvas Box Breakout',
          status: 'active',
          totalReturn: 34.2 + (Math.random() - 0.5) * 5,
          trades: 147,
          winRate: 89.1 + (Math.random() - 0.5) * 3,
          allocation: 25.0,
          avgHoldTime: '4.2 days',
          lastTrade: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
        },
        {
          id: 'williams-alligator',
          name: 'Williams Alligator',
          status: 'active',
          totalReturn: 28.7 + (Math.random() - 0.5) * 4,
          trades: 203,
          winRate: 82.3 + (Math.random() - 0.5) * 4,
          allocation: 20.0,
          avgHoldTime: '2.8 days',
          lastTrade: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
        },
        {
          id: 'elliott-wave',
          name: 'Elliott Wave Detection',
          status: 'active',
          totalReturn: 42.1 + (Math.random() - 0.5) * 6,
          trades: 89,
          winRate: 94.4 + (Math.random() - 0.5) * 2,
          allocation: 15.0,
          avgHoldTime: '7.1 days',
          lastTrade: new Date(now.getTime() - Math.random() * 86400000).toISOString(),
        },
        {
          id: 'renko-ma',
          name: 'Renko + Moving Average',
          status: 'paused',
          totalReturn: -2.3 + (Math.random() - 0.5) * 2,
          trades: 156,
          winRate: 58.3 + (Math.random() - 0.5) * 5,
          allocation: 10.0,
          avgHoldTime: '1.9 days',
          lastTrade: new Date(now.getTime() - Math.random() * 86400000 * 2).toISOString(),
        },
      ],
      
      // System health
      systemHealth: {
        overall: 'healthy',
        components: [
          {
            name: 'Trading Engine',
            status: 'online',
            uptime: '99.9%',
            lastCheck: new Date(now.getTime() - Math.random() * 300000).toISOString(),
          },
          {
            name: 'Data Feed',
            status: 'online',
            uptime: '99.8%',
            lastCheck: new Date(now.getTime() - Math.random() * 300000).toISOString(),
          },
          {
            name: 'Risk Management',
            status: Math.random() > 0.8 ? 'warning' : 'online',
            uptime: '98.7%',
            lastCheck: new Date(now.getTime() - Math.random() * 300000).toISOString(),
          },
          {
            name: 'MCP Server',
            status: 'online',
            uptime: '100%',
            lastCheck: new Date(now.getTime() - Math.random() * 300000).toISOString(),
          },
        ],
      },
    };
    
    return NextResponse.json({
      success: true,
      data: portfolioData,
      timestamp: now.toISOString(),
    });
    
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch portfolio data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Real-time portfolio updates via POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbol, quantity, price } = body;
    
    // Simulate portfolio update
    const now = new Date();
    
    const updateResult = {
      success: true,
      action,
      symbol,
      quantity,
      price,
      timestamp: now.toISOString(),
      portfolioValue: 125847.32 + (Math.random() - 0.5) * 1000,
      message: `Successfully ${action} ${quantity} shares of ${symbol} at $${price}`,
    };
    
    return NextResponse.json(updateResult);
    
  } catch (error) {
    console.error('Portfolio update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update portfolio',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 