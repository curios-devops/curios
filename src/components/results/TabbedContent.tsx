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
  onTabChange,
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
                onSourcesClick={() => onTabChange('news')}
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
            {/* Sources List - Cards with images on right */}
            <div className="space-y-3">
              {data.sources.slice(0, 6).map((source: Source, index: number) => {
                const cleanDomain = extractDomainName(source.url);
                const fullDomain = new URL(source.url).hostname.replace('www.', '');
                return (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-md cursor-pointer"
                  >
                    {/* Left side - content */}
                    <div className="flex-1 min-w-0">
                      {/* Favicon + Domain name */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                            alt=""
                            className="w-4 h-4 rounded-sm"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {cleanDomain}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:inline">
                          {source.url.length > 40 ? source.url.slice(0, 40) + '...' : source.url}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 
                        className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-1 line-clamp-2 transition-colors hover:underline"
                      >
                        {source.title}
                      </h3>
                      
                      {/* Snippet */}
                      {source.snippet && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {source.snippet}
                        </p>
                      )}
                    </div>
                    
                    {/* Right side - image thumbnail */}
                    {source.image && (
                      <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
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
                    )}
                  </a>
                );
              })}
            </div>

            {/* Images Grid - Show first 4 valid images */}
            {validImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

            {/* AI Overview Section */}
            <div>
              <AIOverview 
                answer={data.answer} 
                sources={data.sources} 
                query={new URLSearchParams(globalThis.location.search).get('q') || ''} 
                followUpQuestions={data.followUpQuestions}
                citations={data.citations}
                onSourcesClick={() => onTabChange('news')}
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
          <div className="space-y-3">
            {data.sources.slice(0, 9).map((source: Source, index: number) => {
              const cleanDomain = extractDomainName(source.url);
              const fullDomain = new URL(source.url).hostname.replace('www.', '');
              return (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-md cursor-pointer"
                >
                  {/* Left side - content */}
                  <div className="flex-1 min-w-0">
                    {/* Favicon + Domain name */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                          alt=""
                          className="w-4 h-4 rounded-sm"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {cleanDomain}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {source.url.length > 40 ? source.url.slice(0, 40) + '...' : source.url}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <h3 
                      className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-1 line-clamp-2 transition-colors hover:underline"
                    >
                      {source.title}
                    </h3>
                    
                    {/* Snippet */}
                    {source.snippet && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                        {source.snippet}
                      </p>
                    )}
                  </div>
                  
                  {/* Right side - image thumbnail */}
                  {source.image && (
                    <div className="flex-shrink-0 w-28 h-28 sm:w-32 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
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
                  )}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
