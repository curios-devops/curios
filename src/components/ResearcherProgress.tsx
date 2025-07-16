import React, { useEffect, useState } from 'react';
import { Brain, Search, FileText, Sparkles, Users, Activity } from 'lucide-react';

interface AgentInfo {
  name: string;
  status: 'idle' | 'active' | 'completed' | 'failed';
  currentTask?: string;
  progress?: number;
}

interface ResearcherProgressProps {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  isComplete: boolean;
  searchTerms?: string[];
  sources?: any[];
  currentAgent?: string;
  agentActions?: string[];
  researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing';
  agents?: AgentInfo[];
}

export const ResearcherProgress: React.FC<ResearcherProgressProps> = ({
  stage,
  timeRemaining,
  progress,
  thinkingSteps,
  isComplete,
  searchTerms = [],
  sources = [],
  currentAgent,
  agentActions = [],
  researchPhase = 'planning',
  agents = []
}) => {
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);
  const [visibleActions, setVisibleActions] = useState<string[]>([]);
  const [showSearching, setShowSearching] = useState(false);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    if (thinkingSteps.length > visibleSteps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(thinkingSteps.slice(0, visibleSteps.length + 1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [thinkingSteps, visibleSteps]);

  useEffect(() => {
    if (agentActions.length > visibleActions.length) {
      const timer = setTimeout(() => {
        setVisibleActions(agentActions.slice(0, visibleActions.length + 1));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [agentActions, visibleActions]);

  useEffect(() => {
    if (searchTerms.length > 0) {
      setShowSearching(true);
    }
  }, [searchTerms]);

  useEffect(() => {
    if (sources.length > 0) {
      setShowSources(true);
    }
  }, [sources]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'planning': return <Brain className="w-4 h-4 text-blue-400" />;
      case 'searching': return <Search className="w-4 h-4 text-green-400" />;
      case 'analyzing': return <FileText className="w-4 h-4 text-orange-400" />;
      case 'synthesizing': return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'citing': return <FileText className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'planning': return 'text-blue-400';
      case 'searching': return 'text-green-400';
      case 'analyzing': return 'text-orange-400';
      case 'synthesizing': return 'text-purple-400';
      case 'citing': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAgentIcon = (agentName: string) => {
    switch (agentName) {
      case 'LeadResearcher': return '🧠';
      case 'InternetSearcher': return '🔍';
      case 'WebCrawler': return '🕷️';
      case 'GeneralAssistant': return '🤖';
      case 'CitationAgent': return '📚';
      default: return '👤';
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-900 dark:to-black rounded-xl p-6 text-white border border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">🔬</div>
        <div>
          <h3 className="text-lg font-medium">SEARCH-R1 Researcher</h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {getPhaseIcon(researchPhase)}
            <span className={`capitalize ${getPhaseColor(researchPhase)}`}>
              {researchPhase} Phase
            </span>
          </div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">{stage}</span>
          <span className="text-sm text-gray-400">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {isComplete ? 'Research Complete' : timeRemaining}
        </div>
      </div>

      {/* Current Agent Status */}
      {currentAgent && (
        <div className="mb-6 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-lg">{getAgentIcon(currentAgent)}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-400">{currentAgent}</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Agent Actions */}
          {visibleActions.length > 0 && (
            <div className="space-y-1">
              {visibleActions.slice(-3).map((action, index) => (
                <div 
                  key={index}
                  className="text-xs text-gray-300 bg-gray-800/50 px-2 py-1 rounded opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {action}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multi-Agent Overview */}
      {agents.length > 0 && (
        <div className="mb-6">
          <h4 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Agent Team Status
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {agents.map((agent, index) => (
              <div 
                key={index}
                className={`p-2 rounded-lg border ${
                  agent.status === 'active' 
                    ? 'bg-blue-900/30 border-blue-500/50' 
                    : agent.status === 'completed'
                    ? 'bg-green-900/30 border-green-500/50'
                    : 'bg-gray-700/30 border-gray-600/50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span>{getAgentIcon(agent.name)}</span>
                  <span className="truncate">{agent.name}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    agent.status === 'active' ? 'bg-blue-400 animate-pulse' :
                    agent.status === 'completed' ? 'bg-green-400' : 
                    'bg-gray-400'
                  }`} />
                </div>
                {agent.currentTask && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {agent.currentTask}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* SEARCH-R1 Thinking Process */}
      {visibleSteps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Reasoning Process
          </h4>
          <div className="space-y-3">
            {visibleSteps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-gray-300 text-sm leading-relaxed">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Queries */}
      {showSearching && searchTerms.length > 0 && (
        <div className="mb-6">
          <h4 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Queries
          </h4>
          <div className="space-y-2">
            {searchTerms.map((term, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 opacity-0 animate-fade-in-up bg-gray-700/30 px-3 py-2 rounded-lg"
                style={{ animationDelay: `${(visibleSteps.length + index) * 0.1}s` }}
              >
                <Search className="w-3 h-3 text-green-400" />
                <span className="text-gray-300 text-sm">{term}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {showSources && sources.length > 0 && (
        <div>
          <h4 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Sources Analyzed · {sources.length}
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sources.slice(0, 8).map((source, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 opacity-0 animate-fade-in-up bg-gray-700/20 px-3 py-2 rounded-lg"
                style={{ animationDelay: `${(visibleSteps.length + searchTerms.length + index) * 0.1}s` }}
              >
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="min-w-0 flex-1">
                  <div className="text-purple-400 text-sm font-medium truncate">
                    {source.title || 'Untitled Source'}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {source.url || source.domain || 'Unknown domain'}
                  </div>
                  {source.agent_source && (
                    <div className="text-xs text-blue-400 mt-1">
                      via {source.agent_source}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearcherProgress;
