import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { performSearch } from '../searchRegularIndex.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import TopBar from '../../../../components/results/TopBar.tsx';
import TabbedContent from '../../../../components/results/TabbedContent.tsx';
import type { SearchState } from '../../../../types/index.ts';
import { logger } from '../../../../utils/logger.ts';

export default function Results() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const imageUrlsParam = searchParams.get('images') || '';
  const imageUrls = imageUrlsParam ? imageUrlsParam.split(',').filter(url => url.trim()) : [];

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [statusMessage, setStatusMessage] = useState('Initializing search...');
  const [activeTab, setActiveTab] = useState('answer');
  
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
    let isCurrentRequest = true;
    
    const fetchResults = async () => {
      if (!query.trim() && imageUrls.length === 0) {
        if (isCurrentRequest) {
          setSearchState({
            isLoading: false,
            error: 'Please enter a search query or upload images',
            data: null
          });
        }
        return;
      }

      try {
        logger.info('Starting search', { query, hasImages: imageUrls.length > 0, imageCount: imageUrls.length });
        
        if (isCurrentRequest) {
          setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        }
        
        const response = await performSearch(query, {
          isPro: false,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          onStatusUpdate: (status: string) => {
            if (isCurrentRequest) {
              setStatusMessage(status);
            }
          }
        });

        // Only update state if this is still the current request
        if (!isCurrentRequest) {
          return;
        }

        logger.info('Search completed successfully', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasAnswer: !!response.answer
        });

        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        if (isCurrentRequest) {
          logger.error('Search failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            query
          });
          setSearchState({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Search services are currently unavailable',
            data: null
          });
        }
      }
    };

    fetchResults();
    
    // Cleanup function to cancel the request
    return () => {
      isCurrentRequest = false;
    };
  }, [query, imageUrls.join(',')]); // Re-run when query or images change

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
      <TopBar 
        query={query} 
        timeAgo={timeAgo} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shareUrl={globalThis.location.href}
        shareTitle={`CuriosAI Search: ${query || ''}`}
        shareText={searchState.data?.answer?.slice(0, 100) + '...' || ''}
        images={searchState.data?.images?.slice(0, 1) || []}
      />

      <main className="max-w-7xl mx-auto px-6 py-6">
        <TabbedContent
          searchState={searchState}
          statusMessage={statusMessage}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </main>
    </div>
  );
}