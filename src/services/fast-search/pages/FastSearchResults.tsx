// FastSearch Results Page
// Displays fast search results with answer, horizontal media carousel, sources, and follow-ups

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { executeFastSearchStreaming } from '../controller';
import type { FastSearchResponse } from '../controller';
import CustomMarkdown from '../../../components/CustomMarkdown';
import TopBar from '../../../components/results/TopBar';
import { logger } from '../../../utils/logger';
import { formatTimeAgo } from '../../../utils/time';

export default function FastSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';

  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FastSearchResponse | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState('');

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  // Execute search with streaming
  useEffect(() => {
    if (!query.trim()) {
      setError('Please enter a search query');
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        logger.info('FastSearch: Starting streaming search', { query });
        setIsLoading(true);
        setError(null);
        setStreamingAnswer('');

        // Execute streaming search (web search + answer generation)
        const response = await executeFastSearchStreaming(
          {
            query,
            locale: navigator.language.split('-')[0] || 'en'
          },
          (chunk: string) => {
            // Stream answer chunks as they arrive
            setStreamingAnswer(prev => prev + chunk);
          }
        );

        // Once streaming completes, set final results
        setResults({
          answer: '', // Answer already streamed to streamingAnswer
          sources: response.sources,
          images: response.images,
          videos: response.videos,
          followUps: response.followUps
        });
        setIsLoading(false);
      } catch (err) {
        logger.error('FastSearch: Search failed', {
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        setError(err instanceof Error ? err.message : 'Search failed');
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const handleFollowUpClick = (question: string) => {
    navigate(`/fast-search?q=${encodeURIComponent(question)}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#111111]">
      <TopBar
        query={query}
        timeAgo={timeAgo}
        onNewSearch={(newQuery) => navigate(`/fast-search?q=${encodeURIComponent(newQuery)}`)}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <LoadingSkeleton />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Results */}
        {(streamingAnswer || results) && (
          <>
            {/* AI Answer (streaming or complete) */}
            <AIAnswerCard
              answer={streamingAnswer || results?.answer || ''}
              sources={results?.sources || []}
              isStreaming={isLoading && !!streamingAnswer}
            />

            {/* Images Carousel */}
            {results && results.images.length > 0 && (
              <ImagesCarousel images={results.images} />
            )}

            {/* Sources Carousel */}
            {results && results.sources.length > 0 && (
              <SourcesCarousel sources={results.sources} />
            )}

            {/* Follow-up Questions */}
            {results && results.followUps.length > 0 && (
              <FollowUpQuestions
                questions={results.followUps}
                onClick={handleFollowUpClick}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// AI Answer Card Component
function AIAnswerCard({ answer, sources, isStreaming }: { answer: string; sources: Array<{ title: string; url: string }>; isStreaming?: boolean }) {
  return (
    <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-800">
        <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">
          {isStreaming ? 'Generating answer...' : 'AI Overview'}
        </h2>

        {/* Source count */}
        {sources.length > 0 && (
          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {sources.length} source{sources.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="p-6 prose dark:prose-invert max-w-none">
        <CustomMarkdown content={answer} />
        {isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-gray-400 dark:bg-gray-600 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// Images Carousel Component
function ImagesCarousel({ images }: { images: Array<{ url: string; title: string; source: string }> }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Images</h3>

      <div className="relative group">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Carousel container */}
        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((image, index) => (
            <a
              key={index}
              href={image.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-start"
            >
              <div className="w-48 h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate w-48">
                {image.source}
              </p>
            </a>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

// Sources Carousel Component
function SourcesCarousel({ sources }: { sources: Array<{ title: string; url: string; snippet: string }> }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 300;
    const newPosition = direction === 'left'
      ? Math.max(0, scrollPosition - scrollAmount)
      : scrollPosition + scrollAmount;

    containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Sources</h3>

      <div className="relative group">
        {/* Left scroll button */}
        {scrollPosition > 0 && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Carousel container */}
        <div
          ref={containerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sources.map((source, index) => (
            <a
              key={index}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 snap-start w-72 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
            >
              <div className="flex items-start gap-2 mb-2">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${extractDomain(source.url)}&sz=32`}
                  alt=""
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 mb-1">
                    {source.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {extractDomain(source.url)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                {source.snippet}
              </p>
            </a>
          ))}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
    </div>
  );
}

// Follow-up Questions Component
function FollowUpQuestions({ questions, onClick }: { questions: string[]; onClick: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 px-1">Related searches</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onClick(question)}
            className="text-left p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#0a0a0a] transition-colors"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">{question}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Loading Skeleton Component
function LoadingSkeleton() {
  return (
    <>
      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </>
  );
}
