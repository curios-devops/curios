import { Video } from 'lucide-react';
import AIOverview from '../AIOverview';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import type { SearchState, Source, ImageResult, VideoResult } from '../../types';

interface TabbedContentProps {
  searchState: SearchState;
  statusMessage: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function TabbedContent({ 
  searchState, 
  statusMessage,
  activeTab
}: TabbedContentProps) {

  // Debug logging for TabbedContent
  console.log('TabbedContent render:', {
    isLoading: searchState.isLoading,
    hasError: !!searchState.error,
    hasData: !!searchState.data,
    statusMessage
  });

  if (searchState.isLoading) {
    console.log('TabbedContent: Showing loading state with message:', statusMessage);
    return <LoadingState message={statusMessage} />;
  }

  if (searchState.error) {
    console.log('TabbedContent: Showing error state:', searchState.error);
    return (
      <ErrorState 
        message={searchState.error} 
        onRetry={() => globalThis.location.reload()} 
      />
    );
  }

  if (!searchState.data) {
    console.log('TabbedContent: No data available');
    return null;
  }

  console.log('TabbedContent: Rendering main content with data:', {
    sourcesCount: searchState.data.sources.length,
    imagesCount: searchState.data.images.length,
    hasAnswer: !!searchState.data.answer
  });

  // Add a visual debugging indicator
  console.log('TabbedContent: About to render main UI with activeTab:', activeTab);

  const { data } = searchState;

  return (
    <div className="flex-1">
      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'answer' && (
          <div className="space-y-6">
            {/* Perplexity-style Sources Grid at Top */}
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 mb-6">
                {data.sources.slice(0, 4).map((source: Source, index: number) => {
                  console.log('TabbedContent: Processing source', index, {
                    title: source.title,
                    url: source.url,
                    hasSnippet: !!source.snippet
                  });
                  const domain = new URL(source.url).hostname.replace('www.', '');
                  return (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 bg-white dark:bg-gray-800 hover:shadow-sm"
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
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
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
                      <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-[#0095FF] transition-colors">
                        {source.title}
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* Images Grid - Show first 4 images */}
              {data.images && data.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {data.images.slice(0, 4).map((image: ImageResult, index: number) => (
                    <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                      <img
                        src={image.url}
                        alt={image.alt || ''}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => globalThis.open(image.url, '_blank')}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA3NEg2M0M2MS44OTU0IDc0IDYxIDc0Ljg5NTQgNjEgNzZWMTI0QzYxIDEyNS4xMDUgNjEuODk1NCAxMjYgNjMgMTI2SDEzN0MxMzguMTA1IDEyNiAxMzkgMTI1LjEwNSAxMzkgMTI0Vjc2QzEzOSA3NC44OTU0IDEzOC4xMDUgNzQgMTM3IDc0SDExM00xMTMgNzRWNzBDMTEzIDY4Ljg5NTQgMTEyLjEwNSA2OCAxMTEgNjhIODlDODcuODk1NCA2OCA4NyA2OC44OTU0IDg3IDcwVjc0TTExMyA3NEg4N00xMDAgOTBWMTA2TTkzIDk4TDEwNyA5OCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Overview Section */}
            <div>
              {(() => {
                try {
                  console.log('TabbedContent: About to render AIOverview with:', {
                    hasAnswer: !!data.answer,
                    answerLength: data.answer?.length,
                    sourcesCount: data.sources?.length,
                    query: new URLSearchParams(globalThis.location.search).get('q') || ''
                  });
                  
                  // Test with minimal version first
                  const useMinimalVersion = false; // Set to true to test
                  
                  if (useMinimalVersion) {
                    console.log('TabbedContent: Using minimal AIOverview version');
                    return (
                      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                        <h2 className="text-xl font-medium mb-4">AI Overview (Minimal Test)</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{data.answer}</p>
                        <div className="text-sm text-gray-500">
                          Sources: {data.sources.length} | Query: {new URLSearchParams(globalThis.location.search).get('q') || ''}
                        </div>
                      </div>
                    );
                  }
                  
                  console.log('TabbedContent: Using full AIOverview component');
                  return (
                    <AIOverview 
                      answer={data.answer} 
                      sources={data.sources} 
                      query={new URLSearchParams(globalThis.location.search).get('q') || ''} 
                      followUpQuestions={data.followUpQuestions}
                    />
                  );
                } catch (error) {
                  console.error('TabbedContent: Error rendering AIOverview:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                  return (
                    <div className="p-4 border border-red-300 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-700">
                      <p className="text-red-700 dark:text-red-300">Error rendering AI Overview: {errorMessage}</p>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Images</h3>
            {data.images && data.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.images.map((image: ImageResult, index: number) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => globalThis.open(image.url, '_blank')}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA3NEg2M0M2MS44OTU0IDc0IDYxIDc0Ljg5NTQgNjEgNzZWMTI0QzYxIDEyNS4xMDUgNjEuODk1NCAxMjYgNjMgMTI2SDEzN0MxMzguMTA1IDEyNiAxMzkgMTI1LjEwNSAxMzkgMTI0Vjc2QzEzOSA3NC44OTU0IDEzOC4xMDUgNzQgMTM3IDc0SDExM00xMTMgNzRWNzBDMTEzIDY4Ljg5NTQgMTEyLjEwNSA2OCAxMTEgNjhIODlDODcuODk1NCA2OCA4NyA2OC44OTU0IDg3IDcwVjc0TTExMyA3NEg4N00xMDAgOTBWMTA2TTkzIDk4TDEwNyA5OCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
                      }}
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
                        className="text-sm font-medium text-gray-900 dark:text-white hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors"
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
                    <div className="flex-shrink-0 w-6 h-6 bg-[#0095FF] text-white rounded text-xs font-medium flex items-center justify-center mt-1">
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
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
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
                        className="text-lg font-medium text-gray-900 dark:text-white hover:text-[#0095FF] dark:hover:text-[#0095FF] transition-colors block mb-2"
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
