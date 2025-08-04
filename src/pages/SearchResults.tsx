import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { performSearch } from '../services/searchService';
import { formatTimeAgo } from '../utils/time';
import { generateShareableMetaTags, updateLinkedInMetaTags, generateDynamicOGImage } from '../utils/metaTags';
import TopBar from '../components/results/TopBar';
import TabbedContent from '../components/results/TabbedContent';
import type { SearchState } from '../types';
import { logger } from '../utils/logger';

export default function Results() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const mode = searchParams.get('mode') || 'focus';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [statusMessage, setStatusMessage] = useState('Initializing search...');
  const [activeTab, setActiveTab] = useState('answer');
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  });

  // Debug: Log state changes
  useEffect(() => {
    logger.debug('SearchResults state changed', {
      isLoading: searchState.isLoading,
      hasError: !!searchState.error,
      hasData: !!searchState.data,
      statusMessage
    });
  }, [searchState, statusMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [searchStartTime]);  // Update meta tags when search data loads
  useEffect(() => {
    if (searchState.data && !searchState.isLoading && query) {
      // Get the first search result image for dynamic OG image
      const firstResultImage = searchState.data.images?.[0]?.url;
      const firstSourceImage = searchState.data.sources?.find(source => source.image)?.image;
      const dynamicImage = generateDynamicOGImage(
        query, 
        searchState.data.answer,
        firstResultImage || firstSourceImage
      );
      
      const metaTags = generateShareableMetaTags(
        query,
        searchState.data.answer,
        dynamicImage
      );
      
      // Use LinkedIn-optimized meta tags for better social sharing
      updateLinkedInMetaTags(metaTags);
      
      logger.debug('Updated meta tags for LinkedIn sharing', {
        title: metaTags.title,
        description: metaTags.description.slice(0, 50) + '...',
        image: metaTags.image,
        hasSearchImage: !!firstResultImage,
        hasSourceImage: !!firstSourceImage
      });
    }
  }, [searchState.data, searchState.isLoading, query]);

  // Debug TopBar props when they change
  useEffect(() => {
    console.log('🔍 SearchResults TopBar props useEffect triggered:');
    console.log('- query:', query);
    console.log('- searchState.data exists:', !!searchState.data);
    console.log('- Full props object:', {
      query,
      shareUrl: window.location.href,
      shareTitle: `CuriosAI Search: ${query || ''}`,
      shareText: searchState.data?.answer?.slice(0, 100) + '...' || '',
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
        logger.info('Starting search', { query, mode });
        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await performSearch(query, {
          mode,
          isPro: false,
          onStatusUpdate: (status) => {
            logger.debug('Search status update', { status });
            setStatusMessage(status);
          }
        });

        logger.info('Search completed successfully', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasAnswer: !!response.answer
        });

        // Final status update before setting completion
        setStatusMessage('Search completed!');
        
        // Use functional update to ensure state consistency
        setSearchState(prevState => {
          const newState = {
            isLoading: false,
            error: null,
            data: response
          };
          
          logger.info('SearchResults state transition', {
            from: { isLoading: prevState.isLoading, hasData: !!prevState.data },
            to: { isLoading: newState.isLoading, hasData: !!newState.data }
          });
          
          return newState;
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
      <TopBar 
        query={query} 
        timeAgo={timeAgo} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shareUrl={window.location.href}
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