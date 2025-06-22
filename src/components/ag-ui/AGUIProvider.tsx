/**
 * AG UI Provider Component
 * Provides AG UI Protocol context to the entire trading dashboard
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AGUIClient, createAGUIClient } from '@/lib/ag-ui/client';
import { AGUIEvent, AGUISession, AGUIAgent } from '@/lib/ag-ui/types';
import { toast } from 'react-hot-toast';

interface AGUIContextType {
  client: AGUIClient | null;
  session: AGUISession | null;
  agents: AGUIAgent[];
  events: AGUIEvent[];
  isConnected: boolean;
  isConnecting: boolean;
  lastError: string | null;
  sendEvent: (event: Partial<AGUIEvent>) => Promise<void>;
  updateState: (key: string, value: any) => void;
  updateContext: (context: Record<string, any>) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AGUIContext = createContext<AGUIContextType | null>(null);

interface AGUIProviderProps {
  children: ReactNode;
  endpoint?: string;
  transport?: 'sse' | 'websocket';
  enabled?: boolean;
}

export function AGUIProvider({ 
  children, 
  endpoint = 'http://localhost:9000/api/v1/agui',
  transport = 'sse',
  enabled = true
}: AGUIProviderProps) {
  const [client, setClient] = useState<AGUIClient | null>(null);
  const [session, setSession] = useState<AGUISession | null>(null);
  const [agents, setAgents] = useState<AGUIAgent[]>([]);
  const [events, setEvents] = useState<AGUIEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Initialize AG UI client
  useEffect(() => {
    if (!enabled) return;

    const agUIClient = createAGUIClient({
      endpoint,
      transport,
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AGUI_TOKEN || ''}`,
        'X-Client-Type': 'trading-dashboard'
      },
      onConnect: () => {
        setIsConnected(true);
        setIsConnecting(false);
        setLastError(null);
        toast.success('AG UI connected - Enhanced agent interaction enabled');
      },
      onDisconnect: () => {
        setIsConnected(false);
        setIsConnecting(false);
        toast.error('AG UI disconnected');
      },
      onError: (error) => {
        setLastError(error.message);
        setIsConnecting(false);
        console.error('AG UI error:', error);
      }
    });

    setClient(agUIClient);

    // Set up event listeners
    agUIClient.on('*', (event: AGUIEvent) => {
      setEvents(prev => [...prev.slice(-99), event]); // Keep last 100 events
      
      // Update session
      const currentSession = agUIClient.getSession();
      if (currentSession) {
        setSession({ ...currentSession });
      }
      
      // Update agents
      setAgents(agUIClient.getAgents());
    });

    // Handle specific event types with notifications
    agUIClient.on('error', (event) => {
      if ('error' in event) {
        toast.error(`Agent Error: ${event.error}`);
      }
    });

    agUIClient.on('trading_signal', (event) => {
      if ('signal' in event) {
        toast.success(`Trading Signal: ${event.signal.action.toUpperCase()} ${event.signal.symbol}`);
      }
    });

    agUIClient.on('confirmation', (event) => {
      if ('message' in event) {
        toast((t) => (
          <div className="flex flex-col gap-2">
            <span>{event.message}</span>
            <div className="flex gap-2">
              {'options' in event && event.options.map((option) => (
                <button
                  key={option.id}
                  className={`px-3 py-1 rounded text-sm ${
                    option.style === 'danger' 
                      ? 'bg-red-500 text-white' 
                      : option.style === 'primary'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                  onClick={() => {
                    agUIClient.sendEvent({
                      type: 'user_action',
                      action: 'confirmation_response',
                      value: option.value,
                      original_event_id: event.id,
                      data: {
                        confirmed: option.value === 'confirm',
                        option_id: option.id,
                        option_label: option.label
                      }
                    });
                    toast.dismiss(t.id);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ), { duration: 10000 });
      }
    });

    return () => {
      agUIClient.disconnect();
    };
  }, [endpoint, transport, enabled]);

  const connect = async () => {
    if (!client || isConnecting) return;
    
    setIsConnecting(true);
    setLastError(null);
    
    try {
      await client.connect();
    } catch (error) {
      setLastError((error as Error).message);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (client) {
      client.disconnect();
    }
  };

  const sendEvent = async (event: Partial<AGUIEvent>) => {
    if (!client) {
      throw new Error('AG UI client not available');
    }
    return client.sendEvent(event);
  };

  const updateState = (key: string, value: any) => {
    if (client) {
      client.updateState(key, value);
    }
  };

  const updateContext = (context: Record<string, any>) => {
    if (client) {
      client.updateContext(context);
    }
  };

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (enabled && client && !isConnected && !isConnecting) {
      connect();
    }
  }, [enabled, client, isConnected, isConnecting]);

  const contextValue: AGUIContextType = {
    client,
    session,
    agents,
    events,
    isConnected,
    isConnecting,
    lastError,
    sendEvent,
    updateState,
    updateContext,
    connect,
    disconnect
  };

  if (!enabled) {
    // Return children without AG UI context if disabled
    return <>{children}</>;
  }

  return (
    <AGUIContext.Provider value={contextValue}>
      {children}
    </AGUIContext.Provider>
  );
}

export function useAGUI() {
  const context = useContext(AGUIContext);
  if (!context) {
    throw new Error('useAGUI must be used within an AGUIProvider');
  }
  return context;
}

export function useAGUIOptional() {
  return useContext(AGUIContext);
}