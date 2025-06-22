/**
 * Knowledge Events Integration for AG-UI Protocol
 * Connects Phase 8 features with AG-UI event system
 */

import { getAGUIClient } from './client';
import { 
  AGUIEvent,
  AGUIKnowledgeAccessEvent, 
  AGUIGoalManagementEvent, 
  AGUILearningProgressEvent,
  AGUIKnowledgeRecommendationEvent,
  AGUIResourceUploadEvent 
} from './types';

export class KnowledgeEventEmitter {
  private static instance: KnowledgeEventEmitter;
  
  static getInstance(): KnowledgeEventEmitter {
    if (!KnowledgeEventEmitter.instance) {
      KnowledgeEventEmitter.instance = new KnowledgeEventEmitter();
    }
    return KnowledgeEventEmitter.instance;
  }

  /**
   * Emit knowledge access event when agents search or access resources
   */
  emitKnowledgeAccess(params: {
    action: 'search' | 'access' | 'recommend' | 'learn';
    agentId: string;
    query?: string;
    resource?: {
      id: string;
      title: string;
      type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
      summary?: string;
      relevance_score?: number;
    };
    resultsCount?: number;
  }): void {
    const client = getAGUIClient();
    if (!client) return;

    const event: Partial<AGUIKnowledgeAccessEvent> = {
      type: 'knowledge_access',
      action: params.action,
      agent_id: params.agentId,
      query: params.query,
      resource: params.resource,
      results_count: params.resultsCount,
      metadata: {
        timestamp: new Date().toISOString(),
        source_system: 'phase8_knowledge'
      }
    };

    client.sendEvent(event);
  }

  /**
   * Emit goal management event for goal creation, updates, and completion
   */
  emitGoalManagement(params: {
    action: 'create' | 'update' | 'complete' | 'analyze' | 'recommend';
    agentId: string;
    goal?: {
      id: string;
      name: string;
      type: string;
      progress: number;
      target_value: number;
      current_value: number;
      complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    };
    naturalLanguageInput?: string;
    aiAnalysis?: {
      confidence_score: number;
      feasibility: string;
      success_criteria: string[];
      risk_factors: string[];
    };
  }): void {
    const client = getAGUIClient();
    if (!client) return;

    const event: Partial<AGUIGoalManagementEvent> = {
      type: 'goal_management',
      action: params.action,
      agent_id: params.agentId,
      goal: params.goal,
      natural_language_input: params.naturalLanguageInput,
      ai_analysis: params.aiAnalysis,
      metadata: {
        timestamp: new Date().toISOString(),
        source_system: 'phase8_goals'
      }
    };

    client.sendEvent(event);
  }

  /**
   * Emit learning progress event for agent skill development
   */
  emitLearningProgress(params: {
    agentId: string;
    skillArea: string;
    progress: {
      current_level: 'beginner' | 'intermediate' | 'advanced';
      completion_percentage: number;
      resources_completed: number;
      time_spent_minutes: number;
    };
    recommendations: Array<{
      resource_id: string;
      title: string;
      reason: string;
      estimated_time: number;
    }>;
  }): void {
    const client = getAGUIClient();
    if (!client) return;

    const event: Partial<AGUILearningProgressEvent> = {
      type: 'learning_progress',
      agent_id: params.agentId,
      skill_area: params.skillArea,
      progress: params.progress,
      recommendations: params.recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        source_system: 'phase8_learning'
      }
    };

    client.sendEvent(event);
  }

  /**
   * Emit knowledge recommendation event for AI-powered suggestions
   */
  emitKnowledgeRecommendation(params: {
    agentId: string;
    recommendationType: 'skill_gap' | 'performance_improvement' | 'goal_related' | 'trending';
    recommendations: Array<{
      resource_id: string;
      title: string;
      reason: string;
      confidence: number;
      estimated_impact: string;
    }>;
    context?: {
      current_goal?: string;
      performance_issues?: string[];
      skill_gaps?: string[];
    };
  }): void {
    const client = getAGUIClient();
    if (!client) return;

    const event: Partial<AGUIKnowledgeRecommendationEvent> = {
      type: 'knowledge_recommendation',
      agent_id: params.agentId,
      recommendation_type: params.recommendationType,
      recommendations: params.recommendations,
      context: params.context,
      metadata: {
        timestamp: new Date().toISOString(),
        source_system: 'phase8_recommendations'
      }
    };

    client.sendEvent(event);
  }

  /**
   * Emit resource upload event for file uploads and processing
   */
  emitResourceUpload(params: {
    action: 'upload_started' | 'upload_completed' | 'upload_failed' | 'processing_started' | 'processing_completed';
    resource: {
      id: string;
      title: string;
      type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
      size: number;
      status: 'uploading' | 'processing' | 'completed' | 'error';
    };
    uploadedBy: string;
    progress?: number;
    error?: string;
  }): void {
    const client = getAGUIClient();
    if (!client) return;

    const event: Partial<AGUIResourceUploadEvent> = {
      type: 'resource_upload',
      action: params.action,
      resource: params.resource,
      uploaded_by: params.uploadedBy,
      progress: params.progress,
      error: params.error,
      metadata: {
        timestamp: new Date().toISOString(),
        source_system: 'phase8_uploads'
      }
    };

    client.sendEvent(event);
  }

  /**
   * Subscribe to knowledge-related events
   */
  onKnowledgeAccess(handler: (event: AGUIKnowledgeAccessEvent) => void): void {
    const client = getAGUIClient();
    if (client) {
      client.on('knowledge_access', (event: AGUIEvent) => handler(event as AGUIKnowledgeAccessEvent));
    }
  }

  onGoalManagement(handler: (event: AGUIGoalManagementEvent) => void): void {
    const client = getAGUIClient();
    if (client) {
      client.on('goal_management', (event: AGUIEvent) => handler(event as AGUIGoalManagementEvent));
    }
  }

  onLearningProgress(handler: (event: AGUILearningProgressEvent) => void): void {
    const client = getAGUIClient();
    if (client) {
      client.on('learning_progress', (event: AGUIEvent) => handler(event as AGUILearningProgressEvent));
    }
  }

  onKnowledgeRecommendation(handler: (event: AGUIKnowledgeRecommendationEvent) => void): void {
    const client = getAGUIClient();
    if (client) {
      client.on('knowledge_recommendation', (event: AGUIEvent) => handler(event as AGUIKnowledgeRecommendationEvent));
    }
  }

  onResourceUpload(handler: (event: AGUIResourceUploadEvent) => void): void {
    const client = getAGUIClient();
    if (client) {
      client.on('resource_upload', (event: AGUIEvent) => handler(event as AGUIResourceUploadEvent));
    }
  }

  /**
   * Convenience method to emit goal creation with full context
   */
  emitGoalCreated(params: {
    goalId: string;
    goalName: string;
    goalType: string;
    targetValue: number;
    complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
    naturalLanguageInput: string;
    aiAnalysis: {
      confidence_score: number;
      feasibility: string;
      success_criteria: string[];
      risk_factors: string[];
    };
    agentId?: string;
  }): void {
    this.emitGoalManagement({
      action: 'create',
      agentId: params.agentId || 'user',
      goal: {
        id: params.goalId,
        name: params.goalName,
        type: params.goalType,
        progress: 0,
        target_value: params.targetValue,
        current_value: 0,
        complexity: params.complexity,
      },
      naturalLanguageInput: params.naturalLanguageInput,
      aiAnalysis: params.aiAnalysis,
    });
  }

  /**
   * Convenience method to emit resource search with context
   */
  emitResourceSearch(params: {
    query: string;
    agentId: string;
    resultsCount: number;
    topResult?: {
      id: string;
      title: string;
      type: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
      relevance_score: number;
    };
  }): void {
    this.emitKnowledgeAccess({
      action: 'search',
      agentId: params.agentId,
      query: params.query,
      resultsCount: params.resultsCount,
      resource: params.topResult,
    });
  }

  /**
   * Convenience method to emit resource access
   */
  emitResourceAccessed(params: {
    resourceId: string;
    resourceTitle: string;
    resourceType: 'trading_books' | 'sops' | 'strategies' | 'research' | 'training' | 'documentation';
    agentId: string;
    summary?: string;
  }): void {
    this.emitKnowledgeAccess({
      action: 'access',
      agentId: params.agentId,
      resource: {
        id: params.resourceId,
        title: params.resourceTitle,
        type: params.resourceType,
        summary: params.summary,
      },
    });
  }
}

// Export singleton instance
export const knowledgeEvents = KnowledgeEventEmitter.getInstance();

// Export convenience functions
export const emitKnowledgeAccess = knowledgeEvents.emitKnowledgeAccess.bind(knowledgeEvents);
export const emitGoalManagement = knowledgeEvents.emitGoalManagement.bind(knowledgeEvents);
export const emitLearningProgress = knowledgeEvents.emitLearningProgress.bind(knowledgeEvents);
export const emitKnowledgeRecommendation = knowledgeEvents.emitKnowledgeRecommendation.bind(knowledgeEvents);
export const emitResourceUpload = knowledgeEvents.emitResourceUpload.bind(knowledgeEvents);
export const emitGoalCreated = knowledgeEvents.emitGoalCreated.bind(knowledgeEvents);
export const emitResourceSearch = knowledgeEvents.emitResourceSearch.bind(knowledgeEvents);
export const emitResourceAccessed = knowledgeEvents.emitResourceAccessed.bind(knowledgeEvents);