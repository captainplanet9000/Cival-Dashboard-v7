import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MarketData, TradingSignal, Position, Order, StrategyInstance, PaperTradingAccount, BacktestResult, TradingAlert } from '@/types/trading';
import { MCPServerStatus, AgentCoordinationState, WorkflowState, MCPToolCall, MCPEvent } from '@/types/mcp';
import { VaultAccount, Transaction, FundingWorkflow, VaultIntegration } from '@/types/vault';
import { Alert, Notification, SystemStatus, UserPreferences, ConnectionState } from '@/types/common';

interface AppStore {
  // Trading State
  marketData: MarketData[];
  selectedSymbol: string;
  timeframe: string;
  positions: Position[];
  orders: Order[];
  signals: TradingSignal[];
  strategies: StrategyInstance[];
  paperAccounts: PaperTradingAccount[];
  selectedAccount: string;
  backtestResults: BacktestResult[];
  totalPnL: number;
  dailyPnL: number;
  winRate: number;
  tradingAlerts: TradingAlert[];

  // MCP State
  servers: MCPServerStatus[];
  coordinationState: AgentCoordinationState;
  workflowState: WorkflowState;
  activeCalls: MCPToolCall[];
  callHistory: MCPToolCall[];
  events: MCPEvent[];
  connectionState: ConnectionState;

  // Vault State
  accounts: VaultAccount[];
  vaultSelectedAccount: string;
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  fundingWorkflows: FundingWorkflow[];
  integration: VaultIntegration;

  // UI State
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  alerts: Alert[];
  notifications: Notification[];
  systemStatus: SystemStatus;
  userPreferences: UserPreferences;
  openModalId: string | null;
  modalData: any;
  loading: Record<string, boolean>;

  // Enhanced Component State
  chartState: {
    activeSymbol: string;
    timeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
    indicators: string[];
    crosshairData: any;
    chartType: 'candlestick' | 'area' | 'line';
    volume: boolean;
  };
  
  calendarEvents: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'earnings_announcement' | 'market_open' | 'market_close' | 'strategy_execution' | 'risk_assessment' | 'portfolio_review' | 'economic_data' | 'fed_meeting' | 'options_expiry' | 'dividend_date' | 'strategy_meeting' | 'backtesting' | 'performance_review' | 'other' | 'market' | 'strategy' | 'agent' | 'custom';
    status: 'draft' | 'scheduled' | 'in_progress' | 'active' | 'completed' | 'cancelled' | 'delayed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
    agentId?: string;
    strategyId?: string;
    allDay?: boolean;
    metadata?: Record<string, any>;
  }>;
  
  uploadQueue: Array<{
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    error?: string;
  }>;
  
  mentionableAgents: Array<{
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline' | 'busy';
    avatar?: string;
  }>;
  
  activeConversations: Array<{
    id: string;
    participants: string[];
    lastMessage: string;
    lastActivity: Date;
    unreadCount: number;
  }>;
  // Trading Actions
  setMarketData: (data: MarketData[]) => void;
  addPosition: (position: Position) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  addSignal: (signal: TradingSignal) => void;
  setSelectedSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: string) => void;
  addTradingAlert: (alert: TradingAlert) => void;
  acknowledgeAlert: (id: string) => void;

  // MCP Actions
  updateServerStatus: (serverId: string, status: Partial<MCPServerStatus>) => void;
  addToolCall: (call: MCPToolCall) => void;
  updateToolCall: (id: string, updates: Partial<MCPToolCall>) => void;
  addEvent: (event: MCPEvent) => void;
  updateConnectionState: (state: Partial<ConnectionState>) => void;

  // Vault Actions
  addAccount: (account: VaultAccount) => void;
  updateAccount: (id: string, updates: Partial<VaultAccount>) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  addFundingWorkflow: (workflow: FundingWorkflow) => void;
  updateWorkflow: (id: string, updates: Partial<FundingWorkflow>) => void;
  setVaultSelectedAccount: (accountId: string) => void;

  // UI Actions
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleSidebar: () => void;
  addAlert: (alert: Alert) => void;
  dismissAlert: (id: string) => void;
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  updateSystemStatus: (status: Partial<SystemStatus>) => void;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void;
  showModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
  setLoading: (key: string, loading: boolean) => void;

  // Enhanced Component Actions
  updateChartState: (updates: Partial<AppStore['chartState']>) => void;
  addCalendarEvent: (event: AppStore['calendarEvents'][0]) => void;
  updateCalendarEvent: (id: string, updates: Partial<AppStore['calendarEvents'][0]>) => void;
  updateCalendarEvents: (events: AppStore['calendarEvents']) => void;
  deleteCalendarEvent: (id: string) => void;
  addUpload: (upload: AppStore['uploadQueue'][0]) => void;
  updateUpload: (id: string, updates: Partial<AppStore['uploadQueue'][0]>) => void;
  removeUpload: (id: string) => void;
  setMentionableAgents: (agents: AppStore['mentionableAgents']) => void;
  addConversation: (conversation: AppStore['activeConversations'][0]) => void;
  updateConversation: (id: string, updates: Partial<AppStore['activeConversations'][0]>) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Trading State
      marketData: [],
      selectedSymbol: 'AAPL',
      timeframe: '1h',
      positions: [],
      orders: [],
      signals: [],
      strategies: [],
      paperAccounts: [],
      selectedAccount: '',
      backtestResults: [],
      totalPnL: 0,
      dailyPnL: 0,
      winRate: 0,
      tradingAlerts: [],

      // MCP State
      servers: [],
      coordinationState: {
        active_agents: 0,
        total_agents: 0,
        queued_tasks: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        average_task_time: 0,
        resource_utilization: {
          cpu_usage: 0,
          memory_usage: 0,
          agent_pools: []
        },
        communication_metrics: {
          messages_per_minute: 0,
          average_latency: 0,
          failed_communications: 0
        }
      },
      workflowState: {
        active_workflows: [],
        scheduled_workflows: [],
        workflow_templates: [],
        execution_history: []
      },
      activeCalls: [],
      callHistory: [],
      events: [],
      connectionState: {
        status: 'disconnected',
        last_connected: new Date(),
        reconnect_attempts: 0,
        latency: 0
      },

      // Vault State
      accounts: [],
      vaultSelectedAccount: '',
      transactions: [],
      pendingTransactions: [],
      fundingWorkflows: [],
      integration: {
        connection_status: 'disconnected',
        api_health: {
          status: 'down',
          response_time: 0,
          error_rate: 0,
          last_check: new Date()
        },
        accounts_summary: {
          total_accounts: 0,
          total_balance: 0,
          available_balance: 0,
          reserved_balance: 0,
          currency_breakdown: {}
        },
        recent_transactions: [],
        pending_workflows: [],
        compliance_alerts: [],
        system_limits: {
          daily_transaction_limit: 0,
          daily_volume_limit: 0,
          concurrent_transactions_limit: 0,
          api_rate_limit: 0
        }
      },

      // Enhanced Component State
      chartState: {
        activeSymbol: 'BTC-USD',
        timeframe: '1h',
        indicators: [],
        crosshairData: null,
        chartType: 'candlestick',
        volume: true
      },
      
      calendarEvents: [],
      uploadQueue: [],
      mentionableAgents: [],
      activeConversations: [],

      // UI State
      theme: 'dark',
      sidebarCollapsed: false,
      alerts: [],
      notifications: [],
      systemStatus: {
        overall_status: 'operational',
        last_updated: new Date(),
        components: [],
        incidents: [],
        maintenance_windows: [],
        performance_metrics: {
          avg_response_time: 0,
          request_throughput: 0,
          error_rate: 0,
          active_users: 0,
          total_trades_today: 0,
          total_volume_today: 0,
          peak_memory_usage: 0,
          peak_cpu_usage: 0,
          database_connections: 0,
          cache_hit_rate: 0
        },
        uptime_stats: {
          current_uptime: '0 days',
          uptime_percentage_24h: 100,
          uptime_percentage_7d: 100,
          uptime_percentage_30d: 100,
          uptime_percentage_90d: 100,
          mttr: 0,
          mtbf: 0
        }
      },
      userPreferences: {
        user_id: 'default',
        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        notifications: {
          trade_executions: true,
          risk_alerts: true,
          system_updates: true,
          daily_reports: true,
          weekly_reports: true,
          price_alerts: true,
          compliance_alerts: true,
          channels: {
            in_app: true,
            email: true,
            sms: false,
            push: true
          },
          quiet_hours: {
            enabled: false,
            start_time: '22:00',
            end_time: '08:00',
            timezone: 'UTC'
          }
        },
        trading: {
          default_order_type: 'limit',
          default_time_in_force: 'gtc',
          confirm_orders: true,
          show_advanced_options: false,
          default_chart_timeframe: '1h',
          auto_refresh_interval: 5000,
          sound_alerts: true,
          position_size_warnings: true,
          risk_warnings: true
        },
        dashboard: {
          default_layout: 'standard',
          widget_settings: {},
          refresh_interval: 5000,
          auto_save_layout: true,
          compact_mode: false,
          show_tooltips: true,
          animation_speed: 'normal'
        },
        privacy: {
          analytics_tracking: true,
          performance_tracking: true,
          crash_reporting: true,
          usage_statistics: true,
          marketing_communications: false,
          data_retention_period: 90,
          data_export_format: 'json'
        },
        updated_at: new Date()
      },
      openModalId: null,
      modalData: null,
      loading: {},

      // Trading Actions
      setMarketData: (data: MarketData[]) => set({ marketData: data }),
      
      addPosition: (position: Position) => set((state) => ({
        positions: [...state.positions, position]
      })),
      
      updatePosition: (id: string, updates: Partial<Position>) => set((state) => ({
        positions: state.positions.map(p => p.id === id ? { ...p, ...updates } : p)
      })),
      
      addOrder: (order: Order) => set((state) => ({
        orders: [...state.orders, order]
      })),
      
      updateOrder: (id: string, updates: Partial<Order>) => set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, ...updates } : o)
      })),
      
      addSignal: (signal: TradingSignal) => set((state) => ({
        signals: [...state.signals, signal]
      })),
      
      setSelectedSymbol: (symbol: string) => set({ selectedSymbol: symbol }),
      setTimeframe: (timeframe: string) => set({ timeframe }),
      
      addTradingAlert: (alert: TradingAlert) => set((state) => ({
        tradingAlerts: [...state.tradingAlerts, alert]
      })),
      
      acknowledgeAlert: (id: string) => set((state) => ({
        tradingAlerts: state.tradingAlerts.map(a => 
          a.id === id ? { ...a, acknowledged: true, acknowledged_at: new Date() } : a
        )
      })),

      // MCP Actions
      updateServerStatus: (serverId: string, status: Partial<MCPServerStatus>) => set((state) => ({
        servers: state.servers.map(s => s.id === serverId ? { ...s, ...status } : s)
      })),
      
      addToolCall: (call: MCPToolCall) => set((state) => ({
        activeCalls: [...state.activeCalls, call],
        callHistory: [...state.callHistory, call]
      })),
      
      updateToolCall: (id: string, updates: Partial<MCPToolCall>) => set((state) => ({
        activeCalls: state.activeCalls.map(c => c.id === id ? { ...c, ...updates } : c),
        callHistory: state.callHistory.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      
      addEvent: (event: MCPEvent) => set((state) => ({
        events: [event, ...state.events].slice(0, 1000) // Keep last 1000 events
      })),
      
      updateConnectionState: (connectionState: Partial<ConnectionState>) => set((state) => ({
        connectionState: { ...state.connectionState, ...connectionState }
      })),

      // Vault Actions
      addAccount: (account: VaultAccount) => set((state) => ({
        accounts: [...state.accounts, account]
      })),
      
      updateAccount: (id: string, updates: Partial<VaultAccount>) => set((state) => ({
        accounts: state.accounts.map(a => a.id === id ? { ...a, ...updates } : a)
      })),
      
      addTransaction: (transaction: Transaction) => set((state) => ({
        transactions: [transaction, ...state.transactions]
      })),
      
      updateTransaction: (id: string, updates: Partial<Transaction>) => set((state) => ({
        transactions: state.transactions.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      addFundingWorkflow: (workflow: FundingWorkflow) => set((state) => ({
        fundingWorkflows: [...state.fundingWorkflows, workflow]
      })),
      
      updateWorkflow: (id: string, updates: Partial<FundingWorkflow>) => set((state) => ({
        fundingWorkflows: state.fundingWorkflows.map(w => w.id === id ? { ...w, ...updates } : w)
      })),
      
      setVaultSelectedAccount: (accountId: string) => set({ vaultSelectedAccount: accountId }),

      // UI Actions
      setTheme: (theme: 'light' | 'dark' | 'auto') => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      
      addAlert: (alert: Alert) => set((state) => ({
        alerts: [alert, ...state.alerts]
      })),
      
      dismissAlert: (id: string) => set((state) => ({
        alerts: state.alerts.filter(a => a.id !== id)
      })),
      
      addNotification: (notification: Notification) => set((state) => ({
        notifications: [notification, ...state.notifications]
      })),
      
      markNotificationRead: (id: string) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, status: 'read', read_at: new Date() } : n
        )
      })),
      
      updateSystemStatus: (status: Partial<SystemStatus>) => set((state) => ({
        systemStatus: { ...state.systemStatus, ...status }
      })),
      
      updateUserPreferences: (preferences: Partial<UserPreferences>) => set((state) => ({
        userPreferences: { ...state.userPreferences, ...preferences, updated_at: new Date() }
      })),
      
      showModal: (modalId: string, data?: any) => set({ openModalId: modalId, modalData: data }),
      closeModal: () => set({ openModalId: null, modalData: null }),
      
      setLoading: (key: string, loading: boolean) => set((state) => ({
        loading: { ...state.loading, [key]: loading }
      })),

      // Enhanced Component Actions
      updateChartState: (updates: Partial<AppStore['chartState']>) => set((state) => ({
        chartState: { ...state.chartState, ...updates }
      })),

      addCalendarEvent: (event: AppStore['calendarEvents'][0]) => set((state) => ({
        calendarEvents: [...state.calendarEvents, event]
      })),

      updateCalendarEvent: (id: string, updates: Partial<AppStore['calendarEvents'][0]>) => set((state) => ({
        calendarEvents: state.calendarEvents.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      updateCalendarEvents: (events: AppStore['calendarEvents']) => set(() => ({
        calendarEvents: events
      })),

      deleteCalendarEvent: (id: string) => set((state) => ({
        calendarEvents: state.calendarEvents.filter(e => e.id !== id)
      })),

      addUpload: (upload: AppStore['uploadQueue'][0]) => set((state) => ({
        uploadQueue: [...state.uploadQueue, upload]
      })),

      updateUpload: (id: string, updates: Partial<AppStore['uploadQueue'][0]>) => set((state) => ({
        uploadQueue: state.uploadQueue.map(u => u.id === id ? { ...u, ...updates } : u)
      })),

      removeUpload: (id: string) => set((state) => ({
        uploadQueue: state.uploadQueue.filter(u => u.id !== id)
      })),

      setMentionableAgents: (agents: AppStore['mentionableAgents']) => set({
        mentionableAgents: agents
      }),

      addConversation: (conversation: AppStore['activeConversations'][0]) => set((state) => ({
        activeConversations: [...state.activeConversations, conversation]
      })),

      updateConversation: (id: string, updates: Partial<AppStore['activeConversations'][0]>) => set((state) => ({
        activeConversations: state.activeConversations.map(c => c.id === id ? { ...c, ...updates } : c)
      }))
    }),
    {
      name: 'cival-dashboard-storage',
      partialize: (state) => ({
        // Persist only essential state
        selectedSymbol: state.selectedSymbol,
        timeframe: state.timeframe,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        userPreferences: state.userPreferences,
        selectedAccount: state.selectedAccount,
        vaultSelectedAccount: state.vaultSelectedAccount,
        chartState: state.chartState,
        calendarEvents: state.calendarEvents,
        mentionableAgents: state.mentionableAgents
      })
    }
  )
); 