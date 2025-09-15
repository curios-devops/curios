import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { SwarmController } from '../agents/swarmController.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import { updateMetaTags, generateShareableMetaTags } from '../../../../utils/metaTags.ts';
import TopBar from '../../../../components/results/TopBar.tsx';
import MainContent from '../../../../components/results/MainContent.tsx';
import { Loader2 } from 'lucide-react';
import type { SearchState, SearchResponse, Perspective } from '../../../../types/index.ts';

// Define the SearchResult type that includes all necessary properties
interface SearchResult {
  title?: string;
  url?: string;
  content?: string;
  snippet?: string;
  source?: string;
  [key: string]: string | undefined;
}
import ProSearchSection from '../../../../components/ProSearchSection.tsx';
import { logger } from '../../../../utils/logger.ts';

interface ProSearchData extends SearchResponse {
  perspectives: Perspective[];
}

export default function ProSearchResults() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [showAllSources, setShowAllSources] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Pro Search...');
  const [_isPro, _setIsPro] = useState(true);
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  } as SearchState);
  
  const [proData, setProData] = useState<ProSearchData | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  const updateSearchState = useCallback((updates: Partial<SearchState>) => {
    setSearchState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Initialize search on component mount or query change
  useEffect(() => {
    if (!query.trim()) return;
    
    updateSearchState({ isLoading: true, error: null });
    setStatusMessage('Starting Pro Search...');
    
    const executeSearch = async () => {
      try {
        const controller = new SwarmController();
        
        setStatusMessage('Analyzing your query with multiple perspectives...');
        
        const response = await controller.processQuery(
          query,
          (status: string) => setStatusMessage(status),
          true // isPro
        );
        const { research, article, images, videos } = response;
        
        // Format the data for the UI
        const formattedData: ProSearchData = {
          answer: article.content,
          sources: (research.results || []).map(r => ({
            title: r.title || '',
            url: r.url || '',
            snippet: r.content || '',
            source: 'web'
          })),
          images: images || [],
          videos: videos || [],
          perspectives: research.perspectives || [],
          followUpQuestions: article.followUpQuestions || []
        };
        
        setProData(formattedData);
        updateSearchState({
          isLoading: false,
          error: null,
          data: {
            answer: article.content,
            sources: research.results.map((r) => ({
              title: r.title || '',
              url: r.url || '',
              snippet: r.content || '',
              source: 'web'
            })),
            images: images || [],
            videos: videos || []
          }
        });
        
        // Update meta tags
        const metaTags = generateShareableMetaTags(
          `[PRO] CuriosAI Search: ${query}`,
          article.content.substring(0, 200),
          images[0]?.url
        );
        updateMetaTags(metaTags);
        
        // Final status update to ensure UI completion
        setStatusMessage('Search completed successfully!');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error('Search error:', error);
        updateSearchState({
          isLoading: false,
          error: errorMessage,
          data: null
        });
        setStatusMessage('Search completed with errors');
      }
    };

    executeSearch();
  }, [query, updateSearchState]);
  
  // Update time ago every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <TopBar 
        query={query} 
        timeAgo={timeAgo} 
        shareUrl={globalThis.window?.location.href || ''}
        shareTitle={`[PRO] CuriosAI Search: ${query}`}
        shareText={searchState.data?.answer?.substring(0, 100) + '...' || ''}
        images={searchState.data?.images || []}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {searchState.isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-400">{statusMessage}</p>
          </div>
        ) : searchState.error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Search Error</h3>
            <p className="mt-2 text-red-700 dark:text-red-300">{searchState.error}</p>
            <button
              type="button"
              onClick={() => globalThis.location.reload()}
              disabled={searchState.isLoading}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {searchState.isLoading ? (
                <>
                  <Loader2 className="inline-block animate-spin mr-2" size={16} />
                  Searching...
                </>
              ) : (
                'Search Again'
              )}
            </button>
          </div>
        ) : (
          <>
            <ProSearchSection 
              query={query}
              perspectives={proData?.perspectives || []}
            />
            
            <div className="mt-8">
              <MainContent
                searchState={{
                  isLoading: false,
                  error: null,
                  data: searchState.data
                }}
                showAllSources={showAllSources}
                setShowAllSources={setShowAllSources}
                statusMessage={statusMessage}
                isPro
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}