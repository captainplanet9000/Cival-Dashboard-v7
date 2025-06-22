import { NextRequest, NextResponse } from 'next/server';

// Mock trading strategies data
const strategies = [
  {
    id: 'darvas-box',
    name: 'Darvas Box Breakout',
    status: 'active',
    totalReturn: 34.2,
    trades: 147,
    winRate: 89.1,
    allocation: 25.0,
    avgHoldTime: '4.2 days',
    sharpeRatio: 2.34,
    maxDrawdown: -4.2,
    lastTrade: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    description: 'Identifies breakout patterns using Darvas Box methodology',
    riskLevel: 'Medium',
    capitalAllocated: 25000,
  },
  {
    id: 'williams-alligator',
    name: 'Williams Alligator',
    status: 'active',
    totalReturn: 28.7,
    trades: 203,
    winRate: 82.3,
    allocation: 20.0,
    avgHoldTime: '2.8 days',
    sharpeRatio: 1.98,
    maxDrawdown: -6.1,
    lastTrade: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    description: 'Uses Bill Williams Alligator indicator for trend following',
    riskLevel: 'Medium',
    capitalAllocated: 20000,
  },
  {
    id: 'elliott-wave',
    name: 'Elliott Wave Detection',
    status: 'active',
    totalReturn: 42.1,
    trades: 89,
    winRate: 94.4,
    allocation: 15.0,
    avgHoldTime: '7.1 days',
    sharpeRatio: 3.12,
    maxDrawdown: -2.8,
    lastTrade: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    description: 'Advanced pattern recognition using Elliott Wave theory',
    riskLevel: 'Low',
    capitalAllocated: 15000,
  },
  {
    id: 'macd-histogram',
    name: 'MACD Histogram Divergence',
    status: 'paused',
    totalReturn: 15.8,
    trades: 156,
    winRate: 76.2,
    allocation: 10.0,
    avgHoldTime: '3.5 days',
    sharpeRatio: 1.45,
    maxDrawdown: -8.3,
    lastTrade: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(),
    description: 'Detects momentum divergences using MACD histogram',
    riskLevel: 'High',
    capitalAllocated: 10000,
  },
  {
    id: 'bollinger-bands',
    name: 'Bollinger Bands Squeeze',
    status: 'active',
    totalReturn: 22.4,
    trades: 234,
    winRate: 81.7,
    allocation: 12.0,
    avgHoldTime: '1.9 days',
    sharpeRatio: 1.87,
    maxDrawdown: -5.4,
    lastTrade: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    description: 'Identifies volatility breakouts using Bollinger Bands',
    riskLevel: 'Medium',
    capitalAllocated: 12000,
  },
  {
    id: 'ichimoku-cloud',
    name: 'Ichimoku Cloud Strategy',
    status: 'active',
    totalReturn: 19.6,
    trades: 178,
    winRate: 79.5,
    allocation: 18.0,
    avgHoldTime: '5.2 days',
    sharpeRatio: 1.76,
    maxDrawdown: -7.2,
    lastTrade: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    description: 'Comprehensive trend analysis using Ichimoku Kinko Hyo',
    riskLevel: 'Medium',
    capitalAllocated: 18000,
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const strategyId = searchParams.get('id');
    
    // Filter by status if provided
    let filteredStrategies = strategies;
    if (status) {
      filteredStrategies = strategies.filter(s => s.status === status);
    }
    
    // Get specific strategy if ID provided
    if (strategyId) {
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) {
        return NextResponse.json(
          { success: false, error: 'Strategy not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: strategy,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Add some randomization to simulate live data
    const liveStrategies = filteredStrategies.map(strategy => ({
      ...strategy,
      totalReturn: strategy.totalReturn + (Math.random() - 0.5) * 2,
      winRate: Math.max(0, Math.min(100, strategy.winRate + (Math.random() - 0.5) * 3)),
      sharpeRatio: Math.max(0, strategy.sharpeRatio + (Math.random() - 0.5) * 0.2),
    }));
    
    return NextResponse.json({
      success: true,
      data: liveStrategies,
      total: liveStrategies.length,
      active: liveStrategies.filter(s => s.status === 'active').length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Strategies API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch strategies data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategyId, action } = body;
    
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      return NextResponse.json(
        { success: false, error: 'Strategy not found' },
        { status: 404 }
      );
    }
    
    // Update strategy status based on action
    if (action === 'start') {
      strategy.status = 'active';
    } else if (action === 'pause') {
      strategy.status = 'paused';
    } else if (action === 'stop') {
      strategy.status = 'stopped';
    }
    
    return NextResponse.json({
      success: true,
      data: strategy,
      message: `Strategy ${strategy.name} ${action}ed successfully`,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Strategy update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update strategy',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}