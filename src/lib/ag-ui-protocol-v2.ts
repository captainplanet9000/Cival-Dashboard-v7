/**
 * AG-UI Protocol v2 - Mock Implementation
 * Basic implementation for build compatibility
 */

import { useState, useEffect, useCallback } from 'react'

export interface TradingEvents {
  'portfolio.value_updated': { total_value: number; change_24h: number; change_percentage: number }
  'trade.order_placed': { symbol: string; side: string; order_id: string; quantity?: number; price?: number }
  'trade.order_filled': { symbol: string; side: string; quantity: number; fill_price: number; order_id: string; fees?: number; exchange: string }
  'trade.order_cancelled': { order_id: string; reason?: string }
  'trade.signal_generated': { symbol: string; action: string; confidence: number; timestamp?: number; price?: number; strategy?: string }
  'trade.position_update': { position_id: string; symbol: string; current_value: number; unrealized_pnl: number }
  'trade.executed': any
  'market_data.price_update': { symbol: string; price: number; timestamp?: number; volume?: number }
}

export interface AgentEvents {
  'agent.started': { agent_id: string; timestamp?: number }
  'agent.stopped': { agent_id: string; reason: string; timestamp?: number }
  'agent.decision_made': { agent_id: string; decision: string }
  'agent.communication': { from_agent: string; to_agent: string; message: string }
  'agent.consensus_reached': { decision_id: string; participants: string[]; agreement_level: number; decision?: string; reasoning?: string }
  'agent.performance_update': { agent_id: string; metrics: any }
  'conversation.create': { topic: string; participants: string[]; context: any; timestamp?: number }
  'conversation.send_message': { conversation_id: string; sender_id: string; content: string; timestamp?: number }
}

export interface WalletEvents {
  'portfolio.risk_alert': { message: string; value?: number }
  'portfolio.margin_warning': { utilization: number; threshold: number }
  'system.notification': { type: string; message: string; level: string; timestamp?: number }
  'connection.established': {}
  'connection.lost': {}
}

export interface ComponentEvents {
  // Chart Events
  'chart.crosshair_move': { symbol: string; price: number; time: number; volume?: number }
  'chart.indicator_change': { symbol: string; indicators: string[]; timeframe: string }
  'chart.timeframe_change': { symbol: string; timeframe: string; previous_timeframe: string }
  'chart.zoom_change': { symbol: string; start_time: number; end_time: number }
  'chart.data_updated': { symbol: string; timeframe: string; dataPoints: number; timestamp: number; lastPrice?: number }
  'chart.data_error': { symbol: string; error: string; usingMockData: boolean }
  'chart.symbol_changed': { newSymbol: string; oldSymbol?: string }
  'linked_chart.symbol_selected': { symbol: string; price: number; source: string }
  'linked_chart.crosshair_move': { symbol: string; timestamp: number; open: number; high: number; low: number; close: number; volume?: number; change: number; changePercent: number }
  'linked_chart.data_refreshed': { symbols: string[]; activeSymbol: string }
  
  // Form Events
  'form.auto_form_submit_started': { schemaTitle?: string; fieldCount: number; data: any }
  'form.auto_form_submit_completed': { schemaTitle?: string; success: boolean; data?: any; processingTime?: number }
  'form.auto_form_submit_failed': { schemaTitle?: string; error: string; data?: any }
  'form.field_added': { fieldType: string; fieldKey: string }
  'form.field_removed': { fieldKey: string }
  
  // Calendar Events
  'calendar.event_created': { 
    event_id: string; 
    title: string; 
    start: string; 
    end: string; 
    type: 'earnings_announcement' | 'market_open' | 'market_close' | 'strategy_execution' | 'risk_assessment' | 'portfolio_review' | 'economic_data' | 'fed_meeting' | 'options_expiry' | 'dividend_date' | 'strategy_meeting' | 'backtesting' | 'performance_review' | 'other' | 'market' | 'strategy' | 'agent' | 'custom';
    agent_id?: string;
    strategy_id?: string;
  }
  'calendar.event_updated': { 
    event_id: string; 
    changes: Record<string, any>;
    updated_by?: string;
  }
  'calendar.event_deleted': { event_id: string; deleted_by?: string }
  'calendar.event_selected': { eventId: string; eventType: string; eventTitle: string; eventDate: string }
  'calendar.event_moved': { eventId: string; oldStart: string; newStart: string; oldEnd: string; newEnd: string }
  'calendar.event_resized': { eventId: string; oldStart: string; newStart: string; oldEnd: string; newEnd: string }
  'calendar.view_changed': { view: 'month' | 'week' | 'day' | 'agenda'; date: string }
  
  // Button Events
  'button.trading_action_triggered': { 
    action: 'buy' | 'sell' | 'close' | 'hedge'; 
    symbol: string; 
    amount?: number; 
    confirmation_required: boolean;
  }
  'button.confirmation_shown': { action_id: string; action_type: string; risk_level: 'low' | 'medium' | 'high' }
  'button.action_confirmed': { action_id: string; confirmed_at: number; user_id: string }
  'button.action_cancelled': { action_id: string; cancelled_at: number; reason?: string }
}

type EventName = keyof (TradingEvents & AgentEvents & WalletEvents & ComponentEvents)
type EventData<T extends EventName> = (TradingEvents & AgentEvents & WalletEvents & ComponentEvents)[T]

export interface EventSubscription {
  unsubscribe: () => void
}

export function subscribe<T extends EventName>(
  eventName: T, 
  callback: (event: { data: EventData<T> }) => void
): EventSubscription {
  // Mock implementation
  return {
    unsubscribe: () => {}
  }
}

export function emit<T extends EventName>(eventName: T, data: EventData<T>): void {
  // Enhanced mock implementation with logging
  console.log(`[AG-UI Protocol v2] Event emitted: ${eventName}`, data);
  
  // Simulate event broadcasting to subscribers
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`agui:${eventName}`, { detail: data }));
  }
}

// Enhanced event publishing for component-specific events
export function publishComponentEvent<T extends keyof ComponentEvents>(
  eventName: T, 
  data: ComponentEvents[T]
): void {
  emit(eventName as EventName, data as EventData<EventName>);
}

// Batch event publishing for performance
export function publishBatch(events: Array<{ name: EventName; data: any }>): void {
  events.forEach(({ name, data }) => emit(name, data));
}

export interface AGUIEventBus {
  initialize: () => Promise<void>;
  subscribe: <T extends EventName>(eventName: T, callback: (data: EventData<T>) => void) => EventSubscription;
  emit: <T extends EventName>(eventName: T, data: EventData<T>) => void;
  getSubscriberCount: (eventName: EventName) => number;
  clearAllSubscriptions: () => void;
}

// Enhanced event bus with real functionality
const eventListeners = new Map<string, Set<Function>>();

export function getAGUIEventBus(): AGUIEventBus {
  return {
    initialize: async () => {
      console.log('[AG-UI Protocol v2] Event bus initialized');
    },
    
    subscribe: <T extends EventName>(
      eventName: T, 
      callback: (data: EventData<T>) => void
    ): EventSubscription => {
      if (!eventListeners.has(eventName)) {
        eventListeners.set(eventName, new Set());
      }
      
      const listeners = eventListeners.get(eventName)!;
      listeners.add(callback);
      
      // Also subscribe to browser events
      if (typeof window !== 'undefined') {
        const browserCallback = (event: Event) => {
          const customEvent = event as CustomEvent;
          callback(customEvent.detail);
        };
        window.addEventListener(`agui:${eventName}`, browserCallback);
        
        return {
          unsubscribe: () => {
            listeners.delete(callback);
            window.removeEventListener(`agui:${eventName}`, browserCallback);
          }
        };
      }
      
      return {
        unsubscribe: () => listeners.delete(callback)
      };
    },
    
    emit: <T extends EventName>(eventName: T, data: EventData<T>) => {
      const listeners = eventListeners.get(eventName);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`[AG-UI Protocol v2] Error in event listener for ${eventName}:`, error);
          }
        });
      }
      
      // Also emit browser event
      emit(eventName, data);
    },
    
    getSubscriberCount: (eventName: EventName) => {
      return eventListeners.get(eventName)?.size || 0;
    },
    
    clearAllSubscriptions: () => {
      eventListeners.clear();
    }
  };
}

// React hook for AG-UI Protocol v2
export function useAGUIProtocol() {
  const [eventBus] = useState(() => getAGUIEventBus());
  const [isConnected, setIsConnected] = useState(false);
  const [subscriberCounts, setSubscriberCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize the event bus
    eventBus.initialize().then(() => {
      setIsConnected(true);
    });

    return () => {
      eventBus.clearAllSubscriptions();
      setIsConnected(false);
    };
  }, [eventBus]);

  const subscribe = useCallback(<T extends EventName>(
    eventName: T,
    callback: (data: EventData<T>) => void
  ) => {
    const subscription = eventBus.subscribe(eventName, callback);
    
    // Update subscriber count
    setSubscriberCounts(prev => ({
      ...prev,
      [eventName]: eventBus.getSubscriberCount(eventName)
    }));

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
        setSubscriberCounts(prev => ({
          ...prev,
          [eventName]: eventBus.getSubscriberCount(eventName)
        }));
      }
    };
  }, [eventBus]);

  const emit = useCallback(<T extends EventName>(
    eventName: T,
    data: EventData<T>
  ) => {
    eventBus.emit(eventName, data);
  }, [eventBus]);

  const publishComponentEvent = useCallback(<T extends keyof ComponentEvents>(
    eventName: T,
    data: ComponentEvents[T]
  ) => {
    emit(eventName as EventName, data as EventData<EventName>);
  }, [emit]);

  // Alias for backward compatibility
  const publishEvent = emit;
  const subscribeToEvent = subscribe;

  return {
    isConnected,
    subscriberCounts,
    subscribe,
    subscribeToEvent,
    emit,
    publishEvent,
    publishComponentEvent,
    getSubscriberCount: eventBus.getSubscriberCount,
    clearAllSubscriptions: eventBus.clearAllSubscriptions
  };
}