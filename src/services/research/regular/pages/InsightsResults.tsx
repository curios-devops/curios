// Insights Results page with multi-agent workflow integration
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Search, Brain, Sparkles, CheckCircle2 } from 'lucide-react';
import { insightsService, InsightProgressCallback } from '../agents/insightsService';
import { SearchResult } from '../../types.ts';
import ResearchProgress from '../../../../components/ResearchProgress';
import TabSystem from '../../../../components/TabSystem';
import ShareMenu from '../../../../components/ShareMenu';
import { useAccentColor } from '../../../../hooks/useAccentColor';

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
  const accent = useAccentColor();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  // Only use focus category if explicitly provided in URL, otherwise let auto-detection work
  const focusCategory = searchParams.get('focus') || undefined;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [showPhaseIndicator, setShowPhaseIndicator] = useState(true);
  
  // Handle focus category change
  const handleFocusChange = (newFocus: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set('focus', newFocus);
    window.location.href = `/insights-results?${params.toString()}`;
  };

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

  const handleProgress = ((
    stage: string, 
    timeRemaining: string, 
    progress: number, 
    thinkingStep: string,
    searchTerms: string[] = [],
    sources: any[] = [],
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
  }) as InsightProgressCallback;

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

    // Simple promise handling - no complex cancellation logic
    insightsService.performInsightAnalysis(query, handleProgress, focusCategory)
      .then((insightResult) => {
        console.log('✅ Insights completed', { resultKeys: Object.keys(insightResult) });
        setResult(insightResult);
        setLoading(false);
      })
      .catch((err: Error) => {
        console.error('❌ Insights failed', { error: err.message });
        setError(err.message || 'Failed to generate insights. Please try again.');
        setLoading(false);
      });
  }, [query, workflowStarted, handleProgress]);

  // Hide phase indicator after loading completes
  useEffect(() => {
    if (!loading && result && progressState.insightPhase === 'finalizing') {
      // Wait 1 second then fade out
      const timer = setTimeout(() => {
        setShowPhaseIndicator(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, result, progressState.insightPhase]);

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'analyzing': return <Brain className="text-blue-500" size={14} />;
      case 'searching': return <Search className="text-green-500" size={14} />;
      case 'synthesizing': return <Sparkles className="text-purple-500" size={14} />;
      case 'finalizing': return <CheckCircle2 className="text-green-500" size={14} />;
      default: return <Brain className="text-blue-500" size={14} />;
    }
  };

  return (
    <div className="insights-result-page min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] dark:from-[#111111] dark:to-black text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 py-6 overflow-x-auto scrollbar-hide">
        <button 
          type="button"
          onClick={() => navigate('/')}
          style={{ color: accent.primary }}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h1 className="text-2xl font-medium whitespace-nowrap">{query}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Insight Phase Indicator */}
            {progressState.insightPhase && showPhaseIndicator && (
              <div 
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full transition-opacity duration-1000"
                style={{ opacity: !loading && result ? 0 : 1 }}
              >
                {getPhaseIcon(progressState.insightPhase)}
                <span className="text-xs font-medium capitalize">{progressState.insightPhase}</span>
              </div>
            )}
          </div>
        </div>
        {/* Share Menu */}
        {!loading && result && (
          <ShareMenu
            url={globalThis.location.href}
            title={result.headline || `Insights: ${query}`}
            text={result.subtitle || result.markdown_report?.slice(0, 150) + '...' || ''}
            query={query}
            images={result.images || []}
          />
        )}
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6">
        {loading && (
          <div className="space-y-3">
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
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: accent.primary }}
                    ></div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Agent:</span>
                    <span 
                      className="text-sm font-semibold"
                      style={{ color: accent.primary }}
                    >
                      {progressState.currentAgent}
                    </span>
                  </div>
                </div>
                
                {/* Topic Detection Info - shown when InsightWriter is active and we have result */}
                {result?.focus_category && result?.style_source && progressState.currentAgent === 'InsightWriter' && (
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Topic "{result.focus_category}"</span> auto-selected.{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        Style inspired by: <em>{result.style_source}</em>
                      </span>
                    </div>
                  </div>
                )}
                
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
            focusCategory={focusCategory}
            onFocusChange={handleFocusChange}
          />
        )}
      </main>
    </div>
  );
}