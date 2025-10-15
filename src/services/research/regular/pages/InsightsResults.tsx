// Insights Results page with multi-agent workflow integration
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, BookOpen, TrendingUp, BarChart3, Target } from 'lucide-react';
import { researchService } from '../../researchService.ts';
import { InsightProgressCallback, SearchResult } from '../../types.ts';
import ResearchProgress from '../../../../components/ResearchProgress';
import TabSystem from '../../../../components/TabSystem';

interface ProgressState {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  searchTerms: string[];
  sources: SearchResult[];
  currentAgent?: string;
  agentActions?: string[];
  insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing';
}

export default function InsightsResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'Initializing Insight Analysis',
    timeRemaining: 'About 2-3 minutes remaining',
    progress: 0,
    thinkingSteps: [],
    searchTerms: [],
    sources: [],
    currentAgent: 'InsightAnalyzer',
    agentActions: [],
    insightPhase: 'analyzing'
  });

  const handleProgress: InsightProgressCallback = (
    stage: string, 
    timeRemaining: string, 
    progress: number, 
    thinkingStep: string,
    searchTerms: string[] = [],
    sources: SearchResult[] = [],
    currentAgent?: string,
    agentAction?: string,
    insightPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
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
      insightPhase: insightPhase || prev.insightPhase
    }));
  };

  useEffect(() => {
    if (!query || workflowStarted) return;
    
    setWorkflowStarted(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressState({
      stage: 'Initializing Insight Analysis',
      timeRemaining: 'About 2-3 minutes remaining',
      progress: 0,
      thinkingSteps: [],
      searchTerms: [],
      sources: [],
      currentAgent: 'InsightAnalyzer',
      agentActions: [],
      insightPhase: 'analyzing'
    });

    researchService.performInsightAnalysis(query, false, handleProgress)
      .then((insightResult) => {
        setResult(insightResult);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError('Failed to perform insight analysis: ' + (err?.message || 'Unknown error'));
        setLoading(false);
      });
  }, [query, workflowStarted]);

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'analyzing': return <Target className="text-blue-500" size={14} />;
      case 'searching': return <BookOpen className="text-green-500" size={14} />;
      case 'synthesizing': return <TrendingUp className="text-purple-500" size={14} />;
      case 'finalizing': return <BarChart3 className="text-orange-500" size={14} />;
      default: return <Target className="text-blue-500" size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] dark:from-[#111111] dark:to-black text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 py-6">
        <button 
          type="button"
          onClick={() => navigate('/')} 
          className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium">{query}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-blue-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">
              <BookOpen className="text-[#0095FF]" size={14} />
              <span className="text-[#0095FF] text-sm font-medium">Insights</span>
            </div>
            {/* Insight Phase Indicator */}
            {progressState.insightPhase && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {getPhaseIcon(progressState.insightPhase)}
                <span className="text-xs font-medium capitalize">{progressState.insightPhase}</span>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6">
        {loading && (
          <div className="space-y-6">
            <ResearchProgress
              stage={progressState.stage}
              timeRemaining={progressState.timeRemaining}
              progress={progressState.progress}
              thinkingSteps={progressState.thinkingSteps}
              isComplete={false}
              searchTerms={progressState.searchTerms}
              sources={progressState.sources}
            />
            {/* Multi-Agent Progress Display */}
            {progressState.currentAgent && (
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
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
            <button 
              type="button"
              onClick={() => globalThis.location.reload()} 
              className="bg-red-500/10 text-red-500 px-6 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {!loading && result && (
          <TabSystem 
            result={result}
            progressState={progressState}
            loading={loading}
          />
        )}
      </main>
    </div>
  );
} 