import { Metadata } from 'next';
import { AgentTradingList } from '@/components/agent-trading/AgentTradingList';
import { getServerAgentTradingDb } from '@/utils/agent-trading-db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Agent Trading | Trading Farm Dashboard',
  description: 'Manage your AI trading agents with comprehensive monitoring and controls',
};

/**
 * Page component for agent trading functionality
 * This demonstrates server component integration with our type-safe database utilities
 */
export default async function AgentTradingPage() {
  // Initialize the server-side database utility
  const serverDb = await getServerAgentTradingDb();
  
  // Fetch initial data for server-side rendering
  const permissionsResult = await serverDb.getTradingPermissions();
  const permissions = permissionsResult.data || [];
  
  // Calculate some statistics for the overview panel
  const activePermissions = permissions.filter(p => p.is_active).length;
  const totalPermissions = permissions.length;
  const totalDailyTrades = permissions.reduce((sum, p) => sum + (p.max_daily_trades || 0), 0);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Trading</h1>
        <p className="text-muted-foreground mt-2">
          Manage trading agents, monitor performance, and configure trading strategies
        </p>
      </div>
      
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPermissions}</div>
            <p className="text-xs text-muted-foreground">
              {activePermissions} active
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Trading Capacity</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDailyTrades}</div>
            <p className="text-xs text-muted-foreground">
              Max trades per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Across all agents
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground h-4 w-4">
              <path d="m2 2 20 20" />
              <path d="M4.7 4.7C3.6 5.8 3 7.3 3 9c0 4.4 6 10 9 10 1.7 0 3.2-.6 4.3-1.7" />
              <path d="M21 9c0-4.4-6-10-9-10-1.7 0-3.2.6-4.3 1.7" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Trading active now
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Trading Agents</TabsTrigger>
          <TabsTrigger value="trades">Recent Trades</TabsTrigger>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="agents" className="space-y-4">
          <AgentTradingList />
        </TabsContent>
        
        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>
                View recent trading activity across all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent trades found.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                View current market positions for all agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No open positions found.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Performance</CardTitle>
              <CardDescription>
                View historical performance metrics for your trading agents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No performance data available yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}