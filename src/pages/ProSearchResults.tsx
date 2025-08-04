import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { performSearch } from '../services/searchService';
import { formatTimeAgo } from '../utils/time';
import { updateMetaTags, generateShareableMetaTags } from '../utils/metaTags';
import TopBar from '../components/results/TopBar';
import MainContent from '../components/results/MainContent';
import { Sparkles } from 'lucide-react';
import type { SearchState } from '../types';
import ProSearchSection from '../components/ProSearchSection';
import { logger } from '../utils/logger';

export default function ProResults() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [showAllSources, setShowAllSources] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Pro Search...');
  
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

  // Update meta tags when search data loads
  useEffect(() => {
    if (searchState.data && !searchState.isLoading) {
      console.log('=== Pro Search Data Available ===');
      console.log('searchState.data:', searchState.data);
      console.log('Answer field:', searchState.data.answer);
      console.log('Images field:', searchState.data.images);
      console.log('Sources field:', searchState.data.sources);
      console.log('All available fields:', Object.keys(searchState.data));
      
      const metaTags = generateShareableMetaTags(
        `[PRO] CuriosAI Search: ${query}`,
        searchState.data.answer || 'Professional search results powered by CuriosAI',
        searchState.data.images?.[0]?.url || ''
      );
      updateMetaTags(metaTags);
    }
  }, [searchState.data, searchState.isLoading, query]);

  // Debug TopBar props when they change
  useEffect(() => {
    console.log('ProSearchResults TopBar props:', {
      query,
      shareUrl: window.location.href,
      shareTitle: `[PRO] CuriosAI Search: ${query || 'Professional Search'}`,
      shareText: searchState.data?.answer?.slice(0, 100) + '...' || 
                 searchState.data?.sources?.[0]?.snippet?.slice(0, 100) + '...' ||
                 `Professional search results for "${query}" powered by CuriosAI`,
      images: searchState.data?.images?.slice(0, 1) || []
    });
  }, [query, searchState.data]);

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
        logger.info('Starting Pro search', { query });
        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await performSearch(query, {
          isPro: true,
          onStatusUpdate: (status) => {
            logger.debug('Pro search status update', { status });
            setStatusMessage(status);
          }
        });

        logger.info('Pro search completed', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasPerspectives: !!response.perspectives?.length
        });

        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        logger.error('Pro search failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          query
        });
        setSearchState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Search services are currently unavailable',
          data: null
        });
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <TopBar 
        query={query} 
        timeAgo={timeAgo} 
        shareUrl={window.location.href}
        shareTitle={`[PRO] CuriosAI Search: ${query || 'Professional Search'}`}
        shareText={
          searchState.data?.answer?.slice(0, 100) + '...' || 
          searchState.data?.sources?.[0]?.snippet?.slice(0, 100) + '...' ||
          `Professional search results for "${query}" powered by CuriosAI`
        }
        images={searchState.data?.images?.slice(0, 1) || []}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Pro Search Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-full">
            <Sparkles className="text-[#0095FF]" size={14} />
            <span className="text-[#0095FF] text-sm font-medium">Pro</span>
          </div>
        </div>
        <div className="space-y-6">
          {/* Pro Search Section */}
          <ProSearchSection 
            query={query}
            isLoading={searchState.isLoading}
            perspectives={searchState.data?.perspectives}
          />
          {/* Main Content */}
          <MainContent 
            searchState={searchState}
            showAllSources={showAllSources}
            setShowAllSources={setShowAllSources}
            statusMessage={statusMessage}
            isPro={true}
          />
        </div>
      </main>
    </div>
  );
}