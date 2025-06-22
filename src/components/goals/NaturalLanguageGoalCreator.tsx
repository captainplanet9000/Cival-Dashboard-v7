import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader, Brain, Target, Calendar, TrendingUp, AlertCircle, CheckCircle, Lightbulb, Users, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { emitGoalCreated, emitGoalManagement } from '@/lib/ag-ui/knowledge-events';

interface GoalAnalysis {
  goal_type: string;
  target_value: number;
  timeframe: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  confidence_score: number;
  feasibility_assessment: string;
  success_criteria: string[];
  constraints: string[];
  risk_factors: string[];
  recommended_strategies: string[];
  required_knowledge: string[];
}

interface CreatedGoal {
  goal_id: string;
  goal_name: string;
  goal_type: string;
  description: string;
  target_value: number;
  progress_percentage: number;
  status: string;
  complexity: string;
  created_at: string;
  assigned_agents: string[];
  knowledge_resources: string[];
}

interface NaturalLanguageGoalCreatorProps {
  onGoalCreated?: (goal: CreatedGoal) => void;
  className?: string;
}

const EXAMPLE_INPUTS = [
  "I want to make $10,000 profit this month using momentum trading strategies",
  "Help me achieve a 75% win rate on my crypto trades in the next 3 weeks",
  "I need to improve my risk management and reduce drawdowns by 50%",
  "Create a goal to learn technical analysis and implement it in my trading",
  "I want to execute 100 successful trades with an average profit of $250 each",
];

const COMPLEXITY_COLORS = {
  simple: 'text-green-600 bg-green-50 border-green-200',
  moderate: 'text-blue-600 bg-blue-50 border-blue-200',
  complex: 'text-orange-600 bg-orange-50 border-orange-200',
  advanced: 'text-red-600 bg-red-50 border-red-200',
};

const COMPLEXITY_LABELS = {
  simple: 'Simple',
  moderate: 'Moderate',
  complex: 'Complex',
  advanced: 'Advanced',
};

const NaturalLanguageGoalCreator: React.FC<NaturalLanguageGoalCreatorProps> = ({
  onGoalCreated,
  className = '',
}) => {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [preferences, setPreferences] = useState({
    llm_provider: 'openai',
    auto_assign_agents: true,
    auto_assign_resources: true,
    enable_predictions: true,
    enable_optimization: true,
    collaboration_type: 'individual',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const analyzeGoal = useCallback(async (inputText: string) => {
    if (!inputText.trim()) {
      toast.error('Please enter a goal description');
      return;
    }

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const response = await fetch('/api/v1/phase8/goals/analyze-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          input_text: inputText,
          llm_provider: preferences.llm_provider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysis(result.analysis);

      // Emit AG-UI event for goal analysis
      emitGoalManagement({
        action: 'analyze',
        agentId: 'goal_analyzer',
        naturalLanguageInput: inputText,
        aiAnalysis: {
          confidence_score: result.analysis.confidence_score,
          feasibility: result.analysis.feasibility_assessment,
          success_criteria: result.analysis.success_criteria,
          risk_factors: result.analysis.risk_factors,
        },
      });

      toast.success('Goal analysis completed! Review the details below.');
    } catch (error) {
      console.error('Goal analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [preferences.llm_provider]);

  const createGoal = useCallback(async () => {
    if (!analysis) {
      toast.error('Please analyze the goal first');
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/phase8/goals/create-natural', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          natural_language_input: input,
          creation_method: 'natural_language',
          llm_provider: preferences.llm_provider,
          enable_ai_analysis: true,
          enable_predictions: preferences.enable_predictions,
          enable_optimization: preferences.enable_optimization,
          auto_assign_agents: preferences.auto_assign_agents,
          auto_assign_resources: preferences.auto_assign_resources,
          collaboration_type: preferences.collaboration_type,
          user_context: {},
          trading_context: {},
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Goal creation failed');
      }

      const result = await response.json();
      const createdGoal = result.goal;

      // Emit AG-UI event for goal creation
      if (analysis) {
        emitGoalCreated({
          goalId: createdGoal.goal_id,
          goalName: createdGoal.goal_name,
          goalType: createdGoal.goal_type,
          targetValue: createdGoal.target_value,
          complexity: createdGoal.complexity,
          naturalLanguageInput: input,
          aiAnalysis: {
            confidence_score: analysis.confidence_score,
            feasibility: analysis.feasibility_assessment,
            success_criteria: analysis.success_criteria,
            risk_factors: analysis.risk_factors,
          },
          agentId: 'user',
        });
      }

      toast.success(`Goal created successfully: ${createdGoal.goal_name}`);

      // Reset form
      setInput('');
      setAnalysis(null);
      setShowAdvancedOptions(false);

      // Notify parent
      if (onGoalCreated) {
        onGoalCreated(createdGoal);
      }
    } catch (error) {
      console.error('Goal creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsCreating(false);
    }
  }, [input, analysis, preferences, onGoalCreated]);

  const useExampleInput = (example: string) => {
    setInput(example);
    setAnalysis(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      analyzeGoal(input);
    }
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Goal Creator</h2>
        <p className="text-gray-600">
          Describe your trading goal in natural language and let AI create a comprehensive plan
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Describe your trading goal
          </label>
          
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Example: I want to make $10,000 profit this month using momentum trading strategies..."
              className="w-full min-h-[120px] p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAnalyzing || isCreating}
            />
            
            <div className="absolute bottom-3 right-3 flex items-center space-x-2">
              <span className="text-xs text-gray-400">
                Ctrl + Enter to analyze
              </span>
              <button
                onClick={() => analyzeGoal(input)}
                disabled={!input.trim() || isAnalyzing || isCreating}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAnalyzing ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Example Inputs */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_INPUTS.map((example, index) => (
                <button
                  key={index}
                  onClick={() => useExampleInput(example)}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                  disabled={isAnalyzing || isCreating}
                >
                  {example.length > 50 ? `${example.substring(0, 50)}...` : example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="border-t border-gray-200">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="w-full p-4 text-left text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
          </button>
          
          {showAdvancedOptions && (
            <div className="p-6 pt-0 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Provider
                  </label>
                  <select
                    value={preferences.llm_provider}
                    onChange={(e) => setPreferences(prev => ({ ...prev, llm_provider: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="openai">OpenAI GPT-4</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Collaboration Type
                  </label>
                  <select
                    value={preferences.collaboration_type}
                    onChange={(e) => setPreferences(prev => ({ ...prev, collaboration_type: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Team</option>
                    <option value="farm">Farm</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.auto_assign_agents}
                      onChange={(e) => setPreferences(prev => ({ ...prev, auto_assign_agents: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Auto-assign agents</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.auto_assign_resources}
                      onChange={(e) => setPreferences(prev => ({ ...prev, auto_assign_resources: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Auto-assign knowledge resources</span>
                  </label>
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.enable_predictions}
                      onChange={(e) => setPreferences(prev => ({ ...prev, enable_predictions: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable AI predictions</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.enable_optimization}
                      onChange={(e) => setPreferences(prev => ({ ...prev, enable_optimization: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Enable optimization suggestions</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis Results</h3>
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${COMPLEXITY_COLORS[analysis.complexity]}`}>
                {COMPLEXITY_LABELS[analysis.complexity]} Goal
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Goal Overview */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium text-gray-900">Goal Overview</h4>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium capitalize">{analysis.goal_type.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target:</span>
                      <span className="ml-2 font-medium">${analysis.target_value.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Timeframe:</span>
                      <span className="ml-2 font-medium">{analysis.timeframe}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Confidence:</span>
                      <span className="ml-2 font-medium">{(analysis.confidence_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Feasibility Assessment</h5>
                  <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
                    {analysis.feasibility_assessment}
                  </p>
                </div>
              </div>

              {/* Success Criteria & Strategies */}
              <div className="space-y-4">
                {analysis.success_criteria.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <h5 className="font-medium text-gray-900">Success Criteria</h5>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {analysis.success_criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-green-500 mt-1">•</span>
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.recommended_strategies.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      <h5 className="font-medium text-gray-900">Recommended Strategies</h5>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {analysis.recommended_strategies.map((strategy, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.risk_factors.length > 0 && (
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                      <h5 className="font-medium text-gray-900">Risk Factors</h5>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {analysis.risk_factors.map((risk, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-orange-500 mt-1">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Required Knowledge */}
            {analysis.required_knowledge.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-3">
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <h5 className="font-medium text-gray-900">Required Knowledge</h5>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.required_knowledge.map((knowledge, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
                    >
                      {knowledge}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Create Goal Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={createGoal}
                disabled={isCreating}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating Goal...</span>
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4" />
                    <span>Create Goal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaturalLanguageGoalCreator;