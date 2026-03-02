import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performSearchWithStreaming } from '../searchRegularIndex.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import TopBar from '../../../../components/results/TopBar.tsx';
import TabbedContent from '../../../../components/results/TabbedContent.tsx';
import type { SearchState } from '../../../../types/index.ts';
import { logger } from '../../../../utils/logger.ts';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const isRedirectingRef = useRef(false);


  // Scroll to top on mount to ensure page starts at top position
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [searchStartTime]);  
  


  useEffect(() => {
    let isCurrentRequest = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let redirectTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const isRateLimitError = (message: string): boolean => {
      return (
        message === 'RATE_LIMIT_EXCEEDED' ||
        message === 'API error: 429' ||
        /\b429\b/.test(message)
      );
    };

    const handleRateLimit = () => {
      if (isRedirectingRef.current) {
        return;
      }

      isRedirectingRef.current = true;
      console.log('🚫 [SearchResults] RATE LIMIT DETECTED - Showing message and redirecting home');
      setIsStreaming(false);
      setStatusMessage('Too many requests right now. Please try again in a moment.');
      setSearchState({
        isLoading: false,
        error: 'We are experiencing high traffic right now. Please try again in a few moments.',
        data: null
      });

      if (redirectTimeoutId) {
        clearTimeout(redirectTimeoutId);
      }

      redirectTimeoutId = setTimeout(() => {
        navigate('/', { replace: true });

        // Hard fallback redirect in case Router navigation gets blocked by pending async work.
        setTimeout(() => {
          if (globalThis.location.pathname !== '/') {
            globalThis.location.assign('/');
          }
        }, 400);
      }, 1200);
    };

    const handleRateLimitEvent = () => {
      if (!isCurrentRequest) {
        return;
      }
      handleRateLimit();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('curios:rate-limit', handleRateLimitEvent as EventListener);
    }
    
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
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const hasRateLimitError = isRateLimitError(errorMessage);

          console.error('❌ [SearchResults] Search failed:', {
            error: errorMessage,
            query,
            timestamp: new Date().toISOString()
          });

          console.log('🔍 [SearchResults] Checking error message:', {
            errorMessage,
            isRateLimitExceeded: hasRateLimitError
          });

          logger.error('Search failed', {
            error: errorMessage,
            query
          });

          // Handle 429 rate limit error - show friendly message and redirect to home
          if (hasRateLimitError) {
            handleRateLimit();
            return;
          }

          setIsStreaming(false);
          setSearchState({
            isLoading: false,
            error: errorMessage === 'API error: 429' ? 'We are experiencing high traffic right now. Please try again in a few moments.' : (errorMessage || 'Search services are currently unavailable'),
            data: null
          });
        }
      }
    };

    fetchResults().catch((unhandledError) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (!isCurrentRequest) {
        return;
      }

      const errorMessage = unhandledError instanceof Error ? unhandledError.message : String(unhandledError);
      const hasRateLimitError = isRateLimitError(errorMessage);

      console.error('❌ [SearchResults] Unhandled rejection in fetchResults:', {
        error: errorMessage,
        query,
        isRateLimitError: hasRateLimitError,
        timestamp: new Date().toISOString()
      });

      if (hasRateLimitError) {
        handleRateLimit();
        return;
      }

      setIsStreaming(false);

      setSearchState({
        isLoading: false,
        error: errorMessage || 'Search services are currently unavailable',
        data: null
      });
    });
    
    // Cleanup function to cancel the request
    return () => {
      console.log('🧹 [SearchResults] Cleaning up request');
      isCurrentRequest = false;
      setIsStreaming(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (redirectTimeoutId) {
        clearTimeout(redirectTimeoutId);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('curios:rate-limit', handleRateLimitEvent as EventListener);
      }
      isRedirectingRef.current = false;
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