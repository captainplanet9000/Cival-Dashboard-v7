/**
 * WebSocket Client for Real-time Data
 * Provides WebSocket connection management and real-time data handling
 */

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;
export type WebSocketErrorHandler = (error: Event) => void;
export type WebSocketConnectionHandler = () => void;

export class TradingWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionallyClosed = false;
  
  // Event handlers
  private messageHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private errorHandlers: WebSocketErrorHandler[] = [];
  private connectHandlers: WebSocketConnectionHandler[] = [];
  private disconnectHandlers: WebSocketConnectionHandler[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      ...config
    };
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false;
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected to:', this.config.url);
          this.reconnectCount = 0;
          this.startHeartbeat();
          this.connectHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.cleanup();
          this.disconnectHandlers.forEach(handler => handler());
          
          if (!this.isIntentionallyClosed && this.shouldReconnect()) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // Message handling
  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(message.type) || [];
    const allHandlers = this.messageHandlers.get('*') || [];
    
    [...handlers, ...allHandlers].forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  // Send message
  send(type: string, data: any = {}): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({
          type,
          data,
          timestamp: new Date().toISOString()
        }));
        return true;
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        return false;
      }
    }
    return false;
  }

  // Event subscription
  on(messageType: string, handler: WebSocketEventHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, []);
    }
    this.messageHandlers.get(messageType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  onError(handler: WebSocketErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) {
        this.errorHandlers.splice(index, 1);
      }
    };
  }

  onConnect(handler: WebSocketConnectionHandler): () => void {
    this.connectHandlers.push(handler);
    return () => {
      const index = this.connectHandlers.indexOf(handler);
      if (index > -1) {
        this.connectHandlers.splice(index, 1);
      }
    };
  }

  onDisconnect(handler: WebSocketConnectionHandler): () => void {
    this.disconnectHandlers.push(handler);
    return () => {
      const index = this.disconnectHandlers.indexOf(handler);
      if (index > -1) {
        this.disconnectHandlers.splice(index, 1);
      }
    };
  }

  // Utility methods
  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval && this.config.heartbeatInterval > 0) {
      this.heartbeatTimer = setInterval(() => {
        this.send('ping');
      }, this.config.heartbeatInterval);
    }
  }

  private shouldReconnect(): boolean {
    return this.reconnectCount < (this.config.reconnectAttempts || 5);
  }

  private scheduleReconnect(): void {
    this.reconnectCount++;
    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectCount - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectCount})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  // Getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'disconnected';
      default: return 'unknown';
    }
  }
}

// Default instance
let defaultClient: TradingWebSocketClient | null = null;

export function createWebSocketClient(config?: Partial<WebSocketConfig>): TradingWebSocketClient {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const wsUrl = backendUrl.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
  
  return new TradingWebSocketClient({
    url: wsUrl,
    ...config
  });
}

export function getDefaultWebSocketClient(): TradingWebSocketClient {
  if (!defaultClient) {
    defaultClient = createWebSocketClient();
  }
  return defaultClient;
}

export { TradingWebSocketClient as WebSocketClient };