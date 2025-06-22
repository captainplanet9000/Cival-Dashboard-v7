/**
 * AG UI Enhanced Chat Component
 * Advanced chat interface with AG UI Protocol integration
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAGUIOptional } from './AGUIProvider';
import { AGUIEvent } from '@/lib/ag-ui/types';
import { 
  Brain, 
  Send, 
  Loader2, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Activity,
  Settings,
  Users,
  MessageSquare
} from 'lucide-react';

interface AGUIChatProps {
  title?: string;
  placeholder?: string;
  className?: string;
  showAgents?: boolean;
  showThinking?: boolean;
  autoScroll?: boolean;
}

export function AGUIChat({
  title = "AI Agent Chat",
  placeholder = "Ask about market analysis, trading strategies, or risk assessment...",
  className = "",
  showAgents = true,
  showThinking = true,
  autoScroll = true
}: AGUIChatProps) {
  const agui = useAGUIOptional();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agui?.events, autoScroll]);

  const handleSendMessage = async () => {
    if (!input.trim() || !agui || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Send user message
      await agui.sendEvent({
        type: 'text',
        content: input,
        role: 'user'
      });

      // Update context with current trading state
      agui.updateContext({
        timestamp: new Date().toISOString(),
        user_query: input,
        dashboard_state: {
          active_tab: 'ai',
          portfolio_value: 125847,
          active_strategies: 4
        }
      });

      setInput('');
    } catch (error) {
      console.error('Failed to send AG UI message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderEvent = (event: AGUIEvent) => {
    const baseClasses = "p-3 rounded-lg mb-3 max-w-4xl";
    
    switch (event.type) {
      case 'text':
        if ('role' in event) {
          return (
            <div key={event.id} className={`${baseClasses} ${
              event.role === 'user' 
                ? 'bg-blue-50 border-l-4 border-blue-500 ml-auto' 
                : 'bg-gray-50 border-l-4 border-gray-500'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {event.role === 'user' ? (
                  <Users className="h-4 w-4 text-blue-500" />
                ) : (
                  <Brain className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-sm font-medium capitalize">{event.role}</span>
                <span className="text-xs text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap">{event.content}</div>
            </div>
          );
        }
        break;

      case 'thinking':
        if (showThinking && 'content' in event && 'visible' in event && event.visible) {
          return (
            <div key={event.id} className={`${baseClasses} bg-yellow-50 border-l-4 border-yellow-400`}>
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
                <span className="text-sm font-medium">Agent Thinking</span>
              </div>
              <div className="text-sm text-gray-600">{event.content}</div>
            </div>
          );
        }
        break;

      case 'tool_call':
        if ('tool_name' in event && 'status' in event) {
          return (
            <div key={event.id} className={`${baseClasses} bg-purple-50 border-l-4 border-purple-400`}>
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Tool Call: {event.tool_name}</span>
                <Badge variant={
                  event.status === 'completed' ? 'default' :
                  event.status === 'failed' ? 'destructive' :
                  event.status === 'running' ? 'secondary' : 'outline'
                }>
                  {event.status}
                </Badge>
              </div>
              {event.status === 'running' && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Executing...</span>
                </div>
              )}
              {'arguments' in event && (
                <div className="mt-2 text-xs bg-gray-100 p-2 rounded">
                  <strong>Arguments:</strong> {JSON.stringify(event.arguments, null, 2)}
                </div>
              )}
              {'result' in event && event.result && (
                <div className="mt-2 text-xs bg-green-100 p-2 rounded">
                  <strong>Result:</strong> {JSON.stringify(event.result, null, 2)}
                </div>
              )}
            </div>
          );
        }
        break;

      case 'trading_signal':
        if ('signal' in event) {
          return (
            <div key={event.id} className={`${baseClasses} bg-green-50 border-l-4 border-green-500`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Trading Signal</span>
                <Badge variant={
                  event.signal.action === 'buy' ? 'default' :
                  event.signal.action === 'sell' ? 'destructive' : 'secondary'
                }>
                  {event.signal.action.toUpperCase()}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Symbol:</span>
                  <div className="font-semibold">{event.signal.symbol}</div>
                </div>
                <div>
                  <span className="text-gray-500">Price:</span>
                  <div className="font-semibold">${event.signal.price}</div>
                </div>
                <div>
                  <span className="text-gray-500">Confidence:</span>
                  <div className="font-semibold">{(event.signal.confidence * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <span className="text-gray-500">Risk:</span>
                  <div className="font-semibold capitalize">{event.signal.risk_level}</div>
                </div>
              </div>
              {event.signal.reasoning.length > 0 && (
                <div className="mt-3">
                  <span className="text-sm font-medium text-gray-700">Reasoning:</span>
                  <ul className="mt-1 text-sm text-gray-600">
                    {event.signal.reasoning.map((reason, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }
        break;

      case 'market_analysis':
        if ('analysis' in event) {
          return (
            <div key={event.id} className={`${baseClasses} bg-blue-50 border-l-4 border-blue-500`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Market Analysis</span>
                <Badge variant="outline">{event.analysis.sentiment.toUpperCase()}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Symbol:</span>
                  <div className="font-semibold">{event.analysis.symbol}</div>
                </div>
                <div>
                  <span className="text-gray-500">Timeframe:</span>
                  <div className="font-semibold">{event.analysis.timeframe}</div>
                </div>
                <div>
                  <span className="text-gray-500">Support Levels:</span>
                  <div className="font-semibold">
                    {event.analysis.key_levels.support.map(level => `$${level}`).join(', ')}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Resistance Levels:</span>
                  <div className="font-semibold">
                    {event.analysis.key_levels.resistance.map(level => `$${level}`).join(', ')}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-sm font-medium text-gray-700">Summary:</span>
                <p className="mt-1 text-sm text-gray-600">{event.analysis.summary}</p>
              </div>
            </div>
          );
        }
        break;

      case 'progress':
        if ('current' in event && 'total' in event) {
          return (
            <div key={event.id} className={`${baseClasses} bg-gray-50 border-l-4 border-gray-400`}>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {'stage' in event ? event.stage : 'Processing'}
                </span>
              </div>
              <Progress value={(event.current / event.total) * 100} className="mb-2" />
              <div className="text-sm text-gray-600">
                {event.current} of {event.total} completed
                {'message' in event && event.message && ` - ${event.message}`}
              </div>
            </div>
          );
        }
        break;

      case 'error':
        if ('error' in event) {
          return (
            <div key={event.id} className={`${baseClasses} bg-red-50 border-l-4 border-red-500`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Error</span>
                {'recoverable' in event && (
                  <Badge variant={event.recoverable ? 'secondary' : 'destructive'}>
                    {event.recoverable ? 'Recoverable' : 'Critical'}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-red-700">{event.error}</div>
            </div>
          );
        }
        break;

      default:
        return (
          <div key={event.id} className={`${baseClasses} bg-gray-100 border-l-4 border-gray-300`}>
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Event: {event.type}</span>
            </div>
            <pre className="text-xs text-gray-600 overflow-x-auto">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {agui && (
              <>
                <Badge variant={agui.isConnected ? 'default' : 'destructive'}>
                  {agui.isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                {showAgents && agui.agents.length > 0 && (
                  <Badge variant="outline">
                    {agui.agents.length} Agent{agui.agents.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Messages */}
        <div className="h-96 overflow-y-auto mb-4 p-2 border rounded bg-white">
          {agui?.events.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Start a conversation with the AI agents</p>
                <p className="text-xs text-gray-400 mt-1">
                  {agui?.isConnected ? 'AG UI Protocol connected' : 'AG UI Protocol disconnected'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {agui?.events.map(renderEvent)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="flex-1 p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isProcessing || !agui?.isConnected}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!input.trim() || isProcessing || !agui?.isConnected}
            className="px-4"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status */}
        {agui && !agui.isConnected && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span>AG UI Protocol not connected. Enhanced agent features unavailable.</span>
              <Button size="sm" variant="outline" onClick={agui.connect}>
                Reconnect
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}