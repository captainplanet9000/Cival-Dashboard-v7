import { Server as HttpServer } from 'http';
// TODO: Install socket.io - temporarily disabled
// import { Server, Socket } from 'socket.io';

type Socket = any;
type Server = any;
import { TradingManager } from './trading-manager';
import supabaseService from '../services/supabase-service';

type AgentMessageTypes = 
  | 'agent:register'
  | 'agent:subscribe:market'
  | 'agent:subscribe:signals'
  | 'agent:trade:request'
  | 'agent:status:update'
  | 'agent:error';

interface AgentTradeRequest {
  agentId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  orderType: 'market' | 'limit' | 'stop';
  price?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc';
  strategy?: string;
  reasoning?: string;
}

interface AgentStatusUpdate {
  agentId: string;
  status: 'online' | 'offline' | 'trading' | 'error' | 'waiting';
  error?: string;
  lastAction?: string;
  timestamp: number;
}

export class AgentWebSocketService {
  private io: Server;
  private tradingManager: TradingManager;
  private connectedAgents: Map<string, string> = new Map(); // socketId -> agentId
  private agentSockets: Map<string, string[]> = new Map(); // agentId -> socketIds[]
  private marketDataSubscriptions: Map<string, Set<string>> = new Map(); // symbol -> Set<socketId>
  private signalSubscriptions: Map<string, Set<string>> = new Map(); // strategy -> Set<socketId>
  private isRunning: boolean = false;
  private marketDataInterval: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer, tradingManager: TradingManager) {
    this.tradingManager = tradingManager;
    // TODO: Implement socket.io server when dependency is installed
    this.io = null as any;
    
    // Temporarily disabled until socket.io is properly installed
    // this.setupEventHandlers();
  }

  /**
   * Set up event handlers for WebSocket connections
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log('New connection established:', socket.id);

      // Register agent with the websocket service
      socket.on('agent:register', (data: { agentId: string }) => {
        this.registerAgent(socket, data.agentId);
      });

      // Subscribe to market data for specific symbols
      socket.on('agent:subscribe:market', (symbols: string[]) => {
        this.subscribeToMarketData(socket, symbols);
      });

      // Subscribe to trading signals for specific strategies
      socket.on('agent:subscribe:signals', (strategies: string[]) => {
        this.subscribeToSignals(socket, strategies);
      });

      // Handle trade requests from agents
      socket.on('agent:trade:request', async (request: AgentTradeRequest) => {
        try {
          await this.handleTradeRequest(socket, request);
        } catch (error) {
          console.error('Error handling trade request:', error);
          socket.emit('agent:error', {
            message: 'Failed to process trade request',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          });
        }
      });

      // Handle agent status updates
      socket.on('agent:status:update', (status: AgentStatusUpdate) => {
        this.handleAgentStatusUpdate(socket, status);
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        this.handleDisconnect(socket, reason);
      });

      // Handle errors
      socket.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        socket.emit('agent:error', {
          message: 'WebSocket error occurred',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: Date.now()
        });
      });
    });
  }

  /**
   * Register an agent with the WebSocket service
   */
  private registerAgent(socket: Socket, agentId: string): void {
    console.log(`Agent ${agentId} registered on socket ${socket.id}`);
    
    // Store socket -> agent mapping
    this.connectedAgents.set(socket.id, agentId);
    
    // Store agent -> sockets mapping
    const agentSockets = this.agentSockets.get(agentId) || [];
    agentSockets.push(socket.id);
    this.agentSockets.set(agentId, agentSockets);
    
    // Join agent-specific room
    socket.join(`agent:${agentId}`);
    
    // Notify client of successful registration
    socket.emit('agent:registered', {
      agentId,
      socketId: socket.id,
      timestamp: Date.now()
    });

    // Log agent connection to database
    this.logAgentEvent(agentId, 'connected', { socketId: socket.id });
  }

  /**
   * Subscribe a socket to market data for specific symbols
   */
  private subscribeToMarketData(socket: Socket, symbols: string[]): void {
    const agentId = this.connectedAgents.get(socket.id);
    if (!agentId) {
      socket.emit('agent:error', {
        message: 'Agent not registered',
        error: 'Must register agent before subscribing to market data',
        timestamp: Date.now()
      });
      return;
    }

    console.log(`Agent ${agentId} subscribing to market data for:`, symbols);

    // Join market data rooms for each symbol
    symbols.forEach(symbol => {
      socket.join(`market:${symbol}`);
      
      // Track subscriptions
      const subscribers = this.marketDataSubscriptions.get(symbol) || new Set<string>();
      subscribers.add(socket.id);
      this.marketDataSubscriptions.set(symbol, subscribers);
    });

    // Start market data broadcast if not already running
    this.startMarketDataBroadcast();

    // Notify client of successful subscription
    socket.emit('agent:subscribed:market', {
      symbols,
      timestamp: Date.now()
    });

    // Log subscription to database
    this.logAgentEvent(agentId, 'subscribed_market', { symbols });
  }

  /**
   * Subscribe a socket to trading signals for specific strategies
   */
  private subscribeToSignals(socket: Socket, strategies: string[]): void {
    const agentId = this.connectedAgents.get(socket.id);
    if (!agentId) {
      socket.emit('agent:error', {
        message: 'Agent not registered',
        error: 'Must register agent before subscribing to signals',
        timestamp: Date.now()
      });
      return;
    }

    console.log(`Agent ${agentId} subscribing to signals for:`, strategies);

    // Join signal rooms for each strategy
    strategies.forEach(strategy => {
      socket.join(`signal:${strategy}`);
      
      // Track subscriptions
      const subscribers = this.signalSubscriptions.get(strategy) || new Set<string>();
      subscribers.add(socket.id);
      this.signalSubscriptions.set(strategy, subscribers);
    });

    // Notify client of successful subscription
    socket.emit('agent:subscribed:signals', {
      strategies,
      timestamp: Date.now()
    });

    // Log subscription to database
    this.logAgentEvent(agentId, 'subscribed_signals', { strategies });
  }

  /**
   * Handle a trade request from an agent
   */
  private async handleTradeRequest(socket: Socket, request: AgentTradeRequest): Promise<void> {
    const agentId = this.connectedAgents.get(socket.id);
    if (!agentId) {
      socket.emit('agent:error', {
        message: 'Agent not registered',
        error: 'Must register agent before submitting trade requests',
        timestamp: Date.now()
      });
      return;
    }

    console.log(`Trade request from agent ${agentId}:`, request);

    try {
      // Verify agent permissions
      const permissions = await supabaseService.getAgentTradingPermission(agentId);
      
      if (!permissions || !permissions.is_active) {
        throw new Error('Agent does not have active trading permissions');
      }

      // Check trade size against max allowed
      if (request.quantity * (request.price || 0) > permissions.max_trade_size) {
        throw new Error('Trade size exceeds maximum allowed');
      }

      // Check if symbol is allowed
      const allowedSymbols = permissions.allowed_symbols as string[];
      if (!allowedSymbols.includes(request.symbol)) {
        throw new Error(`Trading ${request.symbol} is not allowed for this agent`);
      }

      // Check if strategy is allowed
      if (request.strategy) {
        const allowedStrategies = permissions.allowed_strategies as string[];
        if (!allowedStrategies.includes(request.strategy)) {
          throw new Error(`Strategy ${request.strategy} is not allowed for this agent`);
        }
      }

      // Execute trade via trading manager
      const result = await this.tradingManager.placeOrder({
        id: `ws-trade-${Date.now()}-${socket.id}`,
        symbol: request.symbol,
        side: request.side,
        type: request.orderType,
        quantity: request.quantity,
        price: request.price,
        stopPrice: request.stopPrice,
        timeInForce: (request.timeInForce === 'gtc' ? 'GTC' : request.timeInForce === 'ioc' ? 'IOC' : 'GTC')
      });

      // Record trade in database
      const tradeRecord = {
        agent_id: agentId,
        trade_id: `trade_${Date.now()}`,
        order_id: result.id,
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        price: request.price || 0,
        order_type: request.orderType,
        strategy: request.strategy || 'default',
        reasoning: request.reasoning || '',
        status: result.status,
        exchange: 'hyperliquid',
        executed_at: new Date().toISOString(),
        confidence_score: 0.5
      };

      await supabaseService.createAgentTrade(tradeRecord);

      // Notify agent of successful trade
      socket.emit('agent:trade:executed', {
        ...result,
        timestamp: Date.now()
      });

      // Broadcast trade to all sockets in the agent's room
      this.io.to(`agent:${agentId}`).emit('agent:trade:update', {
        ...result,
        timestamp: Date.now()
      });

      // Log trade to database
      this.logAgentEvent(agentId, 'trade_executed', { 
        symbol: request.symbol,
        side: request.side,
        quantity: request.quantity,
        orderId: result.id
      });

    } catch (error) {
      console.error('Error processing trade request:', error);
      
      // Notify agent of trade error
      socket.emit('agent:trade:error', {
        original: request,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });

      // Log error to database
      this.logAgentEvent(agentId, 'trade_error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        request
      });
    }
  }

  /**
   * Handle agent status updates
   */
  private handleAgentStatusUpdate(socket: Socket, status: AgentStatusUpdate): void {
    const agentId = this.connectedAgents.get(socket.id);
    if (!agentId) {
      socket.emit('agent:error', {
        message: 'Agent not registered',
        error: 'Must register agent before updating status',
        timestamp: Date.now()
      });
      return;
    }

    console.log(`Status update from agent ${agentId}:`, status);

    // Broadcast status to all sockets in the agent's room
    this.io.to(`agent:${agentId}`).emit('agent:status:updated', {
      ...status,
      timestamp: Date.now()
    });

    // Log status update to database
    this.logAgentEvent(agentId, 'status_update', status);
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: Socket, reason: string): void {
    const agentId = this.connectedAgents.get(socket.id);
    if (agentId) {
      console.log(`Agent ${agentId} disconnected from socket ${socket.id}, reason: ${reason}`);
      
      // Remove socket from agent -> sockets mapping
      const agentSockets = this.agentSockets.get(agentId) || [];
      const updatedSockets = agentSockets.filter(id => id !== socket.id);
      
      if (updatedSockets.length > 0) {
        this.agentSockets.set(agentId, updatedSockets);
      } else {
        this.agentSockets.delete(agentId);
      }

      // Remove socket from market data subscriptions
      this.marketDataSubscriptions.forEach((subscribers, symbol) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.marketDataSubscriptions.delete(symbol);
        } else {
          this.marketDataSubscriptions.set(symbol, subscribers);
        }
      });

      // Remove socket from signal subscriptions
      this.signalSubscriptions.forEach((subscribers, strategy) => {
        subscribers.delete(socket.id);
        if (subscribers.size === 0) {
          this.signalSubscriptions.delete(strategy);
        } else {
          this.signalSubscriptions.set(strategy, subscribers);
        }
      });

      // Remove socket -> agent mapping
      this.connectedAgents.delete(socket.id);

      // Log disconnection to database
      this.logAgentEvent(agentId, 'disconnected', { reason, socketId: socket.id });
    }

    // Stop market data broadcast if no more subscriptions
    if (this.marketDataSubscriptions.size === 0 && this.marketDataInterval) {
      this.stopMarketDataBroadcast();
    }
  }

  /**
   * Start broadcasting market data to subscribed clients
   */
  private startMarketDataBroadcast(): void {
    if (this.isRunning) return;
    
    console.log('Starting market data broadcast');
    this.isRunning = true;
    
    this.marketDataInterval = setInterval(async () => {
      try {
        // Only fetch data for symbols with active subscriptions
        const symbols = Array.from(this.marketDataSubscriptions.keys());
        if (symbols.length === 0) return;

        // Broadcast market data for each symbol to subscribed clients
        for (const symbol of symbols) {
          const data = await this.tradingManager.getMarketData(symbol);
          if (data) {
            this.io.to(`market:${symbol}`).emit('market:update', {
              symbol,
              data,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('Failed to broadcast market data:', error);
      }
    }, 3000); // Broadcast every 3 seconds
  }

  /**
   * Stop broadcasting market data
   */
  private stopMarketDataBroadcast(): void {
    if (!this.isRunning || !this.marketDataInterval) return;
    
    console.log('Stopping market data broadcast');
    clearInterval(this.marketDataInterval);
    this.marketDataInterval = null;
    this.isRunning = false;
  }

  /**
   * Broadcast a trading signal to subscribed clients
   */
  public broadcastTradingSignal(strategy: string, signal: any): void {
    // Broadcast to all sockets subscribed to this strategy
    this.io.to(`signal:${strategy}`).emit('trading:signal', {
      strategy,
      signal,
      timestamp: Date.now()
    });

    // TODO: Fix TradingSignal type and re-enable database logging
    // Log signal to database if needed
    try {
      // supabaseService.createTradingSignal({ ... });
      console.log('Trading signal generated:', signal);
    } catch (error) {
      console.error('Failed to log trading signal:', error);
    }
  }

  /**
   * Notify specific agent of an event
   */
  public notifyAgent(agentId: string, eventType: string, data: any): void {
    this.io.to(`agent:${agentId}`).emit(eventType, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Log agent event to database
   */
  private async logAgentEvent(agentId: string, eventType: string, data: any): Promise<void> {
    try {
      // In a production system, this would log to a database table
      console.log(`[AGENT EVENT] ${agentId} - ${eventType}:`, data);
      
      // Here we would store in Supabase agent_events table if it existed
      // await supabaseService.createAgentEvent({
      //   agent_id: agentId,
      //   event_type: eventType,
      //   details: data,
      // });
    } catch (error) {
      console.error('Failed to log agent event:', error);
    }
  }

  /**
   * Shutdown the WebSocket service
   */
  public async shutdown(): Promise<void> {
    this.stopMarketDataBroadcast();
    
    return new Promise((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}

export default AgentWebSocketService;