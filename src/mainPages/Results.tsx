import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { performSearch } from '../services/search/searchService';
import { formatTimeAgo } from '../utils/time';
import ShareMenu from '../components/ShareMenu';
import TopBar from '../components/results/TopBar';
import MainContent from '../components/results/MainContent';
import Sidebar from '../components/results/Sidebar';
import { ArrowLeft } from 'lucide-react';
import type { SearchState } from '../types';
import { logger } from '../utils/logger';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const mode = searchParams.get('mode') || 'focus';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [showAllSources, setShowAllSources] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing search...');
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [searchStartTime]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setSearchState({
          isLoading: false,
          error: 'Please enter a search query',
          data: null
        });
        return;
      }

      try {
        logger.info('Starting search', { query, mode });
        setSearchState((prev: SearchState) => ({ ...prev, isLoading: true, error: null }));
        
        const response = await performSearch(query, {
          mode,
          isPro: false,
          onStatusUpdate: (status: string) => {
            logger.debug('Search status update', { status });
            setStatusMessage(status);
          }
        });

        logger.info('Search completed', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0
        });

        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        logger.error('Search failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          query,
          mode
        });

        setSearchState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Search services are currently unavailable',
          data: null
        });
      }
    };

    fetchResults();
  }, [query, mode]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <TopBar query={query} timeAgo={timeAgo} />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-medium">{query}</h1>
          </div>
          <ShareMenu
            url={window.location.href}
            title={`CuriosAI Search: ${query || ''}`}
            text={searchState.data?.answer.slice(0, 100) + '...' || ''}
          />
        </div>

        <div className="flex gap-6">
          <MainContent 
            searchState={searchState}
            showAllSources={showAllSources}
            setShowAllSources={setShowAllSources}
            statusMessage={statusMessage}
          />

          {!searchState.error && (
            <Sidebar 
              isCollapsed={false}
              toggleSidebar={() => {}}
            />
          )}
        </div>
      </main>
    </div>
  );
}