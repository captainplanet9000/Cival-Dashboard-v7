import React, { useState, useEffect, useCallback } from 'react';
import { Search, Book, FileText, TrendingUp, Brain, Download, Eye, Star, Clock, Filter, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { emitResourceSearch, emitResourceAccessed, emitKnowledgeRecommendation } from '@/lib/ag-ui/knowledge-events';

interface KnowledgeResource {
  resource_id: string;
  title: string;
  description?: string;
  resource_type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
  tags: string[];
  usage_count: number;
  last_accessed?: string;
  summary?: string;
  key_concepts?: string[];
  difficulty_level?: string;
  estimated_read_time?: number;
}

interface SearchFilters {
  resource_types: string[];
  tags: string[];
  difficulty_level?: string;
}

interface AgentRecommendation {
  resource: KnowledgeResource;
  reason: string;
  confidence: number;
  estimated_impact: string;
}

interface AgentKnowledgeInterfaceProps {
  agentId?: string;
  currentGoal?: string;
  className?: string;
}

const RESOURCE_TYPE_ICONS = {
  trading_books: Book,
  sops: FileText,
  strategies: TrendingUp,
  research: Lightbulb,
  training: Brain,
  documentation: FileText,
};

const RESOURCE_TYPE_LABELS = {
  trading_books: 'Trading Books',
  sops: 'SOPs',
  strategies: 'Strategies',
  research: 'Research',
  training: 'Training',
  documentation: 'Documentation',
};

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'bg-red-100 text-red-800',
};

const AgentKnowledgeInterface: React.FC<AgentKnowledgeInterfaceProps> = ({
  agentId = 'default-agent',
  currentGoal,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeResource[]>([]);
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [selectedResource, setSelectedResource] = useState<KnowledgeResource | null>(null);
  const [resourceContent, setResourceContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations' | 'sops' | 'research'>('search');
  const [filters, setFilters] = useState<SearchFilters>({
    resource_types: [],
    tags: [],
  });

  // Load recommendations on mount
  useEffect(() => {
    loadRecommendations();
  }, [agentId, currentGoal]);

  const searchResources = useCallback(async (query: string, includeFilters = true) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      const searchData = {
        query,
        agent_id: agentId,
        max_results: 20,
        include_content: false,
        ...(includeFilters && filters.resource_types.length > 0 && { resource_types: filters.resource_types }),
      };

      const response = await fetch('/api/v1/phase8/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Search failed');
      }

      const result = await response.json();
      setSearchResults(result.results || []);

      // Emit AG-UI event for resource search
      emitResourceSearch({
        query,
        agentId,
        resultsCount: result.results?.length || 0,
        topResult: result.results?.[0] ? {
          id: result.results[0].resource_id,
          title: result.results[0].title,
          type: result.results[0].resource_type,
          relevance_score: 0.9, // Would come from search engine in real implementation
        } : undefined,
      });

      if (result.results?.length === 0) {
        toast('No resources found matching your search');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [agentId, filters]);

  const loadRecommendations = useCallback(async () => {
    setIsLoadingRecommendations(true);

    try {
      const response = await fetch('/api/v1/phase8/knowledge/agent-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentId,
          request_type: 'recommend',
          query: currentGoal || 'performance improvement',
          max_results: 10,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load recommendations');
      }

      const result = await response.json();
      setRecommendations(result.recommendations || []);

      // Emit AG-UI event for recommendations
      if (result.recommendations?.length > 0) {
        emitKnowledgeRecommendation({
          agentId,
          recommendationType: 'performance_improvement',
          recommendations: result.recommendations.map((rec: any) => ({
            resource_id: rec.resource.resource_id,
            title: rec.resource.title,
            reason: rec.reason,
            confidence: rec.confidence,
            estimated_impact: rec.estimated_impact,
          })),
          context: {
            current_goal: currentGoal,
          },
        });
      }
    } catch (error) {
      console.error('Recommendations error:', error);
      toast.error('Failed to load recommendations');
      setRecommendations([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, [agentId, currentGoal]);

  const loadResourceContent = useCallback(async (resource: KnowledgeResource) => {
    setSelectedResource(resource);
    setIsLoadingContent(true);
    setResourceContent('');

    try {
      const response = await fetch(`/api/v1/phase8/knowledge/resource/${resource.resource_id}/content`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load content');
      }

      const result = await response.json();
      setResourceContent(result.content || 'Content not available');

      // Log the access
      await logResourceUsage(resource.resource_id, 'read', 'Content accessed via knowledge interface');

      // Emit AG-UI event for resource access
      emitResourceAccessed({
        resourceId: resource.resource_id,
        resourceTitle: resource.title,
        resourceType: resource.resource_type,
        agentId,
        summary: resource.summary || resource.description,
      });
    } catch (error) {
      console.error('Content loading error:', error);
      toast.error('Failed to load resource content');
      setResourceContent('Error loading content');
    } finally {
      setIsLoadingContent(false);
    }
  }, []);

  const logResourceUsage = async (resourceId: string, usageType: string, context: string) => {
    try {
      await fetch('/api/v1/phase8/knowledge/agent-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agent_id: agentId,
          request_type: 'learn',
          query: resourceId,
        }),
      });
    } catch (error) {
      console.error('Failed to log usage:', error);
    }
  };

  const getContextualSOPs = useCallback(async (strategy?: string, situation?: string) => {
    setIsSearching(true);

    try {
      const params = new URLSearchParams({
        agent_id: agentId,
        ...(strategy && { strategy_type: strategy }),
        ...(situation && { situation: situation }),
        urgency: 'medium',
      });

      const response = await fetch(`/api/v1/phase8/knowledge/sops?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load SOPs');
      }

      const result = await response.json();
      setSearchResults(result.sops || []);
      setActiveTab('sops');
    } catch (error) {
      console.error('SOPs error:', error);
      toast.error('Failed to load SOPs');
    } finally {
      setIsSearching(false);
    }
  }, [agentId]);

  const getMarketResearch = useCallback(async (symbol?: string, timeframe?: string) => {
    setIsSearching(true);

    try {
      const params = new URLSearchParams({
        agent_id: agentId,
        ...(symbol && { symbol }),
        ...(timeframe && { timeframe }),
        research_type: 'all',
        recency: 'latest',
      });

      const response = await fetch(`/api/v1/phase8/knowledge/market-research?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to load research');
      }

      const result = await response.json();
      setSearchResults(result.research_documents || []);
      setActiveTab('research');
    } catch (error) {
      console.error('Research error:', error);
      toast.error('Failed to load market research');
    } finally {
      setIsSearching(false);
    }
  }, [agentId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchResources(searchQuery);
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const ResourceCard = ({ resource, isRecommendation = false, recommendation }: {
    resource: KnowledgeResource;
    isRecommendation?: boolean;
    recommendation?: AgentRecommendation;
  }) => {
    const Icon = RESOURCE_TYPE_ICONS[resource.resource_type];
    
    return (
      <div
        className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
          selectedResource?.resource_id === resource.resource_id 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => loadResourceContent(resource)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <Icon className="w-5 h-5 text-gray-500 mt-1" />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{resource.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {RESOURCE_TYPE_LABELS[resource.resource_type]}
              </p>
            </div>
          </div>
          
          {isRecommendation && recommendation && (
            <div className="flex items-center space-x-1 text-xs text-amber-600">
              <Star className="w-3 h-3" />
              <span>{(recommendation.confidence * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {resource.description && (
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {resource.description}
          </p>
        )}

        {isRecommendation && recommendation && (
          <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
            <strong>Why recommended:</strong> {recommendation.reason}
          </div>
        )}

        {resource.key_concepts && resource.key_concepts.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {resource.key_concepts.slice(0, 3).map((concept, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {concept}
              </span>
            ))}
            {resource.key_concepts.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                +{resource.key_concepts.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{resource.usage_count} views</span>
            </span>
            {resource.last_accessed && (
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTimeAgo(resource.last_accessed)}</span>
              </span>
            )}
            {resource.difficulty_level && (
              <span className={`px-2 py-1 rounded ${DIFFICULTY_COLORS[resource.difficulty_level as keyof typeof DIFFICULTY_COLORS] || 'bg-gray-100 text-gray-700'}`}>
                {resource.difficulty_level}
              </span>
            )}
          </div>
          {resource.estimated_read_time && (
            <span>{resource.estimated_read_time} min read</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Knowledge Center</h2>
          <p className="text-sm text-gray-600">
            Access trading resources, SOPs, and research documents
          </p>
        </div>
        <button
          onClick={loadRecommendations}
          disabled={isLoadingRecommendations}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Refresh recommendations"
        >
          <RefreshCw className={`w-5 h-5 ${isLoadingRecommendations ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'search', label: 'Search', icon: Search },
            { id: 'recommendations', label: 'Recommendations', icon: Star },
            { id: 'sops', label: 'SOPs', icon: FileText },
            { id: 'research', label: 'Research', icon: Lightbulb },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Search/Browse */}
        <div className="lg:col-span-2">
          {activeTab === 'search' && (
            <>
              {/* Search Form */}
              <form onSubmit={handleSearch} className="mb-6">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search trading books, strategies, SOPs..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {/* Search Results */}
              <div className="space-y-4">
                {searchResults.map((resource) => (
                  <ResourceCard key={resource.resource_id} resource={resource} />
                ))}
                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div className="text-center py-8 text-gray-500">
                    No resources found for "{searchQuery}"
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {isLoadingRecommendations ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 text-gray-500">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading recommendations...</span>
                  </div>
                </div>
              ) : recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <ResourceCard
                    key={rec.resource.resource_id}
                    resource={rec.resource}
                    isRecommendation={true}
                    recommendation={rec}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recommendations available
                </div>
              )}
            </div>
          )}

          {activeTab === 'sops' && (
            <>
              <div className="mb-4 flex space-x-2">
                <button
                  onClick={() => getContextualSOPs('momentum', 'risk_management')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Risk Management
                </button>
                <button
                  onClick={() => getContextualSOPs('', 'position_sizing')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Position Sizing
                </button>
                <button
                  onClick={() => getContextualSOPs('', 'emergency_stop')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Emergency Procedures
                </button>
              </div>
              <div className="space-y-4">
                {searchResults.map((resource) => (
                  <ResourceCard key={resource.resource_id} resource={resource} />
                ))}
              </div>
            </>
          )}

          {activeTab === 'research' && (
            <>
              <div className="mb-4 flex space-x-2">
                <button
                  onClick={() => getMarketResearch('BTCUSD', '1d')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  BTC Analysis
                </button>
                <button
                  onClick={() => getMarketResearch('ETHUSD', '1w')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  ETH Weekly
                </button>
                <button
                  onClick={() => getMarketResearch('', '')}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Latest Research
                </button>
              </div>
              <div className="space-y-4">
                {searchResults.map((resource) => (
                  <ResourceCard key={resource.resource_id} resource={resource} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Content Viewer */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <div className="bg-white border border-gray-200 rounded-lg h-96 lg:h-[600px]">
              {selectedResource ? (
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900 truncate">
                      {selectedResource.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {RESOURCE_TYPE_LABELS[selectedResource.resource_type]}
                    </p>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto">
                    {isLoadingContent ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Loading content...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700">
                          {resourceContent}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Book className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Select a resource to view content</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentKnowledgeInterface;