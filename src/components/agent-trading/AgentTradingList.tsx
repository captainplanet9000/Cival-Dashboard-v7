'use client';

import * as React from 'react';
import { agentTradingDb, type AgentTradingPermission } from '@/utils/agent-trading-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Component that displays a list of agent trading permissions
 * and demonstrates usage of the type-safe database utilities
 */
export function AgentTradingList() {
  const [permissions, setPermissions] = React.useState<AgentTradingPermission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  // Load agent trading permissions on component mount
  React.useEffect(() => {
    async function loadPermissions() {
      setLoading(true);
      setError(null);

      const result = await agentTradingDb.getTradingPermissions();
      
      if (result.error) {
        setError(result.error.message);
        toast({
          title: 'Error loading trading permissions',
          description: result.error.message,
          variant: 'destructive'
        });
      } else {
        setPermissions(result.data || []);
      }
      
      setLoading(false);
    }

    loadPermissions();
  }, [toast]);

  // Handle creating a sample trading permission
  const handleCreateSample = async () => {
    const newPermission = {
      agent_id: `agent-${Date.now()}`,
      account_id: 'demo-account',
      max_trade_size: 10000,
      max_position_size: 50000,
      max_daily_trades: 20,
      risk_level: 'moderate',
      allowed_symbols: ['BTC', 'ETH', 'SOL'],
      allowed_strategies: ['momentum', 'mean_reversion'],
      is_active: true,
    };

    const result = await agentTradingDb.createTradingPermission(newPermission);
    
    if (result.error) {
      toast({
        title: 'Error creating trading permission',
        description: result.error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Trading permission created',
        description: `Created permission for agent ${result.data?.agent_id}`,
      });
      
      // Refresh the list
      const refreshResult = await agentTradingDb.getTradingPermissions();
      if (!refreshResult.error) {
        setPermissions(refreshResult.data || []);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <h3 className="text-lg font-medium text-red-800">Error loading trading permissions</h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Agent Trading Permissions</h2>
        <Button onClick={handleCreateSample}>Create Sample</Button>
      </div>
      
      {permissions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No trading permissions found</p>
            <Button onClick={handleCreateSample} className="mt-4">
              Create Sample Permission
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {permissions.map((permission) => (
            <Card key={permission.agent_id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{permission.agent_id}</CardTitle>
                  <Badge variant={permission.is_active ? "default" : "outline"}>
                    {permission.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>Account: {permission.account_id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Risk Level:</span>
                  <span className="ml-2">{permission.risk_level}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Max Daily Trades:</span>
                  <span className="ml-2">{permission.max_daily_trades}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Max Trade Size:</span>
                  <span className="ml-2">{permission.max_trade_size?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Allowed Symbols:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(permission.allowed_symbols) && 
                      permission.allowed_symbols.map((symbol: string) => (
                        <Badge key={symbol} variant="secondary">{symbol}</Badge>
                      ))
                    }
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" size="sm">View Details</Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    const result = await agentTradingDb.updateTradingPermission(
                      permission.agent_id,
                      { is_active: !permission.is_active }
                    );
                    
                    if (result.error) {
                      toast({
                        title: 'Error updating permission',
                        description: result.error.message,
                        variant: 'destructive'
                      });
                    } else {
                      toast({
                        title: 'Permission updated',
                        description: `Agent ${permission.agent_id} is now ${result.data?.is_active ? 'active' : 'inactive'}`,
                      });
                      
                      // Update the list
                      const refreshResult = await agentTradingDb.getTradingPermissions();
                      if (!refreshResult.error) {
                        setPermissions(refreshResult.data || []);
                      }
                    }
                  }}
                >
                  {permission.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}