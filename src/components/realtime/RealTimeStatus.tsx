/**
 * Real-time Connection Status Component
 * Shows WebSocket connection status and data stream indicators
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWebSocket } from '@/lib/realtime/websocket';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  Zap,
  Radio,
  TrendingUp,
  Shield
} from 'lucide-react';

interface RealTimeStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function RealTimeStatus({ className = '', showDetails = false }: RealTimeStatusProps) {
  const { isConnected, client } = useWebSocket();
  const [dataStreams, setDataStreams] = React.useState({
    marketData: false,
    portfolio: false,
    agents: false,
    signals: false,
    alerts: false
  });
  const [lastUpdate, setLastUpdate] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isConnected) return;

    // Monitor data streams
    const handleMarketData = () => {
      setDataStreams(prev => ({ ...prev, marketData: true }));
      setLastUpdate(Date.now());
      setTimeout(() => setDataStreams(prev => ({ ...prev, marketData: false })), 2000);
    };

    const handlePortfolioUpdate = () => {
      setDataStreams(prev => ({ ...prev, portfolio: true }));
      setLastUpdate(Date.now());
      setTimeout(() => setDataStreams(prev => ({ ...prev, portfolio: false })), 2000);
    };

    const handleAgentUpdate = () => {
      setDataStreams(prev => ({ ...prev, agents: true }));
      setLastUpdate(Date.now());
      setTimeout(() => setDataStreams(prev => ({ ...prev, agents: false })), 2000);
    };

    const handleTradingSignal = () => {
      setDataStreams(prev => ({ ...prev, signals: true }));
      setLastUpdate(Date.now());
      setTimeout(() => setDataStreams(prev => ({ ...prev, signals: false })), 2000);
    };

    const handleRiskAlert = () => {
      setDataStreams(prev => ({ ...prev, alerts: true }));
      setLastUpdate(Date.now());
      setTimeout(() => setDataStreams(prev => ({ ...prev, alerts: false })), 2000);
    };

    client.on('market_data', handleMarketData);
    client.on('portfolio_update', handlePortfolioUpdate);
    client.on('agent_update', handleAgentUpdate);
    client.on('trading_signal', handleTradingSignal);
    client.on('risk_alert', handleRiskAlert);

    return () => {
      client.off('market_data', handleMarketData);
      client.off('portfolio_update', handlePortfolioUpdate);
      client.off('agent_update', handleAgentUpdate);
      client.off('trading_signal', handleTradingSignal);
      client.off('risk_alert', handleRiskAlert);
    };
  }, [isConnected, client]);

  const handleReconnect = async () => {
    try {
      await client.connect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
    }
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'No data';
    const diff = Date.now() - lastUpdate;
    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  if (!showDetails) {
    // Compact view
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <Badge variant={isConnected ? 'default' : 'destructive'} className="text-xs">
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1">
            {Object.values(dataStreams).some(active => active) && (
              <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
            )}
          </div>
        )}
      </div>
    );
  }

  // Detailed view
  return (
    <div className={`p-4 border rounded-lg bg-white ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          <h3 className="font-semibold">Real-time Connection</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {!isConnected && (
            <Button size="sm" variant="outline" onClick={handleReconnect}>
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-2">Data Streams</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className={`flex items-center gap-2 p-2 rounded ${dataStreams.marketData ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                <TrendingUp className={`h-4 w-4 ${dataStreams.marketData ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">Market</span>
                {dataStreams.marketData && <Radio className="h-3 w-3 text-green-500 animate-pulse" />}
              </div>
              
              <div className={`flex items-center gap-2 p-2 rounded ${dataStreams.portfolio ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                <Activity className={`h-4 w-4 ${dataStreams.portfolio ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">Portfolio</span>
                {dataStreams.portfolio && <Radio className="h-3 w-3 text-blue-500 animate-pulse" />}
              </div>
              
              <div className={`flex items-center gap-2 p-2 rounded ${dataStreams.agents ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
                <Zap className={`h-4 w-4 ${dataStreams.agents ? 'text-purple-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">Agents</span>
                {dataStreams.agents && <Radio className="h-3 w-3 text-purple-500 animate-pulse" />}
              </div>
              
              <div className={`flex items-center gap-2 p-2 rounded ${dataStreams.signals ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}`}>
                <TrendingUp className={`h-4 w-4 ${dataStreams.signals ? 'text-yellow-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">Signals</span>
                {dataStreams.signals && <Radio className="h-3 w-3 text-yellow-500 animate-pulse" />}
              </div>
              
              <div className={`flex items-center gap-2 p-2 rounded ${dataStreams.alerts ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                <Shield className={`h-4 w-4 ${dataStreams.alerts ? 'text-red-500' : 'text-gray-400'}`} />
                <span className="text-xs font-medium">Alerts</span>
                {dataStreams.alerts && <Radio className="h-3 w-3 text-red-500 animate-pulse" />}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last update:</span>
            <span className="font-medium">{formatLastUpdate()}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active subscriptions:</span>
            <span className="font-medium">{client.activeSubscriptions.length}</span>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Real-time data connection is not available. Some features may be limited.
          </p>
          <Button size="sm" onClick={handleReconnect}>
            Try to Connect
          </Button>
        </div>
      )}
    </div>
  );
}