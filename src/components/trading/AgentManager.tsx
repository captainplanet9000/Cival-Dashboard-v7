/**
 * AI Agent Management and Coordination Interface
 * Manages autonomous trading agents with AG-UI Protocol v2 integration
 */

'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
// Avatar component imported (created during build fix)
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Bot, 
  Brain, 
  Play, 
  Pause, 
  Settings, 
  MessageSquare, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Target,
  Zap,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mic,
  MicOff,
  Send,
  RefreshCw
} from 'lucide-react'

// AG-UI Protocol integration
import { subscribe, emit, type AgentEvents, type TradingEvents } from '@/lib/ag-ui-protocol-v2'

// Agent Types
interface TradingAgent {
  id: string
  name: string
  type: 'momentum' | 'arbitrage' | 'mean_reversion' | 'risk_manager' | 'coordinator'
  status: 'active' | 'inactive' | 'error' | 'paused'
  avatar?: string
  description: string
  
  // Performance Metrics
  performance: {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    totalReturn: number
    totalReturnPercent: number
    avgTradeReturn: number
    maxDrawdown: number
    sharpeRatio: number
    profitFactor: number
  }
  
  // Configuration
  config: {
    enabled: boolean
    maxPositions: number
    maxAllocation: number
    riskLevel: 'low' | 'medium' | 'high'
    strategies: string[]
    symbols: string[]
    timeframes: string[]
  }
  
  // Current State
  currentDecision?: string
  confidence?: number
  lastActivity: number
  allocatedFunds: number
  activePositions: number
  pendingOrders: number
  
  // Communication
  isListening: boolean
  lastMessage?: string
  conversationCount: number
}

interface AgentConversation {
  id: string
  participants: string[]
  topic: string
  messages: AgentMessage[]
  status: 'active' | 'completed' | 'paused'
  consensusReached: boolean
  decision?: any
  timestamp: number
}

interface AgentMessage {
  id: string
  senderId: string
  content: string
  type: 'text' | 'decision' | 'data' | 'question'
  timestamp: number
  metadata?: any
}

interface CoordinationDecision {
  id: string
  type: 'trading' | 'risk' | 'allocation' | 'strategy'
  participants: string[]
  consensus: boolean
  decision: any
  confidence: number
  reasoning: string
  timestamp: number
}

const AGENT_AVATARS = {
  momentum: '🚀',
  arbitrage: '⚡',
  mean_reversion: '🎯',
  risk_manager: '🛡️',
  coordinator: '🧠'
}

const AGENT_COLORS = {
  momentum: 'bg-blue-100 text-blue-800',
  arbitrage: 'bg-yellow-100 text-yellow-800',
  mean_reversion: 'bg-green-100 text-green-800',
  risk_manager: 'bg-red-100 text-red-800',
  coordinator: 'bg-purple-100 text-purple-800'
}

export function AgentManager() {
  // State Management
  const [agents, setAgents] = useState<TradingAgent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<TradingAgent | null>(null)
  const [conversations, setConversations] = useState<AgentConversation[]>([])
  const [decisions, setDecisions] = useState<CoordinationDecision[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Communication State
  const [newMessage, setNewMessage] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isCreatingConversation, setIsCreatingConversation] = useState(false)
  const [newConversationTopic, setNewConversationTopic] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])

  // AG-UI Event Subscriptions
  useEffect(() => {
    // Subscribe to agent events
    const agentDecisionSub = subscribe('agent.decision_made', (event) => {
      const { agent_id, decision } = event.data
      setAgents(prev => prev.map(agent => 
        agent.id === agent_id ? {
          ...agent,
          currentDecision: decision,
          lastActivity: Date.now()
        } : agent
      ))
    })

    const agentStartedSub = subscribe('agent.started', (event) => {
      const { agent_id } = event.data
      setAgents(prev => prev.map(agent => 
        agent.id === agent_id ? { ...agent, status: 'active' } : agent
      ))
    })

    const agentStoppedSub = subscribe('agent.stopped', (event) => {
      const { agent_id, reason } = event.data
      setAgents(prev => prev.map(agent => 
        agent.id === agent_id ? { ...agent, status: 'inactive' } : agent
      ))
    })

    const agentCommunicationSub = subscribe('agent.communication', (event) => {
      const { from_agent, to_agent, message } = event.data
      
      // Add message to appropriate conversation
      setConversations(prev => prev.map(conv => {
        if (conv.participants.includes(from_agent) && conv.participants.includes(to_agent)) {
          return {
            ...conv,
            messages: [...conv.messages, {
              id: `msg-${Date.now()}`,
              senderId: from_agent,
              content: message,
              type: 'text',
              timestamp: Date.now()
            }]
          }
        }
        return conv
      }))
    })

    const consensusSub = subscribe('agent.consensus_reached', (event) => {
      const { decision_id, participants, agreement_level } = event.data
      
      const newDecision: CoordinationDecision = {
        id: decision_id,
        type: 'trading',
        participants,
        consensus: agreement_level > 0.7,
        decision: event.data.decision,
        confidence: agreement_level,
        reasoning: event.data.reasoning || 'Multi-agent consensus reached',
        timestamp: Date.now()
      }
      
      setDecisions(prev => [newDecision, ...prev.slice(0, 9)])
    })

    const performanceSub = subscribe('agent.performance_update', (event) => {
      const { agent_id, metrics } = event.data
      setAgents(prev => prev.map(agent => 
        agent.id === agent_id ? {
          ...agent,
          performance: { ...agent.performance, ...metrics }
        } : agent
      ))
    })

    return () => {
      agentDecisionSub.unsubscribe()
      agentStartedSub.unsubscribe()
      agentStoppedSub.unsubscribe()
      agentCommunicationSub.unsubscribe()
      consensusSub.unsubscribe()
      performanceSub.unsubscribe()
    }
  }, [])

  // Data Fetching
  const fetchAgentData = useCallback(async () => {
    try {
      setIsLoading(true)

      // Fetch agent status
      const agentsResponse = await fetch('/api/agents/status')
      if (agentsResponse.ok) {
        const agentsData = await agentsResponse.json()
        setAgents(agentsData.agents || [])
      }

      // Fetch conversations
      const conversationsResponse = await fetch('/api/agents/conversations')
      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json()
        setConversations(conversationsData.conversations || [])
      }

      // Fetch recent decisions
      const decisionsResponse = await fetch('/api/agents/decisions')
      if (decisionsResponse.ok) {
        const decisionsData = await decisionsResponse.json()
        setDecisions(decisionsData.decisions || [])
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch agent data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Auto refresh effect
  useEffect(() => {
    fetchAgentData()
    const interval = setInterval(fetchAgentData, 15000) // Refresh every 15 seconds
    return () => clearInterval(interval)
  }, [fetchAgentData])

  // Agent Control Functions
  const handleStartAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/start`, { method: 'POST' })
      if (response.ok) {
        emit('agent.started', { agent_id: agentId, timestamp: Date.now() })
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to start agent:', error)
    }
  }

  const handleStopAgent = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' })
      if (response.ok) {
        emit('agent.stopped', { agent_id: agentId, reason: 'Manual stop', timestamp: Date.now() })
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
  }

  const handleUpdateAgentConfig = async (agentId: string, config: any) => {
    try {
      const response = await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (response.ok) {
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to update agent config:', error)
    }
  }

  // Communication Functions
  const handleCreateConversation = async () => {
    if (!newConversationTopic || selectedParticipants.length < 2) return

    try {
      setIsCreatingConversation(true)
      const response = await fetch('/api/agents/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: newConversationTopic,
          participants: selectedParticipants
        })
      })

      if (response.ok) {
        const result = await response.json()
        emit('conversation.create', {
          topic: newConversationTopic,
          participants: selectedParticipants,
          context: {},
          timestamp: Date.now()
        })
        
        setNewConversationTopic('')
        setSelectedParticipants([])
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    } finally {
      setIsCreatingConversation(false)
    }
  }

  const handleSendMessage = async (conversationId: string, message: string) => {
    if (!message.trim()) return

    try {
      const response = await fetch(`/api/agents/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          type: 'text'
        })
      })

      if (response.ok) {
        emit('conversation.send_message', {
          conversation_id: conversationId,
          sender_id: 'human',
          content: message,
          timestamp: Date.now()
        })
        
        setNewMessage('')
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleCoordinateDecision = async (context: any) => {
    try {
      const response = await fetch('/api/agents/coordinate-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })

      if (response.ok) {
        const result = await response.json()
        await fetchAgentData()
      }
    } catch (error) {
      console.error('Failed to coordinate decision:', error)
    }
  }

  // Helper Functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500'
      case 'inactive': return 'text-gray-500'
      case 'error': return 'text-red-500'
      case 'paused': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'inactive': return <XCircle className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'paused': return <Pause className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  const getActiveAgents = () => agents.filter(agent => agent.status === 'active')
  const getTotalReturn = () => agents.reduce((sum, agent) => sum + agent.performance.totalReturn, 0)
  const getAvgWinRate = () => {
    const activeAgents = getActiveAgents()
    return activeAgents.length > 0 ? activeAgents.reduce((sum, agent) => sum + agent.performance.winRate, 0) / activeAgents.length : 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Agent Manager</h2>
          <p className="text-muted-foreground">Autonomous trading agents with multi-agent coordination</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchAgentData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getActiveAgents().length}</div>
            <p className="text-xs text-muted-foreground">
              {agents.length} total agents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getTotalReturn() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(getTotalReturn())}
            </div>
            <p className="text-xs text-muted-foreground">
              All agents combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getAvgWinRate().toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Active agents average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.filter(c => c.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">
              {conversations.length} total conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="coordination">Coordination</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className={AGENT_COLORS[agent.type]}>
                          {AGENT_AVATARS[agent.type]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="flex items-center space-x-2">
                          <Badge variant="outline">{agent.type}</Badge>
                          <div className={`flex items-center space-x-1 ${getStatusColor(agent.status)}`}>
                            {getStatusIcon(agent.status)}
                            <span className="text-sm">{agent.status}</span>
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      {agent.status === 'active' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStopAgent(agent.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartAgent(agent.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Win Rate</div>
                      <div className="font-medium">{agent.performance.winRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Total Return</div>
                      <div className={`font-medium ${agent.performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(agent.performance.totalReturn)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Trades</div>
                      <div className="font-medium">{agent.performance.totalTrades}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Allocation</div>
                      <div className="font-medium">{formatCurrency(agent.allocatedFunds)}</div>
                    </div>
                  </div>

                  {/* Current Activity */}
                  {agent.currentDecision && (
                    <div className="p-3 bg-muted rounded">
                      <div className="text-sm font-medium">Latest Decision:</div>
                      <div className="text-sm text-muted-foreground">{agent.currentDecision}</div>
                      {agent.confidence && (
                        <div className="text-xs mt-1">
                          Confidence: {(agent.confidence * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="flex justify-between text-sm">
                    <span>Active Positions: {agent.activePositions}</span>
                    <span>Pending Orders: {agent.pendingOrders}</span>
                  </div>

                  {/* Configuration Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto Trading</span>
                    <Switch
                      checked={agent.config.enabled}
                      onCheckedChange={(enabled) => 
                        handleUpdateAgentConfig(agent.id, { ...agent.config, enabled })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="coordination" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coordination Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Multi-Agent Coordination</CardTitle>
                <CardDescription>Coordinate decisions across multiple agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => handleCoordinateDecision({ type: 'market_analysis' })}
                  className="w-full"
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Coordinate Market Analysis
                </Button>
                
                <Button
                  onClick={() => handleCoordinateDecision({ type: 'risk_assessment' })}
                  variant="outline"
                  className="w-full"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Coordinate Risk Assessment
                </Button>
                
                <Button
                  onClick={() => handleCoordinateDecision({ type: 'portfolio_rebalance' })}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Coordinate Portfolio Rebalance
                </Button>
              </CardContent>
            </Card>

            {/* Recent Decisions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Coordination Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {decisions.slice(0, 5).map((decision) => (
                    <div key={decision.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant={decision.consensus ? 'default' : 'destructive'}>
                              {decision.consensus ? 'Consensus' : 'No Consensus'}
                            </Badge>
                            <span className="text-sm font-medium">{decision.type}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {decision.reasoning}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Participants: {decision.participants.join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(decision.confidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(decision.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {decisions.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No coordination decisions yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation List */}
            <Card>
              <CardHeader>
                <CardTitle>Active Conversations</CardTitle>
                <CardDescription>Agent-to-agent communications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Input
                      placeholder="Conversation topic"
                      value={newConversationTopic}
                      onChange={(e) => setNewConversationTopic(e.target.value)}
                    />
                    <Select
                      value=""
                      onValueChange={(agentId) => {
                        if (!selectedParticipants.includes(agentId)) {
                          setSelectedParticipants([...selectedParticipants, agentId])
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add participants" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedParticipants.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedParticipants.map(participantId => {
                          const agent = agents.find(a => a.id === participantId)
                          return (
                            <Badge key={participantId} variant="outline">
                              {agent?.name}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-auto p-0"
                                onClick={() => setSelectedParticipants(prev => prev.filter(id => id !== participantId))}
                              >
                                ×
                              </Button>
                            </Badge>
                          )
                        })}
                      </div>
                    )}
                    <Button
                      onClick={handleCreateConversation}
                      disabled={!newConversationTopic || selectedParticipants.length < 2 || isCreatingConversation}
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Start Conversation
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className={`p-2 border rounded cursor-pointer hover:bg-muted ${
                          selectedConversation === conversation.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedConversation(conversation.id)}
                      >
                        <div className="font-medium text-sm">{conversation.topic}</div>
                        <div className="text-xs text-muted-foreground">
                          {conversation.participants.length} participants • {conversation.messages.length} messages
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversation View */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  {selectedConversation 
                    ? conversations.find(c => c.id === selectedConversation)?.topic 
                    : 'Select a conversation'
                  }
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedConversation ? (
                  <div className="space-y-4">
                    {/* Messages */}
                    <div className="h-64 overflow-y-auto space-y-2 border rounded p-3">
                      {conversations
                        .find(c => c.id === selectedConversation)
                        ?.messages.map((message) => {
                          const sender = agents.find(a => a.id === message.senderId)
                          return (
                            <div key={message.id} className="flex items-start space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {sender ? AGENT_AVATARS[sender.type] : '👤'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="text-sm">
                                  <span className="font-medium">{sender?.name || 'Human'}: </span>
                                  {message.content}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    {/* Message Input */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage(selectedConversation, newMessage)
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleSendMessage(selectedConversation, newMessage)}
                        disabled={!newMessage.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a conversation to view messages
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Decision History</CardTitle>
              <CardDescription>Complete history of agent coordination decisions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {decisions.map((decision) => (
                  <div key={decision.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant={decision.consensus ? 'default' : 'destructive'}>
                            {decision.consensus ? 'Consensus Reached' : 'No Consensus'}
                          </Badge>
                          <Badge variant="outline">{decision.type}</Badge>
                          <span className="text-sm font-medium">
                            Confidence: {(decision.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Reasoning:</strong> {decision.reasoning}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Participants:</strong> {decision.participants.join(', ')}
                        </div>
                        {decision.decision && (
                          <div className="text-sm">
                            <strong>Decision:</strong> {JSON.stringify(decision.decision, null, 2)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {new Date(decision.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {decisions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No decisions recorded yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentManager