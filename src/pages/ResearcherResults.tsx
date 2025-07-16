import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Search as SearchIcon, FileText, Sparkles } from 'lucide-react';
import { runResearcherWorkflow } from '../services/agents/researcherWorkflow';
import ResearcherProgress from '../components/ResearcherProgress';
import TabSystem from '../components/TabSystem';

// Helper function to get focus mode display name
const getFocusModeDisplayName = (focusMode: string): string => {
  const focusDisplayNames: Record<string, string> = {
    'health': 'Health & Medical',
    'academic': 'Academic Research', 
    'finance': 'Financial Analysis',
    'travel': 'Travel & Local',
    'social': 'Social Media',
    'math': 'Mathematical',
    'video': 'Video Content',
    'web': 'Internet'
  };
  return focusDisplayNames[focusMode] || focusMode.charAt(0).toUpperCase() + focusMode.slice(1);
};

interface ProgressState {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  searchTerms: string[];
  sources: any[];
  currentAgent?: string;
  agentActions?: string[];
  researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing';
}

export default function ResearcherResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const focusMode = searchParams.get('mode') || 'web';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'Initializing SEARCH-R1 Framework',
    timeRemaining: 'About 3-5 minutes remaining',
    progress: 0,
    thinkingSteps: [],
    searchTerms: [],
    sources: [],
    currentAgent: 'LeadResearcher',
    agentActions: [],
    researchPhase: 'planning'
  });

  const handleProgress = (
    stage: string, 
    timeRemaining: string, 
    progress: number, 
    thinkingStep: string,
    searchTerms: string[] = [],
    sources: any[] = [],
    currentAgent?: string,
    agentAction?: string,
    researchPhase?: 'planning' | 'searching' | 'analyzing' | 'synthesizing' | 'citing'
  ) => {
    setProgressState(prev => ({
      stage,
      timeRemaining,
      progress,
      thinkingSteps: thinkingStep ? [...prev.thinkingSteps, thinkingStep] : prev.thinkingSteps,
      searchTerms: searchTerms.length > 0 ? searchTerms : prev.searchTerms,
      sources: sources.length > 0 ? sources : prev.sources,
      currentAgent: currentAgent || prev.currentAgent,
      agentActions: agentAction ? [...(prev.agentActions || []), agentAction] : prev.agentActions || [],
      researchPhase: researchPhase || prev.researchPhase
    }));
  };

  useEffect(() => {
    if (!query || workflowStarted) return;
    
    setWorkflowStarted(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressState({
      stage: 'Initializing SEARCH-R1 Framework',
      timeRemaining: 'About 3-5 minutes remaining',
      progress: 0,
      thinkingSteps: [],
      searchTerms: [],
      sources: [],
      currentAgent: 'LeadResearcher',
      agentActions: [],
      researchPhase: 'planning'
    });

    runResearcherWorkflow(query, handleProgress, focusMode)
      .then((workflowResult: any) => {
        setResult(workflowResult);
        setLoading(false);
      })
      .catch((err: any) => {
        setError('Failed to run researcher workflow: ' + (err?.message || 'Unknown error'));
        setLoading(false);
      });
  }, [query, workflowStarted, focusMode]);

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'planning': return <Brain className="text-blue-500" size={14} />;
      case 'searching': return <SearchIcon className="text-green-500" size={14} />;
      case 'analyzing': return <FileText className="text-orange-500" size={14} />;
      case 'synthesizing': return <Sparkles className="text-purple-500" size={14} />;
      case 'citing': return <FileText className="text-red-500" size={14} />;
      default: return <Brain className="text-blue-500" size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] dark:from-[#111111] dark:to-black text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 py-6">
        <button onClick={() => navigate('/')} className="text-[#0095FF] hover:text-[#0080FF] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium">{query}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-[#1a1a1a] dark:to-[#1a1a1a] px-2 py-0.5 rounded-full">
              <Brain className="text-[#0095FF]" size={14} />
              <span className="text-[#0095FF] text-sm font-medium">Researcher</span>
            </div>
            {/* Focus Mode Indicator next to Researcher */}
            {focusMode && focusMode !== 'web' && (
              <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 px-2 py-1 text-xs font-medium uppercase tracking-wider rounded">
                {getFocusModeDisplayName(focusMode)}
              </span>
            )}
            {/* Research Phase Indicator */}
            {progressState.researchPhase && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {getPhaseIcon(progressState.researchPhase)}
                <span className="text-xs font-medium capitalize">{progressState.researchPhase}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6">
        {loading && (
          <div className="space-y-6">
            <ResearcherProgress
              stage={progressState.stage}
              timeRemaining={progressState.timeRemaining}
              progress={progressState.progress}
              thinkingSteps={progressState.thinkingSteps}
              isComplete={false}
              searchTerms={progressState.searchTerms}
              sources={progressState.sources}
              currentAgent={progressState.currentAgent}
              agentActions={progressState.agentActions}
              researchPhase={progressState.researchPhase}
            />
            {/* Multi-Agent Progress Display */}
            {progressState.currentAgent && (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Agent:</span>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{progressState.currentAgent}</span>
                  </div>
                </div>
                {progressState.agentActions && progressState.agentActions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Actions:</h4>
                    <div className="space-y-1">
                      {progressState.agentActions.slice(-3).map((action, index) => (
                        <div key={index} className="text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {action}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {error && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-red-500/20 p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="bg-red-500/10 text-red-500 px-6 py-2 rounded-lg hover:bg-red-500/20 transition-colors">Try Again</button>
          </div>
        )}
        {!loading && result && (
          <TabSystem 
            result={result}
            progressState={progressState}
            loading={loading}
            focusMode={focusMode}
          />
        )}
      </main>
    </div>
  );
}
