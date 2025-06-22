/**
 * Live Market Data Ticker Component
 * Shows real-time market prices with WebSocket updates
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useMarketData } from '@/lib/realtime/websocket';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface LiveMarketTickerProps {
  symbols?: string[];
  className?: string;
  showSpread?: boolean;
  compact?: boolean;
}

const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'BTC-USD'];

export function LiveMarketTicker({ 
  symbols = DEFAULT_SYMBOLS, 
  className = '',
  showSpread = false,
  compact = false
}: LiveMarketTickerProps) {
  const marketData = useMarketData(symbols);
  const [isScrolling, setIsScrolling] = React.useState(true);

  const formatPrice = (price: number) => {
    if (price < 1) {
      return price.toFixed(4);
    } else if (price < 100) {
      return price.toFixed(2);
    } else {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (compact) {
    return (
      <div className={`overflow-hidden bg-black text-white ${className}`}>
        <div className={`flex gap-8 py-2 px-4 ${isScrolling ? 'animate-scroll' : ''}`}>
          {symbols.map(symbol => {
            const data = marketData.get(symbol);
            if (!data) {
              return (
                <div key={symbol} className="flex items-center gap-2 whitespace-nowrap">
                  <span className="font-mono font-bold">{symbol}</span>
                  <Activity className="h-3 w-3 animate-spin text-gray-400" />
                </div>
              );
            }

            return (
              <div key={symbol} className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-mono font-bold">{symbol}</span>
                <span className="font-mono">${formatPrice(data.price)}</span>
                <span className={`flex items-center gap-1 font-mono text-sm ${getTrendColor(data.change)}`}>
                  {getTrendIcon(data.change)}
                  {formatChange(data.change, data.changePercent)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold">Live Market Data</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Real-time
          </Badge>
          <button
            onClick={() => setIsScrolling(!isScrolling)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {isScrolling ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {symbols.map(symbol => {
            const data = marketData.get(symbol);
            
            if (!data) {
              return (
                <div key={symbol} className="p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm">{symbol}</span>
                    <Activity className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                  <div className="text-lg font-mono text-gray-400">Loading...</div>
                </div>
              );
            }

            const isPositive = data.change >= 0;
            const isNegative = data.change < 0;

            return (
              <div 
                key={symbol} 
                className={`p-3 border rounded-lg transition-colors ${
                  isPositive ? 'bg-green-50 border-green-200' :
                  isNegative ? 'bg-red-50 border-red-200' :
                  'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-sm">{symbol}</span>
                  <div className={`flex items-center gap-1 ${getTrendColor(data.change)}`}>
                    {getTrendIcon(data.change)}
                  </div>
                </div>
                
                <div className="mb-2">
                  <div className="text-lg font-mono font-bold">
                    ${formatPrice(data.price)}
                  </div>
                  <div className={`text-sm font-mono ${getTrendColor(data.change)}`}>
                    {formatChange(data.change, data.changePercent)}
                  </div>
                </div>

                {showSpread && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Bid:</span>
                      <span className="font-mono">${formatPrice(data.bid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ask:</span>
                      <span className="font-mono">${formatPrice(data.ask)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Spread:</span>
                      <span className="font-mono">${formatPrice(data.spread)}</span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  Vol: {data.volume.toLocaleString()}
                </div>

                <div className="text-xs text-muted-foreground">
                  {new Date(data.timestamp).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// CSS for scrolling animation (add to global styles)
const scrollingStyles = `
@keyframes scroll {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.animate-scroll {
  animation: scroll 30s linear infinite;
}
`;