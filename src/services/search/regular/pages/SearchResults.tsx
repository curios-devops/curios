import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { performSearchWithStreaming } from '../searchRegularIndex.ts';
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
  
  // Streaming content state - shows content as it arrives
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Track found sources for inline display
  const [foundSources, setFoundSources] = useState<string[]>([]);
  
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
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
        console.log('🔍 [SearchResults] Starting STREAMING search request:', {
          query,
          hasImages: imageUrls.length > 0,
          imageCount: imageUrls.length,
          timestamp: new Date().toISOString()
        });
        
        logger.info('Starting streaming search', { query, hasImages: imageUrls.length > 0, imageCount: imageUrls.length });
        
        // Set loading state and reset streaming
        if (isCurrentRequest) {
          setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
          setStatusMessage('Initializing search...');
          setStreamingContent('');
          setIsStreaming(true);
          setFoundSources([]);
        }
        
        // Streaming callback - updates content as it arrives
        const handleStreamingChunk = (chunk: string) => {
          if (isCurrentRequest) {
            console.log('📝 [SearchResults] Streaming chunk received, length:', chunk.length);
            setStreamingContent(prev => prev + chunk);
          }
        };
        
        // Call performSearchWithStreaming with streaming callback
        const searchPromise = performSearchWithStreaming(query, {
          imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
          onStatusUpdate: (status: string) => {
            if (isCurrentRequest) {
              console.log('🔍 [SearchResults] Status update:', status);
              setStatusMessage(status);
            }
          },
          onContentChunk: handleStreamingChunk,
          onSourcesFound: (sources: string[]) => {
            if (isCurrentRequest) {
              console.log('📚 [SearchResults] Sources found:', sources.length);
              setFoundSources(sources);
            }
          }
        });
        
        // Add timeout to prevent infinite waiting
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            console.error('❌ [SearchResults] Search timeout after 60s');
            reject(new Error('Search timeout - please try again'));
          }, 60000); // 60 second timeout
        });
        
        const response = await Promise.race([searchPromise, timeoutPromise]) as any;
        
        // Clear timeout on success
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        // Only update state if this is still the current request
        if (!isCurrentRequest) {
          console.log('⚠️ [SearchResults] Request cancelled, not updating state');
          return;
        }

        console.log('✅ [SearchResults] Streaming search completed, updating state:', {
          hasResults: !!response.sources?.length,
          imageCount: response.images?.length || 0,
          videoCount: response.videos?.length || 0,
          hasAnswer: !!response.answer,
          streamedContentLength: streamingContent.length,
          timestamp: new Date().toISOString()
        });

        logger.info('Streaming search completed successfully', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasAnswer: !!response.answer
        });

        // Stop streaming and update state synchronously
        setIsStreaming(false);
        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
        
        console.log('✅✅✅ [SearchResults] State updated, UI should be interactive now');
        
      } catch (error) {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (isCurrentRequest) {
          console.error('❌ [SearchResults] Search failed:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            query,
            timestamp: new Date().toISOString()
          });
          
          logger.error('Search failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            query
          });
          
          setIsStreaming(false);
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
      console.log('🧹 [SearchResults] Cleaning up request');
      isCurrentRequest = false;
      setIsStreaming(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [query, imageUrls.join(',')]); // Re-run when query or images change

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors duration-200 overflow-x-hidden">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <TabbedContent
          searchState={searchState}
          statusMessage={statusMessage}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          foundSources={foundSources}
        />
      </main>
    </div>
  );
}