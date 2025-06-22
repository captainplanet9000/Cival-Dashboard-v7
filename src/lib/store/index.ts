import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { StrategyInstance, Position, Order, MarketData, TradingSignal, RiskMetrics } from '../types/trading';
import type { MCPServerStatus, AgentCoordinationState, WorkflowState } from '../types/mcp';
import type { VaultIntegration, VaultDashboardData } from '../types/vault';
import type { Alert, SystemStatus, UserPreferences, AsyncState } from '../types/common';

// Trading State Slice
interface TradingState {
  strategies: StrategyInstance[];
  positions: Position[];
  orders: Order[];
  marketData: Record<string, MarketData>;
  signals: TradingSignal[];
  riskMetrics: RiskMetrics | null;
  portfolioValue: number;
  totalPnL: number;
  // Actions
  updateStrategy: (strategyId: string, updates: Partial<StrategyInstance>) => void;
  addPosition: (position: Position) => void;
  updatePosition: (positionId: string, updates: Partial<Position>) => void;
  closePosition: (positionId: string) => void;
  addOrder: (order: Order) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  updateMarketData: (symbol: string, data: MarketData) => void;
  addSignal: (signal: TradingSignal) => void;
  updateRiskMetrics: (metrics: RiskMetrics) => void;
  setPortfolioValue: (value: number) => void;
}

// MCP State Slice
interface MCPState {
  servers: MCPServerStatus[];
  agentCoordination: AgentCoordinationState | null;
  workflows: WorkflowState;
  mcpConnectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  // Actions
  updateServerStatus: (serverId: string, status: Partial<MCPServerStatus>) => void;
  updateAgentCoordination: (state: AgentCoordinationState) => void;
  updateWorkflows: (workflows: Partial<WorkflowState>) => void;
  setMCPConnectionStatus: (status: MCPState['mcpConnectionStatus']) => void;
}

// Vault State Slice
interface VaultState {
  integration: VaultIntegration | null;
  dashboardData: VaultDashboardData | null;
  vaultConnectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  // Actions
  updateIntegration: (integration: VaultIntegration) => void;
  updateDashboardData: (data: VaultDashboardData) => void;
  setVaultConnectionStatus: (status: VaultState['vaultConnectionStatus']) => void;
}

// System State Slice
interface SystemState {
  status: SystemStatus | null;
  alerts: Alert[];
  preferences: UserPreferences | null;
  // Actions
  updateSystemStatus: (status: SystemStatus) => void;
  addAlert: (alert: Alert) => void;
  acknowledgeAlert: (alertId: string, userId: string) => void;
  dismissAlert: (alertId: string) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

// Real-time State Slice
interface RealTimeState {
  connected: boolean;
  lastPing: Date | null;
  latency: number;
  subscriptions: string[];
  // Actions
  setConnected: (connected: boolean) => void;
  updatePing: (ping: Date, latency: number) => void;
  addSubscription: (topic: string) => void;
  removeSubscription: (topic: string) => void;
}

// Async State Management
interface AsyncStates {
  strategies: AsyncState<StrategyInstance[]>;
  positions: AsyncState<Position[]>;
  orders: AsyncState<Order[]>;
  marketData: AsyncState<Record<string, MarketData>>;
  mcpServers: AsyncState<MCPServerStatus[]>;
  vaultData: AsyncState<VaultDashboardData>;
  systemStatus: AsyncState<SystemStatus>;
}

// Complete Store Type
export interface AppStore extends 
  TradingState,
  MCPState,
  VaultState,
  SystemState,
  RealTimeState {
  // Async state management
  asyncStates: AsyncStates;
  setAsyncState: <K extends keyof AsyncStates>(
    key: K,
    state: Partial<AsyncStates[K]>
  ) => void;
  
  // Global actions
  reset: () => void;
  initialize: () => Promise<void>;
}

// Initial states
const initialTradingState: Pick<TradingState, 'strategies' | 'positions' | 'orders' | 'marketData' | 'signals' | 'riskMetrics' | 'portfolioValue' | 'totalPnL'> = {
  strategies: [],
  positions: [],
  orders: [],
  marketData: {},
  signals: [],
  riskMetrics: null,
  portfolioValue: 0,
  totalPnL: 0,
};

const initialMCPState: Pick<MCPState, 'servers' | 'agentCoordination' | 'workflows' | 'mcpConnectionStatus'> = {
  servers: [],
  agentCoordination: null,
  workflows: {
    active_workflows: [],
    scheduled_tasks: [],
    workflow_templates: [],
  },
  mcpConnectionStatus: 'disconnected',
};

const initialVaultState: Pick<VaultState, 'integration' | 'dashboardData' | 'vaultConnectionStatus'> = {
  integration: null,
  dashboardData: null,
  vaultConnectionStatus: 'disconnected',
};

const initialSystemState: Pick<SystemState, 'status' | 'alerts' | 'preferences'> = {
  status: null,
  alerts: [],
  preferences: null,
};

const initialRealTimeState: Pick<RealTimeState, 'connected' | 'lastPing' | 'latency' | 'subscriptions'> = {
  connected: false,
  lastPing: null,
  latency: 0,
  subscriptions: [],
};

const initialAsyncStates: AsyncStates = {
  strategies: { state: 'idle' },
  positions: { state: 'idle' },
  orders: { state: 'idle' },
  marketData: { state: 'idle' },
  mcpServers: { state: 'idle' },
  vaultData: { state: 'idle' },
  systemStatus: { state: 'idle' },
};

// Create the store
export const useAppStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // Initial state
        ...initialTradingState,
        ...initialMCPState,
        ...initialVaultState,
        ...initialSystemState,
        ...initialRealTimeState,
        asyncStates: initialAsyncStates,

        // Trading actions
        updateStrategy: (strategyId: string, updates: Partial<StrategyInstance>) =>
          set((state) => {
            const index = state.strategies.findIndex(s => s.id === strategyId);
            if (index !== -1) {
              Object.assign(state.strategies[index], updates);
            }
          }),

        addPosition: (position: Position) =>
          set((state) => {
            state.positions.push(position);
          }),

        updatePosition: (positionId: string, updates: Partial<Position>) =>
          set((state) => {
            const index = state.positions.findIndex(p => p.id === positionId);
            if (index !== -1) {
              Object.assign(state.positions[index], updates);
            }
          }),

        closePosition: (positionId: string) =>
          set((state) => {
            state.positions = state.positions.filter(p => p.id !== positionId);
          }),

        addOrder: (order: Order) =>
          set((state) => {
            state.orders.push(order);
          }),

        updateOrder: (orderId: string, updates: Partial<Order>) =>
          set((state) => {
            const index = state.orders.findIndex(o => o.id === orderId);
            if (index !== -1) {
              Object.assign(state.orders[index], updates);
            }
          }),

        updateMarketData: (symbol: string, data: MarketData) =>
          set((state) => {
            state.marketData[symbol] = data;
          }),

        addSignal: (signal: TradingSignal) =>
          set((state) => {
            state.signals.unshift(signal);
            // Keep only last 100 signals
            if (state.signals.length > 100) {
              state.signals = state.signals.slice(0, 100);
            }
          }),

        updateRiskMetrics: (metrics: RiskMetrics) =>
          set((state) => {
            state.riskMetrics = metrics;
          }),

        setPortfolioValue: (value: number) =>
          set((state) => {
            state.portfolioValue = value;
          }),

        // MCP actions
        updateServerStatus: (serverId: string, status: Partial<MCPServerStatus>) =>
          set((state) => {
            const index = state.servers.findIndex(s => s.id === serverId);
            if (index !== -1) {
              Object.assign(state.servers[index], status);
            } else {
              // Add new server if not found
              state.servers.push(status as MCPServerStatus);
            }
          }),

        updateAgentCoordination: (agentState: AgentCoordinationState) =>
          set((state) => {
            state.agentCoordination = agentState;
          }),

        updateWorkflows: (workflows: Partial<WorkflowState>) =>
          set((state) => {
            Object.assign(state.workflows, workflows);
          }),

        setMCPConnectionStatus: (status: MCPState['mcpConnectionStatus']) =>
          set((state) => {
            state.mcpConnectionStatus = status;
          }),

        // Vault actions
        updateIntegration: (integration: VaultIntegration) =>
          set((state) => {
            state.integration = integration;
          }),

        updateDashboardData: (data: VaultDashboardData) =>
          set((state) => {
            state.dashboardData = data;
          }),

        setVaultConnectionStatus: (status: VaultState['vaultConnectionStatus']) =>
          set((state) => {
            state.vaultConnectionStatus = status;
          }),

        // System actions
        updateSystemStatus: (status: SystemStatus) =>
          set((state) => {
            state.status = status;
          }),

        addAlert: (alert: Alert) =>
          set((state) => {
            state.alerts.unshift(alert);
            // Keep only last 50 alerts
            if (state.alerts.length > 50) {
              state.alerts = state.alerts.slice(0, 50);
            }
          }),

        acknowledgeAlert: (alertId: string, userId: string) =>
          set((state) => {
            const alert = state.alerts.find(a => a.id === alertId);
            if (alert) {
              alert.acknowledged = true;
              alert.acknowledged_by = userId;
              alert.acknowledged_at = new Date();
            }
          }),

        dismissAlert: (alertId: string) =>
          set((state) => {
            state.alerts = state.alerts.filter(a => a.id !== alertId);
          }),

        updatePreferences: (preferences: Partial<UserPreferences>) =>
          set((state) => {
            if (state.preferences) {
              Object.assign(state.preferences, preferences);
            } else {
              state.preferences = preferences as UserPreferences;
            }
          }),

        // Real-time actions
        setConnected: (connected: boolean) =>
          set((state) => {
            state.connected = connected;
          }),

        updatePing: (ping: Date, latency: number) =>
          set((state) => {
            state.lastPing = ping;
            state.latency = latency;
          }),

        addSubscription: (topic: string) =>
          set((state) => {
            if (!state.subscriptions.includes(topic)) {
              state.subscriptions.push(topic);
            }
          }),

        removeSubscription: (topic: string) =>
          set((state) => {
            state.subscriptions = state.subscriptions.filter(s => s !== topic);
          }),

        // Async state management
        setAsyncState: (key, asyncState) =>
          set((state) => {
            Object.assign(state.asyncStates[key], asyncState);
          }),

        // Global actions
        reset: () =>
          set((state) => {
            Object.assign(state, {
              ...initialTradingState,
              ...initialMCPState,
              ...initialVaultState,
              ...initialSystemState,
              ...initialRealTimeState,
              asyncStates: initialAsyncStates,
            });
          }),

        initialize: async () => {
          // This will be implemented to load initial data
          console.log('Initializing store...');
        },
      })),
      {
        name: 'cival-dashboard-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist user preferences and some UI state
          preferences: state.preferences,
          subscriptions: state.subscriptions,
        }),
      }
    )
  )
);

// Selectors for common data access patterns
export const useStrategies = () => useAppStore((state) => state.strategies);
export const usePositions = () => useAppStore((state) => state.positions);
export const useOrders = () => useAppStore((state) => state.orders);
export const useMarketData = (symbol?: string) => 
  useAppStore((state) => symbol ? state.marketData[symbol] : state.marketData);
export const useSignals = () => useAppStore((state) => state.signals);
export const useRiskMetrics = () => useAppStore((state) => state.riskMetrics);
export const usePortfolioValue = () => useAppStore((state) => state.portfolioValue);

export const useMCPServers = () => useAppStore((state) => state.servers);
export const useAgentCoordination = () => useAppStore((state) => state.agentCoordination);
export const useWorkflows = () => useAppStore((state) => state.workflows);

export const useVaultIntegration = () => useAppStore((state) => state.integration);
export const useVaultDashboard = () => useAppStore((state) => state.dashboardData);

export const useSystemStatus = () => useAppStore((state) => state.status);
export const useAlerts = () => useAppStore((state) => state.alerts);
export const usePreferences = () => useAppStore((state) => state.preferences);

export const useRealTimeStatus = () => useAppStore((state) => ({
  connected: state.connected,
  lastPing: state.lastPing,
  latency: state.latency,
  subscriptions: state.subscriptions,
}));

export const useAsyncState = <K extends keyof AsyncStates>(key: K) =>
  useAppStore((state) => state.asyncStates[key]); 