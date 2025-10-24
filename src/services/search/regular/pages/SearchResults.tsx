import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { performSearch } from '../searchRegularIndex.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import { generateShareableMetaTags, updateLinkedInMetaTags, generateDynamicOGImage } from '../../../../utils/metaTags.ts';
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

  // Refs to track component mounting state
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debug: Log state changes (reduced frequency to prevent memory leak)
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('SearchResults state changed', {
        isLoading: searchState.isLoading,
        hasError: !!searchState.error,
        hasData: !!searchState.data
      });
    }
  }, [searchState.isLoading, searchState.error]); // Only log on loading/error changes, not status messages

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        setTimeAgo(formatTimeAgo(searchStartTime));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [searchStartTime]);  // Update meta tags when search data loads
  useEffect(() => {
    if (searchState.data && !searchState.isLoading && query && isMountedRef.current) {
      // Debounce meta tag updates to prevent excessive DOM manipulation
      const timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return;
        
        try {
          // Get the first search result image for dynamic OG image
          const data = searchState.data!; // We know it's not null from the condition above
          const firstResultImage = data.images?.[0]?.url;
          const firstSourceImage = data.sources?.find(source => source.image)?.image;
          const dynamicImage = generateDynamicOGImage(
            query, 
            data.answer?.slice(0, 100) // Only use the first 100 chars of answer as snippet
          );
          
          const metaTags = generateShareableMetaTags(
            query,
            data.answer,
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
        } catch (error) {
          logger.warn('Failed to update meta tags', { error });
        }
      }, 500); // 500ms debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchState.data, searchState.isLoading, query]);

  // Debug TopBar props when they change (reduced logging)
  useEffect(() => {
    if (import.meta.env.DEV) {
      logger.debug('SearchResults TopBar props updated', {
        query,
        hasData: !!searchState.data,
        dataLoaded: !searchState.isLoading
      });
    }
  }, [query, searchState.data, searchState.isLoading]);

  useEffect(() => {
    let isCurrentRequest = true;
    
    const fetchResults = async () => {
      if (!query.trim() && imageUrls.length === 0) {
        if (isCurrentRequest && isMountedRef.current) {
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
        
        if (isCurrentRequest && isMountedRef.current) {
          setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        }
        
        const response = await performSearch(query, {
          isPro: false,
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          onStatusUpdate: (status: string) => {
            if (isCurrentRequest && isMountedRef.current) {
              logger.debug('Search status update', { status });
              setStatusMessage(status);
            }
          }
        });

        console.log('🔍 SearchResults received response:', {
          hasSources: !!response.sources?.length,
          sourcesCount: response.sources?.length || 0,
          hasImages: !!response.images?.length,
          imagesCount: response.images?.length || 0,
          hasVideos: !!response.videos?.length,
          videosCount: response.videos?.length || 0,
          hasAnswer: !!response.answer,
          responseType: typeof response
        });

        // Only update state if this is still the current request and component is mounted
        if (!isCurrentRequest || !isMountedRef.current) {
          console.log('🚫 SearchResults: Request cancelled or component unmounted');
          return;
        }

        logger.info('Search completed successfully', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasAnswer: !!response.answer
        });

        // Use functional update to ensure state consistency
        setSearchState(prevState => {
          if (!isCurrentRequest || !isMountedRef.current) {
            console.log('🚫 setSearchState: Request cancelled or component unmounted');
            return prevState; // Don't update if component unmounted
          }
          
          console.log('📊 setSearchState: Updating state with response data');
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
        if (isCurrentRequest && isMountedRef.current) {
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