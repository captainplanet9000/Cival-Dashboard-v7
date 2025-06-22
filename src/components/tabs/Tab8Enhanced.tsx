'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Target, BookOpen, TrendingUp, Users, Zap, BarChart3, Settings, RefreshCw, Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import our new components
import NaturalLanguageGoalCreator from '../goals/NaturalLanguageGoalCreator';
import TradingResourceDropzone from '../knowledge/TradingResourceDropzone';
import AgentKnowledgeInterface from '../knowledge/AgentKnowledgeInterface';

interface SystemStatus {
  phase8_status: string;
  services: {
    enhanced_goals: any;
    farm_knowledge: any;
  };
  user_metrics: {
    active_goals: number;
    available_resources: number;
    llm_enabled: boolean;
    knowledge_integration: boolean;
  };
  system_capabilities: string[];
}

interface ActiveGoal {
  goal_id: string;
  name: string;
  type: string;
  status: string;
  progress_percentage: number;
  current_value: number;
  target_value: number;
  created_at: string;
  assigned_agents: string[];
  knowledge_resources: string[];
}

const Tab8Enhanced: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'goals' | 'knowledge' | 'agents' | 'analytics'>('overview');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [activeGoals, setActiveGoals] = useState<ActiveGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load system status and overview data
  const loadSystemOverview = useCallback(async () => {
    try {
      const [statusResponse, goalsResponse] = await Promise.all([
        fetch('/api/v1/phase8/status/overview', { credentials: 'include' }),
        fetch('/api/v1/phase8/goals/active', { credentials: 'include' })
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.overview);
      }

      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        setActiveGoals(goalsData.active_goals || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load system overview:', error);
      toast.error('Failed to load system overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    loadSystemOverview();
    const interval = setInterval(loadSystemOverview, 30000);
    return () => clearInterval(interval);
  }, [loadSystemOverview]);

  const handleGoalCreated = useCallback((goal: any) => {
    setActiveGoals(prev => [...prev, goal]);
    setActiveSubTab('overview'); // Switch to overview to see the new goal
    toast.success('Goal created and added to your active goals!');
  }, []);

  const handleResourcesUploaded = useCallback((resources: any[]) => {
    toast.success(`${resources.length} resources uploaded successfully!`);
    // Refresh system status to show updated resource count
    loadSystemOverview();
  }, [loadSystemOverview]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'in_progress':
      case 'active':
        return 'text-blue-600 bg-blue-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const subTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'goals', label: 'Goal Creator', icon: Target },
    { id: 'knowledge', label: 'Knowledge Center', icon: BookOpen },
    { id: 'agents', label: 'Agent Access', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading Phase 8 System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="w-7 h-7 text-blue-600 mr-3" />
            Phase 8: Intelligent Goal Management + Farm Knowledge
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered goal creation, knowledge management, and agent coordination
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <button
            onClick={() => loadSystemOverview()}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {subTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSubTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeSubTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'overview' && (
          <div className="space-y-6">
            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <p className={`text-lg font-semibold capitalize px-2 py-1 rounded-md ${
                      systemStatus ? getStatusColor(systemStatus.phase8_status) : 'text-gray-600 bg-gray-50'
                    }`}>
                      {systemStatus?.phase8_status || 'Unknown'}
                    </p>
                  </div>
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Goals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {systemStatus?.user_metrics.active_goals || 0}
                    </p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Knowledge Resources</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {systemStatus?.user_metrics.available_resources || 0}
                    </p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Integration</p>
                    <p className={`text-lg font-semibold ${
                      systemStatus?.user_metrics.llm_enabled ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {systemStatus?.user_metrics.llm_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Brain className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Active Goals */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Active Goals</h3>
                  <button
                    onClick={() => setActiveSubTab('goals')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Goal</span>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activeGoals.length > 0 ? (
                  <div className="space-y-4">
                    {activeGoals.map((goal) => (
                      <div key={goal.goal_id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">{goal.name}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
                            {goal.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                          <div>
                            <span className="text-sm text-gray-600">Progress:</span>
                            <div className="flex items-center space-x-2 mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {goal.progress_percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-sm text-gray-600">Current / Target:</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              ${goal.current_value.toLocaleString()} / ${goal.target_value.toLocaleString()}
                            </p>
                          </div>
                          
                          <div>
                            <span className="text-sm text-gray-600">Created:</span>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                              {formatTimeAgo(goal.created_at)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>{goal.assigned_agents.length} agents</span>
                            <span>{goal.knowledge_resources.length} resources</span>
                          </div>
                          <span className="capitalize">{goal.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No active goals yet</p>
                    <button
                      onClick={() => setActiveSubTab('goals')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Goal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* System Capabilities */}
            {systemStatus?.system_capabilities && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">System Capabilities</h3>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {systemStatus.system_capabilities.map((capability, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm text-gray-700">{capability}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'goals' && (
          <div className="max-w-4xl mx-auto">
            <NaturalLanguageGoalCreator onGoalCreated={handleGoalCreated} />
          </div>
        )}

        {activeSubTab === 'knowledge' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Trading Resources</h3>
              <TradingResourceDropzone 
                onResourcesUploaded={handleResourcesUploaded}
                maxFiles={10}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse Knowledge Base</h3>
              <AgentKnowledgeInterface />
            </div>
          </div>
        )}

        {activeSubTab === 'agents' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Knowledge Access</h3>
            <p className="text-gray-600 mb-6">
              This interface shows how agents access and interact with the knowledge system.
            </p>
            <AgentKnowledgeInterface agentId="demo-agent" currentGoal="Improve trading performance" />
          </div>
        )}

        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Analytics</h3>
              <p className="text-gray-600 mb-6">
                Comprehensive analytics for goal performance and knowledge utilization.
              </p>
              
              {/* Service Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Enhanced Goals Service</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        systemStatus?.services.enhanced_goals?.status === 'running' 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {systemStatus?.services.enhanced_goals?.status || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">LLM Integration:</span>
                      <span className={`font-medium ${
                        systemStatus?.services.enhanced_goals?.llm_enabled 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {systemStatus?.services.enhanced_goals?.llm_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Farm Knowledge Service</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${
                        systemStatus?.services.farm_knowledge?.status === 'running' 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {systemStatus?.services.farm_knowledge?.status || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processing:</span>
                      <span className={`font-medium ${
                        systemStatus?.services.farm_knowledge?.processing_enabled 
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {systemStatus?.services.farm_knowledge?.processing_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Analytics Dashboard Coming Soon</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    Advanced analytics for goal performance, agent efficiency, and knowledge utilization will be available in the next update.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tab8Enhanced;