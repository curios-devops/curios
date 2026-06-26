// Stories Results page with multi-agent workflow integration
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Search, Brain, Sparkles, CheckCircle2, ChevronDown, Crown } from 'lucide-react';
import { storiesService, StoryProgressCallback } from '../agents/storiesService';
import { SearchResult } from '../types.ts';
import ResearchProgress from '../../../components/ResearchProgress';
import TabSystem from '../../../components/TabSystem';
import { useAccentColor } from '../../../hooks/useAccentColor';
import { useProCredits } from '../../../providers/ProCreditsProvider';

// Topic categories for the header dropdown (label = what the user sees).
const FOCUS_CATEGORIES = [
  { id: 'ANALYSIS', label: 'ANALYSIS' },
  { id: 'ARTS', label: 'ARTS & ENTERTAINMENT' },
  { id: 'BUSINESS', label: 'BUSINESS & INNOVATION' },
  { id: 'HEALTH & SPORT', label: 'HEALTH & SPORT' },
  { id: 'SCIENCES & TECH', label: 'SCIENCES & TECH' }
];

// First letter uppercase, rest lowercase (matches Search's button/label casing).
const toSentenceCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

interface ProgressState {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  searchTerms: string[];
  sources: SearchResult[];
  currentAgent?: string;
  agentActions?: string[];
  storyPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing';
}

export default function StoriesResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const accent = useAccentColor();
  const { requestProAccess } = useProCredits();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  // Only use focus category if explicitly provided in URL, otherwise let auto-detection work
  const focusCategory = searchParams.get('focus') || undefined;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [showPhaseIndicator, setShowPhaseIndicator] = useState(true);
  const [showFocusDropdown, setShowFocusDropdown] = useState(false);
  const focusDropdownRef = useRef<HTMLDivElement>(null);

  // Changing the topic category is a Pro feature — consume one daily Pro Credit.
  // requestProAccess opens the register/upgrade/quota modal and returns false when
  // access is blocked, in which case we don't re-run the story.
  const handleFocusChange = async (newFocus: string) => {
    const allowed = await requestProAccess();
    if (!allowed) return;
    const params = new URLSearchParams(window.location.search);
    params.set('focus', newFocus);
    window.location.href = `/stories-results?${params.toString()}`;
  };

  // Close the focus dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (focusDropdownRef.current && !focusDropdownRef.current.contains(event.target as Node)) {
        setShowFocusDropdown(false);
      }
    };
    if (showFocusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFocusDropdown]);

  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'Starting Your Story',
    timeRemaining: 'About 2-3 minutes remaining',
    progress: 0,
    thinkingSteps: [],
    searchTerms: [],
    sources: [],
    currentAgent: 'StoryWriter',
    agentActions: [],
    storyPhase: 'analyzing'
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
    storyPhase?: 'analyzing' | 'searching' | 'synthesizing' | 'finalizing'
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
      storyPhase: storyPhase || prev.storyPhase
    }));
  }) as StoryProgressCallback;

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
      currentAgent: 'StoryAnalyzer',
      agentActions: [],
      storyPhase: 'analyzing'
    });

    // Simple promise handling - no complex cancellation logic
    storiesService.performStoryAnalysis(query, handleProgress, focusCategory)
      .then((storyResult) => {
        console.log('✅ Insights completed', { resultKeys: Object.keys(storyResult) });
        setResult(storyResult);
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
    if (!loading && result && progressState.storyPhase === 'finalizing') {
      // Wait 1 second then fade out
      const timer = setTimeout(() => {
        setShowPhaseIndicator(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [loading, result, progressState.storyPhase]);

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'analyzing': return <Brain className="text-blue-500" size={14} />;
      case 'searching': return <Search className="text-green-500" size={14} />;
      case 'synthesizing': return <Sparkles className="text-purple-500" size={14} />;
      case 'finalizing': return <CheckCircle2 className="text-green-500" size={14} />;
      default: return <Brain className="text-blue-500" size={14} />;
    }
  };

  // Current topic shown on the header button, in Search's sentence-case style.
  const currentFocusId = focusCategory || result?.focus_category || 'ANALYSIS';
  const currentFocusLabel = toSentenceCase(
    FOCUS_CATEGORIES.find(c => c.id === currentFocusId)?.label ?? currentFocusId
  );

  return (
    <div className="stories-result-page min-h-screen bg-white dark:bg-[#111111] text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 py-6">
        <button 
          type="button"
          onClick={() => navigate('/')}
          style={{ color: accent.primary }}
          className="hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-medium break-words max-h-24 overflow-y-auto pr-1">{query}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Insight Phase Indicator */}
            {progressState.storyPhase && showPhaseIndicator && (
              <div 
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full transition-opacity duration-1000"
                style={{ opacity: !loading && result ? 0 : 1 }}
              >
                {getPhaseIcon(progressState.storyPhase)}
                <span className="text-xs font-medium capitalize">{progressState.storyPhase}</span>
              </div>
            )}
          </div>
        </div>
        {/* Topic category dropdown — same button style as Search's header pill */}
        {!loading && result && (
          <div className="relative flex-shrink-0" ref={focusDropdownRef}>
            <button
              type="button"
              onClick={() => setShowFocusDropdown(v => !v)}
              title="Change topic category (Pro · 1 credit)"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all cursor-pointer hover:opacity-90"
              style={{ backgroundColor: accent.primary }}
            >
              <Crown size={16} />
              <span>{currentFocusLabel}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showFocusDropdown && (
              <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-20 min-w-[210px] rounded-md overflow-hidden">
                {FOCUS_CATEGORIES.map((category) => {
                  const current = focusCategory || result?.focus_category || 'ANALYSIS';
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setShowFocusDropdown(false);
                        if (category.id !== current) handleFocusChange(category.id);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                        category.id === current
                          ? 'bg-gray-100 dark:bg-gray-700 text-black dark:text-white'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {toSentenceCase(category.label)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>
      <main className="max-w-4xl mx-auto px-0 sm:px-6 py-6">
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
                {result?.focus_category && result?.style_source && progressState.currentAgent === 'StoryWriter' && (
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
          />
        )}
      </main>
    </div>
  );
}