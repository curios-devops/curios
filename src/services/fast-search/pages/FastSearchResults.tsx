// FastSearch Results Page
// Displays fast search results with answer, horizontal media carousel, sources, and follow-ups

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, ChevronLeft, ChevronRight, Plus, Link2 } from 'lucide-react';
import { executeFastSearchStreaming } from '../controller';
import type { FastSearchResponse } from '../controller';
import CustomMarkdown from '../../../components/CustomMarkdown';
import TopBar from '../../../components/results/TopBar';
import { formatTimeAgo } from '../../../utils/time';
import type { CitationInfo } from '../../../commonApp/types';

// Helper to extract clean domain name from URL
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    // Handle ccTLDs like .co.uk (last part length 2)
    if (parts.length >= 3 && parts[parts.length - 1].length === 2) {
      return parts[parts.length - 3];
    }
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return parts[0] || '';
  } catch {
    return '';
  }
}

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
  const [showSearching, setShowSearching] = useState(true);
  const [foundSources, setFoundSources] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [frozenSourcesForAnimation, setFrozenSourcesForAnimation] = useState<Array<{ title: string; url: string; snippet: string }>>([]);
  const [typewriterText, setTypewriterText] = useState('');
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [images, setImages] = useState<Array<{ url: string; title: string; source: string }>>([]);
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('answer');

  // Process answer and build citations from foundSources
  const { processedAnswer, citations } = useMemo(() => {
    if (!streamingAnswer) return { processedAnswer: '', citations: [] };

    // Build citations map from foundSources
    const cites: CitationInfo[] = foundSources.map(source => {
      const hostname = (() => {
        try {
          return new URL(source.url).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      })();
      const parts = hostname.split('.');

      // Extract siteName: prefer first part (subdomain like 'azure') over root domain
      // Examples: azure.microsoft.com -> azure, wikipedia.org -> wikipedia
      const siteName = parts[0] || '';

      return {
        url: source.url,
        title: source.title,
        siteName: siteName,
        snippet: source.snippet
      };
    });

    let text = streamingAnswer;

    // Step 1: Convert [text](url) to [sitename] (for any markdown links)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
      try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const parts = hostname.split('.');
        const siteName = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
        return `[${siteName}]`;
      } catch {
        return linkText;
      }
    });

    // Step 2: Remove parenthetical citations only if they look like citations
    // Match: (sitename), (sitename +N), (sitename(url))
    text = text.replace(/\s*\(([a-z0-9]+)(\s*\+\d+)?(\([^)]+\))?\)/gi, '');

    // Step 3: Remove horizontal rules (---) but preserve markdown headings
    // Only remove lines that are ONLY dashes/hyphens with optional whitespace
    text = text.replace(/^\s*[-–—]{3,}\s*$/gm, '');

    // Step 4: Remove unwanted sections
    // Remove "Follow-up Questions" section (these are shown separately in the UI)
    text = text.replace(/\n\s*##?\s*Follow-?up.*?(?:Questions?|Topics?).*$/si, '');
    text = text.replace(/\*\*Follow-?up.*?(?:Questions?|Topics?)\*\*.*$/si, '');

    // Remove "Selected sources" section
    text = text.replace(/\n\s*##?\s*Selected [Ss]ources.*$/s, '');
    text = text.replace(/\*\*Selected [Ss]ources\*\*.*$/s, '');

    // Remove "Where to read more" section (with variations)
    text = text.replace(/\n\s*##?\s*Where to [Rr]ead [Mm]ore.*$/s, '');
    text = text.replace(/\*\*Where to [Rr]ead [Mm]ore.*$/s, '');

    // Remove "Quick reference links" section
    text = text.replace(/\n\s*##?\s*Quick [Rr]eference [Ll]inks.*$/s, '');
    text = text.replace(/\*\*Quick [Rr]eference [Ll]inks\*\*.*$/s, '');

    // Remove "Sources:" section at the end
    text = text.replace(/\n\s*Sources:\s*.*$/s, '');
    text = text.replace(/\*\*Sources:\*\*\s*.*$/s, '');

    // Clean up encoding issues
    text = text.replace(/�/g, '');

    return { processedAnswer: text, citations: cites };
  }, [streamingAnswer, foundSources]);

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

  // Typewriter effect for source names - no loop, just cycle through once
  useEffect(() => {
    if (frozenSourcesForAnimation.length === 0 || !showSearching) {
      return;
    }

    // Stop after going through all sources once
    if (currentSourceIndex >= frozenSourcesForAnimation.length) {
      return;
    }

    const currentSource = frozenSourcesForAnimation[currentSourceIndex];
    if (!currentSource) return;

    const sourceName = currentSource.title.substring(0, 30); // Max 30 chars
    let charIndex = 0;
    let isTyping = true;
    let pauseTimeout: NodeJS.Timeout | null = null;

    const typeInterval = setInterval(() => {
      if (isTyping) {
        // Typing phase
        if (charIndex < sourceName.length) {
          setTypewriterText(sourceName.substring(0, charIndex + 1));
          charIndex++;
        } else {
          // Pause before erasing
          pauseTimeout = setTimeout(() => {
            isTyping = false;
            charIndex = sourceName.length;
          }, 500);
        }
      } else {
        // Erasing phase
        if (charIndex > 0) {
          setTypewriterText(sourceName.substring(0, charIndex - 1));
          charIndex--;
        } else {
          // Move to next source (no loop - just increment)
          setCurrentSourceIndex((prev) => prev + 1);
          isTyping = true;
        }
      }
    }, 40); // 40ms per character (faster)

    return () => {
      clearInterval(typeInterval);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [frozenSourcesForAnimation, currentSourceIndex, showSearching]);

  // Execute search with streaming
  useEffect(() => {
    if (!query.trim()) {
      setError('Please enter a search query');
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setStreamingAnswer('');
        setShowSearching(true);
        setFoundSources([]);
        setFrozenSourcesForAnimation([]);

        let isFirstChunk = true;
        const response = await executeFastSearchStreaming(
          {
            query,
            locale: navigator.language.split('-')[0] || 'en'
          },
          (chunk: string) => {
            // Hide searching animation on first chunk - stream starts immediately
            if (isFirstChunk) {
              setShowSearching(false);
              isFirstChunk = false;
            }
            setStreamingAnswer(prev => prev + chunk);
          },
          (sources: Array<{ title: string; url: string; snippet: string }>) => {
            // Called when sources are found (before streaming starts)
            setFoundSources(sources);
            // Freeze sources for animation to prevent re-renders
            if (frozenSourcesForAnimation.length === 0) {
              setFrozenSourcesForAnimation(sources);
            }
          },
          (images: Array<{ url: string; title: string; source: string }>) => {
            // Called when images are found (parallel with sources)
            setImages(images);
          }
        );
        // Set follow-ups AFTER streaming completes
        if (response.followUps && response.followUps.length > 0) {
          setFollowUpQuestions(response.followUps);
        }

        setResults({
          answer: '',
          sources: response.sources,
          images: response.images,
          videos: response.videos,
          followUps: response.followUps
        });
        setIsLoading(false);
      } catch (err) {
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
    <div className="min-h-screen bg-white dark:bg-[#111111] fast-search-page">
      <style>{`
        .fast-search-page nav button:first-child {
          display: none;
        }
      `}</style>
      <TopBar
        query={query}
        timeAgo={timeAgo}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shareUrl={window.location.href}
        shareTitle={`FastSearch: ${query}`}
        shareText={streamingAnswer.slice(0, 100) + '...' || ''}
        images={images.slice(0, 1)}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Loading indicator - animated sources counter */}
        {showSearching && activeTab === 'answer' && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            {frozenSourcesForAnimation.length === 0 ? (
              <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
                <span>Searching trusted sources...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.4 }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">Analyzing</span>
                    <span className="text-base font-medium text-gray-900 dark:text-white min-w-[200px]">
                      {typewriterText}<span className="animate-pulse">|</span>
                    </span>
                  </div>
                </div>

                {/* Frozen favicons - rendered once, no re-renders */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    {frozenSourcesForAnimation.slice(0, 3).map((source, index) => {
                      try {
                        const domain = new URL(source.url).hostname.replace('www.', '');
                        return (
                          <div
                            key={source.url}
                            className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                            style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
                          >
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                              alt=""
                              className="w-4 h-4"
                            />
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })}
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    +{frozenSourcesForAnimation.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Images at top - between tabs and content */}
        {!isLoading && images.length > 0 && activeTab === 'answer' && (
          <ImagesCarousel images={images} />
        )}

        {/* Overview Tab - AI Overview with follow-ups */}
        {activeTab === 'answer' && (
          <>
            {/* AI Overview - appears when streaming starts */}
            {!showSearching && (
              <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
                    <h2 className="text-xl font-medium text-gray-900 dark:text-white">AI Overview</h2>
                  </div>

                  {/* Source count with icons */}
                  {foundSources.length > 0 && (
                    <div className="flex items-center gap-2">
                      {/* Stacked favicons - show first 3 overlapping */}
                      <div className="flex items-center">
                        {foundSources.slice(0, 3).map((source, index) => {
                          const domain = (() => {
                            try {
                              return new URL(source.url).hostname.replace('www.', '');
                            } catch {
                              return '';
                            }
                          })();
                          return (
                            <div
                              key={index}
                              className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center overflow-hidden"
                              style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
                            >
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                                alt=""
                                className="w-4 h-4"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* +N badge showing total sources */}
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        +{foundSources.length}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="prose dark:prose-invert max-w-none">
                    <CustomMarkdown citations={citations}>
                      {processedAnswer}
                    </CustomMarkdown>
                    {isLoading && (
                      <span className="inline-block w-2 h-4 ml-1 animate-pulse align-middle" style={{ backgroundColor: 'var(--accent-primary)' }}></span>
                    )}
                  </div>
                </div>

                {/* Quick Links Section - show first 4 sources */}
                {!isLoading && foundSources.length > 0 && (
                  <div className="p-6 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <Link2 size={12} style={{ color: 'var(--accent-primary)' }} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Quick Links</h3>
                    </div>

                    {/* 4-column grid of source cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {foundSources.slice(0, 4).map((source, index) => {
                        const cleanDomain = extractDomainName(source.url);
                        const fullDomain = (() => {
                          try {
                            return new URL(source.url).hostname.replace('www.', '');
                          } catch {
                            return '';
                          }
                        })();

                        return (
                          <a
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex flex-col rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-md overflow-hidden cursor-pointer"
                          >
                            <div className="p-3 flex-1 flex flex-col">
                              {/* Favicon + Domain */}
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="flex-shrink-0 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                                    alt=""
                                    className="w-3 h-3"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                                  {cleanDomain}
                                </span>
                              </div>

                              {/* Title */}
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 transition-colors group-hover:text-[var(--accent-primary)]">
                                {source.title}
                              </h4>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Follow-up Questions - only after streaming completes */}
            {!isLoading && followUpQuestions.length > 0 && (
          <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                <div className="w-2.5 h-2.5 grid grid-cols-2 gap-0.5">
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                  <div className="rounded-sm" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Follow-Ups</h3>
            </div>

            <div className="space-y-0">
              {followUpQuestions.map((question, index) => (
                <div key={index}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between py-2.5 px-0 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                    onClick={() => handleFollowUpClick(question)}
                    onMouseEnter={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = 'var(--accent-primary)';
                      if (circle) {
                        circle.style.borderColor = 'var(--accent-primary)';
                        circle.style.backgroundColor = 'var(--accent-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const span = e.currentTarget.querySelector('.question-text') as HTMLElement;
                      const circle = e.currentTarget.querySelector('.plus-circle') as HTMLElement;
                      if (span) span.style.color = '';
                      if (circle) {
                        circle.style.borderColor = '';
                        circle.style.backgroundColor = '';
                      }
                    }}
                  >
                    <span className="question-text text-sm text-gray-700 dark:text-gray-300 transition-colors leading-relaxed">
                      {question}
                    </span>
                    <div className="plus-circle flex-shrink-0 w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center transition-colors ml-3">
                      <Plus size={10} className="text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                  {index < followUpQuestions.length - 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-800"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
            )}
          </>
        )}

        {/* Images Tab */}
        {activeTab === 'images' && images.length > 0 && (
          <ImagesGrid images={images} />
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && results?.videos && results.videos.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Videos</h3>
            <div className="grid grid-cols-1 gap-4">
              {results.videos.map((video, index) => (
                <a
                  key={index}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
                >
                  {video.thumbnail && (
                    <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white">{video.title}</h4>
                    {video.source && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{video.source}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Sources Tab - use real search results from Tavily/Brave */}
        {activeTab === 'news' && results?.sources && results.sources.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white px-1">Sources</h3>
            <div className="grid grid-cols-1 gap-3">
              {results.sources.map((source, index) => {
                const extractDomain = (url: string) => {
                  try {
                    return new URL(url).hostname.replace('www.', '');
                  } catch {
                    return 'Unknown';
                  }
                };

                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-[#0a0a0a]"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${extractDomain(source.url)}&sz=32`}
                        alt=""
                        className="w-4 h-4"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">{source.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{extractDomain(source.url)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{source.snippet}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Images Carousel Component
function ImagesCarousel({ images }: { images: Array<{ url: string; title: string; source: string }> }) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [imageDimensions, setImageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map());
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

  const handleImageLoad = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageDimensions(prev => new Map(prev).set(index, { width: img.naturalWidth, height: img.naturalHeight }));
  };

  const getImageClass = (index: number) => {
    const dims = imageDimensions.get(index);
    if (!dims) return 'w-48 h-40'; // Default landscape while loading

    const aspectRatio = dims.width / dims.height;
    const fixedHeight = 'h-40'; // Same height for all: 160px

    if (aspectRatio > 1.3) {
      // Landscape - wider
      return `w-56 ${fixedHeight}`;
    } else if (aspectRatio < 0.7) {
      // Portrait - narrower
      return `w-28 ${fixedHeight}`;
    } else {
      // Square
      return `w-40 ${fixedHeight}`;
    }
  };

  return (
    <div className="space-y-3">
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
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory items-center"
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
              <div className={`${getImageClass(index)} rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors`}>
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onLoad={(e) => handleImageLoad(index, e)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
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

// Images Grid Component
function ImagesGrid({ images }: { images: Array<{ url: string; title: string; source: string }> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {images.map((image, index) => (
        <a
          key={index}
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
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
        </a>
      ))}
    </div>
  );
}
