import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, Loader2 } from 'lucide-react';
import { formatTimeAgo } from '../utils/time';
import TopBar from '../components/results/TopBar';
import { logger } from '../utils/logger';
import { ResearchManager } from '../services/research/researchManager';
import type { ResearchData } from '../services/research/types';

interface ResearchStep {
  agent: string;
  status: string;
  progress: number;
}

interface ResearchState {
  isLoading: boolean;
  error: string | null;
  currentStep: ResearchStep | null;
  data: ResearchData | null;
}

const researchManager = new ResearchManager();

export default function DeepResearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  
  const [researchState, setResearchState] = useState<ResearchState>({
    isLoading: true,
    error: null,
    currentStep: null,
    data: null
  });
  
  // Lazy load heavy components
  const ShareMenu = React.lazy(() => import('../components/ShareMenu'));
  const MainContent = React.lazy(() => import('../components/results/MainContent'));
  const Sidebar = React.lazy(() => import('../components/results/Sidebar'));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  useEffect(() => {
    const conductResearch = async () => {
      if (!query.trim()) {
        setResearchState({
          isLoading: false,
          error: 'Please enter a research topic',
          currentStep: null,
          data: null
        });
        return;
      }

      try {
        const data = await researchManager.conductResearch(
          query,
          (agent, status, progress) => {
            setResearchState(prev => ({
              ...prev,
              currentStep: { agent, status, progress }
            }));
          }
        );

        setResearchState({
          isLoading: false,
          error: null,
          currentStep: null,
          data: data
        });
      } catch (error) {
        logger.error('Research process failed:', error);
        setResearchState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Research process failed',
          currentStep: null,
          data: null
        });
      }
    };

    conductResearch();
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] to-black text-white">
      <TopBar query={query} timeAgo={timeAgo} />
      
      <React.Suspense fallback={null}>
        {researchState.data && (
          <ShareMenu
            url={window.location.href}
            title={`Deep Research: ${query}`}
            text={typeof researchState.data?.content === 'string' ? researchState.data.content.slice(0, 100) + '...' : ''}
          />
        )}
      </React.Suspense>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')}
            className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-white">{query}</h1>
            <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
              <Brain className="text-[#0095FF]" size={14} />
              <span className="text-[#0095FF] text-sm font-medium">Deep Research</span>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            {researchState.isLoading && researchState.currentStep && (
              <div className="bg-[#111111] rounded-xl border border-gray-800 p-8">
                <div className="flex flex-col items-center gap-6">
                  <Loader2 className="animate-spin text-[#0095FF]" size={28} />
                  <div className="text-center space-y-4">
                    <p className="text-gray-300 text-lg font-medium">{researchState.currentStep.agent}</p>
                    <p className="text-gray-400">{researchState.currentStep.status}</p>
                    <div className="w-full bg-[#222222] h-1.5 rounded-full">
                      <div 
                        className="h-full bg-[#0095FF] rounded-full transition-all duration-500"
                        style={{ width: `${researchState.currentStep.progress}%` }}
                      />
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                      {researchState.currentStep.progress}% complete
                    </p>
                  </div>
                </div>
              </div>
            )}

            {researchState.error && (
              <div className="bg-[#111111] rounded-xl border border-red-500/20 p-8 text-center">
                <p className="text-red-500 mb-4">{researchState.error}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-red-500/10 text-red-500 px-6 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                >Try Again</button>
              </div> 
            )}

            {!researchState.isLoading && researchState.data && (
              <React.Suspense fallback={<div className="animate-pulse bg-[#222222] h-96 rounded-xl" />}>
              <div className="space-y-6">
                {/* Research Outline */}
                <div className="bg-[#111111] rounded-xl border border-gray-800 p-6">
                  <h2 className="text-xl font-medium text-white mb-4">Research Outline</h2>
                  {researchState.data?.outline ? (
                    <ul className="space-y-2">
                      {(Array.isArray(researchState.data.outline) 
                        ? researchState.data.outline 
                        : Object.values(researchState.data.outline)
                      ).map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-gray-300">
                          <span className="text-[#0095FF] text-sm">{index + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No research outline available.</p>
                  )}
                </div>

                {/* Main Content */}
                <MainContent 
                  searchState={{
                    isLoading: false,
                    error: null,
                    data: {
                      answer: researchState.data.content,
                      sources: researchState.data.sources,
                      images: researchState.data.images
                    }
                  }}
                  showAllSources={showAllSources}
                  setShowAllSources={setShowAllSources}
                  statusMessage=""
                  isPro={true}
                />

                {/* Follow-up Questions */}
                <div className="bg-[#111111] rounded-xl border border-gray-800 p-6">
                  <h2 className="text-xl font-medium text-white mb-4">Follow-up Questions</h2>
                  <ul className="space-y-2">
                    {researchState.data.followUpQuestions.map((question, index) => (
                      <li 
                        key={index}
                        className="text-gray-300 hover:text-white cursor-pointer transition-colors"
                        onClick={() => navigate(`/deep-research?q=${encodeURIComponent(question)}`)}
                      >
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              </React.Suspense>
            )}
          </div>

          {!researchState.error && !researchState.isLoading && researchState.data && (
            <React.Suspense fallback={<div className="w-80 animate-pulse bg-[#222222] h-96 rounded-xl" />}>
              <Sidebar 
                images={researchState.data?.images || []}
                videos={[]}
              />
            </React.Suspense>
          )}
        </div>
      </main>
    </div>
  );
}