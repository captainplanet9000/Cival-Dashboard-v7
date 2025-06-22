/**
 * AG UI Protocol Client Implementation
 * Handles communication between trading dashboard and AI agents
 */

import { AGUIEvent, AGUIClientConfig, AGUISession, AGUIAgent } from './types';

export class AGUIClient {
  private config: AGUIClientConfig;
  private eventSource: EventSource | null = null;
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<string, Set<(event: AGUIEvent) => void>> = new Map();
  private session: AGUISession | null = null;
  
  constructor(config: AGUIClientConfig) {
    this.config = config;
  }

  /**
   * Connect to the AG UI agent backend
   */
  async connect(): Promise<void> {
    try {
      if (this.config.transport === 'websocket') {
        await this.connectWebSocket();
      } else {
        await this.connectSSE();
      }
      
      this.config.onConnect?.();
      this.reconnectAttempts = 0;
      
      // Initialize session
      this.session = {
        id: this.generateSessionId(),
        agents: [],
        events: [],
        state: {},
        context: {},
        startTime: new Date(),
        lastActivity: new Date()
      };
      
    } catch (error) {
      console.error('AG UI connection failed:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from the AG UI backend
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.config.onDisconnect?.();
  }

  /**
   * Send an event to the AG UI backend
   */
  async sendEvent(event: Partial<AGUIEvent>): Promise<void> {
    const fullEvent: AGUIEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      source: 'human',
      ...event
    } as AGUIEvent;

    try {
      if (this.config.transport === 'websocket' && this.websocket) {
        this.websocket.send(JSON.stringify(fullEvent));
      } else {
        // HTTP POST for SSE transport
        const sessionId = this.session?.id || 'default';
        await fetch(`${this.config.endpoint}/session/${sessionId}/event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers
          },
          body: JSON.stringify(fullEvent)
        });
      }
      
      // Add to session events
      if (this.session) {
        this.session.events.push(fullEvent);
        this.session.lastActivity = new Date();
      }
      
    } catch (error) {
      console.error('Failed to send AG UI event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to specific event types
   */
  on(eventType: string, handler: (event: AGUIEvent) => void): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Unsubscribe from event types
   */
  off(eventType: string, handler: (event: AGUIEvent) => void): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Get current session information
   */
  getSession(): AGUISession | null {
    return this.session;
  }

  /**
   * Get available agents
   */
  getAgents(): AGUIAgent[] {
    return this.session?.agents || [];
  }

  /**
   * Update session state
   */
  updateState(key: string, value: any): void {
    if (this.session) {
      this.session.state[key] = value;
      this.sendEvent({
        type: 'state',
        key,
        value,
        action: 'set'
      });
    }
  }

  /**
   * Update session context
   */
  updateContext(context: Record<string, any>): void {
    if (this.session) {
      this.session.context = { ...this.session.context, ...context };
      this.sendEvent({
        type: 'context',
        context: this.session.context
      });
    }
  }

  // Private Methods

  private async connectSSE(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create session first
      const sessionId = this.generateSessionId();
      this.eventSource = new EventSource(`${this.config.endpoint}/session/${sessionId}/events`, {
        withCredentials: false
      });

      this.eventSource.onopen = () => {
        console.log('AG UI SSE connection established');
        resolve();
      };

      this.eventSource.onerror = (error) => {
        console.error('AG UI SSE error:', error);
        if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          reject(new Error('AG UI SSE connection failed'));
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const agEvent: AGUIEvent = JSON.parse(event.data);
          this.handleEvent(agEvent);
        } catch (error) {
          console.error('Failed to parse AG UI event:', error);
        }
      };
    });
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.endpoint.replace('http', 'ws') + '/ws';
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('AG UI WebSocket connection established');
        resolve();
      };

      this.websocket.onerror = (error) => {
        console.error('AG UI WebSocket error:', error);
        reject(new Error('AG UI WebSocket connection failed'));
      };

      this.websocket.onclose = () => {
        if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.websocket.onmessage = (event) => {
        try {
          const agEvent: AGUIEvent = JSON.parse(event.data);
          this.handleEvent(agEvent);
        } catch (error) {
          console.error('Failed to parse AG UI WebSocket event:', error);
        }
      };
    });
  }

  private handleEvent(event: AGUIEvent): void {
    // Add to session events
    if (this.session) {
      this.session.events.push(event);
      this.session.lastActivity = new Date();
    }

    // Trigger specific event handlers
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in AG UI event handler for ${event.type}:`, error);
        }
      });
    }

    // Trigger wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in AG UI wildcard event handler:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`AG UI scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('AG UI reconnect failed:', error);
      });
    }, delay);
  }

  private generateSessionId(): string {
    return `agui-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `agui-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance for the trading dashboard
let agUIClient: AGUIClient | null = null;

export function createAGUIClient(config: AGUIClientConfig): AGUIClient {
  if (agUIClient) {
    agUIClient.disconnect();
  }
  
  agUIClient = new AGUIClient(config);
  return agUIClient;
}

export function getAGUIClient(): AGUIClient | null {
  return agUIClient;
}

export function disconnectAGUI(): void {
  if (agUIClient) {
    agUIClient.disconnect();
    agUIClient = null;
  }
}