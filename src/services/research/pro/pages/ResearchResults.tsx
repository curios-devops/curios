import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { logger } from '../../../../utils/logger.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import { updateMetaTags, generateShareableMetaTags } from '../../../../utils/metaTags.ts';
import type { ResearchData } from '../../types';
import TopBar from '../../../../components/results/TopBar.tsx';
import { useLocation, useNavigate } from 'react-router';
import { ResearchManager } from '../agents/researchManager.ts';

const ShareMenu = lazy(() => import('../../../../components/ShareMenu.tsx'));
const MainContent = lazy(() => import('../../../../components/results/MainContent.tsx'));

// Source type is now imported from commonApp/types/researchTypes

interface ResearchStep {
  agent: string;
  status: string;
  progress: number;
}


export default function DeepResearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const query = searchParams.get('q') || '';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ResearchStep | null>(null);
  const [data, setData] = useState<ResearchData | null>(null);
  
  const researchManager = useMemo(() => new ResearchManager(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    const performResearch = async () => {
      try {
        setCurrentStep({ agent: 'Research', status: 'Starting research...', progress: 0 });

        const result = await researchManager.conductResearch(
          query,
          (agent, status, progress) => {
            setCurrentStep({ agent, status, progress });
          }
        );

        setData(result);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        logger.error('Research failed:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    performResearch();
  }, [query, navigate, researchManager]);

  useEffect(() => {
    if (data && !isLoading) {
      const metaTags = generateShareableMetaTags(
        `Deep Research: ${query}`,
        data.markdown_report,
        data.images?.[0]?.url
      );
      updateMetaTags(metaTags);
    }
  }, [data, isLoading, query]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <TopBar 
        query={query} 
        timeAgo={timeAgo} 
        shareUrl={globalThis.location?.href || ''}
        shareTitle={`Deep Research: ${query || ''}`}
        shareText={data?.markdown_report?.slice(0, 100) + '...' || ''}
        images={data?.images?.slice(0, 1) || []}
      />
      
      <Suspense fallback={null}>
        {data && (
          <ShareMenu
            url={globalThis.location?.href || ''}
            title={`Deep Research: ${query}`}
            text={typeof data.markdown_report === 'string' ? data.markdown_report.slice(0, 100) + '...' : ''}
          />
        )}
      </Suspense>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6">
        <div className="space-y-6">
          {isLoading && currentStep && (
            <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-8">
              <div className="flex flex-col items-center gap-6">
                <Loader2 className="animate-spin text-[#0095FF]" size={28} />
                <div className="text-center space-y-4">
                  <p className="text-gray-900 dark:text-gray-300 text-lg font-medium">{currentStep.agent}</p>
                  <p className="text-gray-600 dark:text-gray-400">{currentStep.status}</p>
                  <div className="w-full bg-gray-200 dark:bg-[#222222] h-1.5 rounded-full">
                    <div 
                      className="h-full bg-[#0095FF] rounded-full transition-all duration-500"
                      style={{ width: `${currentStep.progress}%` }}
                    />
                  </div>
                  <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    {currentStep.progress}% complete
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-white dark:bg-[#111111] rounded-xl border border-red-500/20 p-8 text-center">
              <p className="text-red-500 mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() => globalThis.open(`/research?q=${encodeURIComponent(query)}`, '_blank')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >Try Again</button>
            </div> 
          )}

          {!isLoading && data && (
            <React.Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-[#222222] h-96 rounded-xl" />}>
              <div className="space-y-6">
                {/* Research Outline */}
                <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Research Outline</h2>
                  {data.outline ? (
                    <ul className="space-y-2">
                      {((Array.isArray(data.outline) 
                        ? data.outline 
                        : data.outline ? Object.values(data.outline) : []
                      ) as string[]).map((item, index) => (
                        <li key={index} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white dark:bg-[#111111] text-gray-500">
                      Sources
                    </span>
                  </div>
                </div>
                          <span className="text-[#0095FF] text-sm">{index + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No research outline available.</p>
                  )}
                </div>

                {/* Main Content */}
                <Suspense fallback={<div className="animate-pulse bg-gray-200 dark:bg-[#222222] h-96 rounded-xl" />}>
                  <MainContent 
                    searchState={{
                      isLoading: false,
                      error: null,
                      data: {
                        answer: data.markdown_report || '',
                        sources: data.sources?.map((source: { title: string; url: string; content?: string }) => ({
                          title: source.title || '',
                          url: source.url || '',
                          snippet: source.content || ''
                        })) || [],
                        images: data.images?.map((image) => ({
                          url: image.url,
                          alt: image.alt || 'Image',
                          source_url: image.source
                        })) || [],
                        videos: [],
                        followUpQuestions: data.followUpQuestions || []
                      }
                    }}
                    showAllSources={false}
                    setShowAllSources={() => {}}
                    statusMessage=""
                  />
                </Suspense>

                {/* Follow-up Questions */}
                {data.followUpQuestions && data.followUpQuestions.length > 0 && (
                  <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-4">Follow-up Questions</h2>
                    <ul className="space-y-2">
                      {data.followUpQuestions?.map((question: string, index: number) => (
                        <li 
                          key={index}
                          className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
                          onClick={() => navigate(`/deep-research?q=${encodeURIComponent(question)}`)}
                        >
                          {question}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </React.Suspense>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}