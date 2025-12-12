import { useState, useMemo } from 'react';
import { Video } from 'lucide-react';
import AIOverview from '../AIOverview.tsx';
import ErrorState from './ErrorState.tsx';
import type { SearchState, Source, ImageResult, VideoResult } from '../../types/index.ts';

// Helper to deduplicate images by URL
function deduplicateImages(images: ImageResult[]): ImageResult[] {
  const seen = new Set<string>();
  return images.filter(image => {
    if (!image.url || seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
}

// Helper to extract clean domain name from URL
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and .com/.org/.net etc
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
      .split('.')[0]; // Take first part if still has dots
  } catch {
    return '';
  }
}

export interface TabbedContentProps {
  searchState: SearchState;
  statusMessage: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
  streamingContent?: string;
  isStreaming?: boolean;
  foundSources?: string[]; // URLs of sources found so far
}

export default function TabbedContent({ 
  searchState, 
  statusMessage,
  activeTab,
  streamingContent,
  isStreaming,
  foundSources = []
}: TabbedContentProps) {

  // Track broken image URLs to hide them
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // Deduplicate and filter out broken images
  const validImages = useMemo(() => {
    if (!searchState.data?.images) return [];
    return deduplicateImages(searchState.data.images).filter(img => !brokenImages.has(img.url));
  }, [searchState.data?.images, brokenImages]);

  // Handle image error - add to broken set
  const handleImageError = (imageUrl: string) => {
    setBrokenImages(prev => new Set([...prev, imageUrl]));
  };

  // Extract clean source names for display
  const sourceNames = foundSources
    .map(extractDomainName)
    .filter(name => name.length > 0)
    .slice(0, 4); // Show max 4 sources

  // Show streaming content while loading (if available)
  if (searchState.isLoading && streamingContent && streamingContent.length > 0) {
    // Show partial content with streaming indicator
    return (
      <div className="flex-1">
        <div className="space-y-6">
          <div className="space-y-4">
            {/* Streaming indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <div className="animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
                <span>Generating answer...</span>
              </div>
            </div>
            
            {/* AI Overview with streaming content */}
            <div>
              <AIOverview 
                answer={streamingContent} 
                sources={[]} 
                query={new URLSearchParams(globalThis.location.search).get('q') || ''} 
                followUpQuestions={[]}
                citations={[]}
                isStreaming={isStreaming ?? true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show inline loading status (no modal)
  if (searchState.isLoading) {
    return (
      <div className="flex-1">
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-8 transition-colors duration-200">
          <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <div className="relative">
              <div className="w-3 h-3 rounded-full animate-ping absolute" style={{ backgroundColor: 'var(--accent-primary)', opacity: 0.4 }}></div>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }}></div>
            </div>
            <span className="text-base">
              {statusMessage}
              {sourceNames.length > 0 && (
                <span className="ml-2 text-gray-500 dark:text-gray-500">
                  · found {sourceNames.join(', ')}
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (searchState.error) {
    return (
      <ErrorState 
        message={searchState.error} 
        onRetry={() => globalThis.location.reload()} 
      />
    );
  }

  if (!searchState.data) {
    return null;
  }


  const { data } = searchState;

  return (
    <div className="flex-1">
      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'answer' && (
          <div className="space-y-6">
            {/* Perplexity-style Sources Grid at Top */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                {data.sources.slice(0, 4).map((source: Source, index: number) => {
                  const domain = new URL(source.url).hostname.replace('www.', '');
                  return (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-sm cursor-pointer"
                    >
                      {/* Show source image if available, otherwise show favicon */}
                      {source.image ? (
                        <div className="aspect-video rounded mb-2 overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <img
                            src={source.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.parentElement!.style.display = 'none';
                              // Fallback to favicon
                              const faviconContainer = document.createElement('div');
                              faviconContainer.className = 'flex items-center justify-center w-full h-full';
                              faviconContainer.innerHTML = `
                                <img
                                  src="https://www.google.com/s2/favicons?domain=${domain}&sz=16"
                                  alt=""
                                  class="w-4 h-4"
                                  loading="lazy"
                                  onerror="this.style.display='none'"
                                />
                              `;
                              target.parentElement!.parentElement!.appendChild(faviconContainer);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 mb-2">
                          <div className="flex-shrink-0 w-4 h-4 bg-gray-100 dark:bg-gray-700 rounded-sm flex items-center justify-center">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                              alt=""
                              className="w-3 h-3"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                // Hide the image element on error to prevent console errors
                                target.style.display = 'none';
                                // Don't try fallback, just hide the favicon
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {domain}
                            </div>
                          </div>
                        </div>
                      )}
                      <div 
                        className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 transition-colors"
                        style={{ ['--tw-hover-color' as string]: 'var(--accent-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = ''}
                      >
                        {source.title}
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Images Grid - Show first 4 valid images */}
              {validImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {validImages.slice(0, 4).map((image: ImageResult) => (
                    <div key={image.url} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                      <img
                        src={image.url}
                        alt={image.alt || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => globalThis.open(image.url, '_blank')}
                        onError={() => handleImageError(image.url)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Overview Section */}
            <div>
              <AIOverview 
                answer={data.answer} 
                sources={data.sources} 
                query={new URLSearchParams(globalThis.location.search).get('q') || ''} 
                followUpQuestions={data.followUpQuestions}
                citations={data.citations}
              />
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Images</h3>
            {validImages.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {validImages.map((image: ImageResult) => (
                  <div key={image.url} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => globalThis.open(image.url, '_blank')}
                      onError={() => handleImageError(image.url)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No images found for this search.
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Videos</h3>
            {data.videos && data.videos.length > 0 ? (
              <div className="grid gap-4">
                {data.videos.map((video: VideoResult, index: number) => (
                  <div key={index} className="flex gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex-shrink-0 w-32 h-20 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-gray-900 dark:text-white transition-colors hover:opacity-90"
                        style={{ ['--hover-color' as string]: 'var(--accent-primary)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = ''}
                      >
                        {video.title}
                      </a>
                      {video.duration && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Duration: {video.duration}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No videos found for this search.
              </div>
            )}
          </div>
        )}

        {activeTab === 'news' && (
          <div className="space-y-4">
            <div className="grid gap-4">
              {data.sources.slice(0, 9).map((source: Source, index: number) => {
                const domain = new URL(source.url).hostname.replace('www.', '');
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-gray-800"
                  >
                    {/* Number indicator */}
                    <div 
                      className="flex-shrink-0 w-6 h-6 text-white rounded text-xs font-medium flex items-center justify-center mt-1"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      {index + 1}
                    </div>
                    
                    {/* Source Image */}
                    {source.image ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img
                          src={source.image}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                            alt=""
                            className="w-5 h-5 rounded"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              // Silently hide favicon on error to prevent console noise
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {domain}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-gray-900 dark:text-white transition-colors block mb-2"
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = ''}
                      >
                        {source.title}
                      </a>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {source.snippet}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
