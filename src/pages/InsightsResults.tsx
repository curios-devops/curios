// TODO: Integrate OpenAI Agents SDK multi-agent workflow here
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { runInsightsWorkflow } from '../services/agents/insightsWorkflow.ts';
import ResearchProgress from '../components/ResearchProgress';
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
}

export default function InsightsResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const focusMode = searchParams.get('mode') || 'web'; // Extract focus mode from URL

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [workflowStarted, setWorkflowStarted] = useState(false);
  const [progressState, setProgressState] = useState<ProgressState>({
    stage: 'Starting',
    timeRemaining: 'About 2 minutes remaining',
    progress: 0,
    thinkingSteps: [],
    searchTerms: [],
    sources: []
  });

  const handleProgress = (
    stage: string, 
    timeRemaining: string, 
    progress: number, 
    thinkingStep: string,
    searchTerms: string[] = [],
    sources: any[] = []
  ) => {
    setProgressState(prev => ({
      stage,
      timeRemaining,
      progress,
      thinkingSteps: thinkingStep ? [...prev.thinkingSteps, thinkingStep] : prev.thinkingSteps,
      searchTerms: searchTerms.length > 0 ? searchTerms : prev.searchTerms,
      sources: sources.length > 0 ? sources : prev.sources
    }));
  };

  useEffect(() => {
    if (!query || workflowStarted) return;
    
    setWorkflowStarted(true);
    setLoading(true);
    setError(null);
    setResult(null);
    setProgressState({
      stage: 'Starting',
      timeRemaining: 'About 2 minutes remaining',
      progress: 0,
      thinkingSteps: [],
      searchTerms: [],
      sources: []
    });

    runInsightsWorkflow(query, handleProgress, focusMode)
      .then((workflowResult) => {
        setResult(workflowResult);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to run insights workflow: ' + (err?.message || 'Unknown error'));
        setLoading(false);
      });
  }, [query, workflowStarted, focusMode]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] to-[#e0e7ef] dark:from-[#111111] dark:to-black text-gray-900 dark:text-white transition-colors duration-200">
      <header className="flex items-center gap-4 px-6 py-6">
        <button onClick={() => navigate('/')} className="text-[#0095FF] hover:text-[#0080FF] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-medium">{query}</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-blue-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">
              <BookOpen className="text-[#0095FF]" size={14} />
              <span className="text-[#0095FF] text-sm font-medium">Insights</span>
            </div>
            {/* Focus Mode Indicator next to Insights */}
            {focusMode && focusMode !== 'web' && (
              <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 text-xs font-medium uppercase tracking-wider rounded">
                {getFocusModeDisplayName(focusMode)}
              </span>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-6">
        {loading && (
          <ResearchProgress
            stage={progressState.stage}
            timeRemaining={progressState.timeRemaining}
            progress={progressState.progress}
            thinkingSteps={progressState.thinkingSteps}
            isComplete={false}
            searchTerms={progressState.searchTerms}
            sources={progressState.sources}
          />
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