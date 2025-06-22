import { NextRequest, NextResponse } from 'next/server';

// Mock market data
const generateMarketData = () => {
  const symbols = [
    { symbol: 'AAPL', name: 'Apple Inc.', basePrice: 189.75 },
    { symbol: 'TSLA', name: 'Tesla Inc.', basePrice: 265.40 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', basePrice: 355.25 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', basePrice: 445.20 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', basePrice: 142.87 },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', basePrice: 155.89 },
    { symbol: 'META', name: 'Meta Platforms Inc.', basePrice: 354.64 },
    { symbol: 'BTC-USD', name: 'Bitcoin USD', basePrice: 43250.75 },
    { symbol: 'ETH-USD', name: 'Ethereum USD', basePrice: 2587.90 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', basePrice: 425.80 }
  ];

  return symbols.map(stock => {
    const changePercent = (Math.random() - 0.5) * 10; // ±5% daily change
    const currentPrice = stock.basePrice * (1 + changePercent / 100);
    const change = currentPrice - stock.basePrice;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;
    
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: Math.round(currentPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
      high24h: Math.round((currentPrice * 1.02) * 100) / 100,
      low24h: Math.round((currentPrice * 0.98) * 100) / 100,
      lastUpdated: new Date().toISOString(),
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'stocks';
    
    const marketData = generateMarketData();
    
    if (symbol) {
      const symbolData = marketData.find(s => s.symbol === symbol.toUpperCase());
      if (!symbolData) {
        return NextResponse.json(
          { success: false, error: 'Symbol not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        data: symbolData,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Filter by type if needed
    let filteredData = marketData;
    if (type === 'crypto') {
      filteredData = marketData.filter(s => s.symbol.includes('-USD'));
    } else if (type === 'stocks') {
      filteredData = marketData.filter(s => !s.symbol.includes('-USD'));
    }
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      timestamp: new Date().toISOString(),
      marketStatus: {
        isOpen: new Date().getHours() >= 9 && new Date().getHours() < 16,
        nextOpen: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'EST',
      },
    });
    
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch market data',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}