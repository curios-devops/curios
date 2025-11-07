import { useState } from 'react';
import { FileText, Search, LucideIcon } from 'lucide-react';

// Helper function to calculate reading and listening time
const calculateReadingTime = (text: string) => {
  const wordsPerMinute = 200;
  const listeningWordsPerMinute = 150;
  
  const plainText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = plainText.split(' ').filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  const totalListeningSeconds = Math.ceil(words / listeningWordsPerMinute * 60);
  const listeningMinutes = Math.floor(totalListeningSeconds / 60);
  const listeningSeconds = totalListeningSeconds % 60;
  
  return { 
    readingTime, 
    listeningTime: `${listeningMinutes}:${String(listeningSeconds).padStart(2, '0')}` 
  };
};

const getCurrentDateTime = () => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return now.toLocaleDateString('en-US', options).toUpperCase();
};

interface InsightsTabbedContentProps {
  result: any;
  progressState: any;
  loading: boolean;
}

export default function InsightsTabbedContent({ 
  result, 
  progressState,
  loading 
}: InsightsTabbedContentProps) {
  const [activeTab, setActiveTab] = useState<'curios' | 'steps' | 'sources' | 'images'>('curios');

  const handleFollowUpClick = (question: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', question);
    searchParams.set('type', 'insights');
    window.location.href = `/insights-results?${searchParams.toString()}`;
  };

  // Get the main image (first valid image) - TEMPORARILY COMMENTED OUT
  // const mainImage = result?.images?.[0];

  const tabs = [
    { 
      id: 'curios' as const, 
      label: 'Curios AI', 
      icon: (
        <img 
          src="/compass.svg" 
          alt="Compass" 
          className="w-4 h-4"
        />
      ) as React.ReactElement,
      customLabel: (
        <span>
          Curios<span className="text-[#0095FF]">AI</span>
        </span>
      )
    },
    { id: 'steps' as const, label: 'Steps', icon: FileText as LucideIcon },
    { 
      id: 'sources' as const, 
      label: `Sources${result?.sources?.length ? ` · ${result.sources.length}` : ''}`, 
      icon: Search as LucideIcon
    }
    // TEMPORARILY COMMENTED OUT - Testing if images tab causes render freeze
    // { 
    //   id: 'images' as const, 
    //   label: `Images${result?.images?.length ? ` · ${result.images.length}` : ''}`, 
    //   icon: Image as LucideIcon
    // }
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-400">
          Generating comprehensive report...
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  isActive
                    ? 'text-[#0095FF] bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center">
                  {typeof Icon === 'function' ? (
                    <Icon size={16} className={isActive ? 'text-[#0095FF]' : ''} />
                  ) : (
                    Icon
                  )}
                </span>
                <span className="hidden sm:inline">
                  {tab.customLabel || tab.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0095FF]"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'curios' && (
          <div className="space-y-6">
            {/* Two-column layout for header */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
              {/* Left Column: Text Info */}
              <div className="space-y-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                  {getCurrentDateTime()}
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                  {result.headline || 'Breaking Analysis'}
                </h1>
                
                {result.subtitle && (
                  <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                    {result.subtitle}
                  </p>
                )}
              </div>

              {/* Right Column: Main Image - TEMPORARILY COMMENTED OUT */}
              {/* {mainImage && (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={mainImage.url} 
                    alt={mainImage.alt || result.headline || 'Article image'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA3NEg2M0M2MS44OTU0IDc0IDYxIDc0Ljg5NTQgNjEgNzZWMTI0QzYxIDEyNS4xMDUgNjEuODk1NCAxMjYgNjMgMTI2SDEzN0MxMzguMTA1IDEyNiAxMzkgMTI1LjEwNSAxMzkgMTI0Vjc2QzEzOSA3NC44OTU0IDEzOC4xMDUgNzQgMTM3IDc0SDExM00xMTMgNzRWNzBDMTEzIDY4Ljg5NTQgMTEyLjEwNSA2OCAxMTEgNjhIODlDODcuODk1NCA2OCA4NyA2OC44OTU0IDg3IDcwVjc0TTExMyA3NEg4N00xMDAgOTBWMTA2TTkzIDk4TDEwNyA5OCIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K';
                    }}
                    loading="lazy"
                  />
                </div>
              )} */}
            </div>

            {/* Listen section */}
            {result.markdown_report && (
              <div className="py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>🎧</span>
                  <span>Listen to this article · {calculateReadingTime(result.markdown_report).listeningTime} min</span>
                </div>
              </div>
            )}

            {/* Article Body */}
            <div className="prose dark:prose-invert max-w-none">
              <div 
                className="text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: result.markdown_report
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>')
                    .replace(/^#{1,6}\s*/gm, '')
                    .replace(/<br\s*\/?>\s*#{1,6}\s*/g, '<br/>')
                    .replace(/#{1,6}\s*(.*?)<br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                    .replace(/#{1,6}\s*(.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                    .replace(/<br\/><strong>([^<]+)<\/strong><br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                }} 
              />
            </div>

            {/* Follow-up Questions */}
            {result.follow_up_questions && result.follow_up_questions.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Follow-up Questions</h2>
                <div className="space-y-3">
                  {result.follow_up_questions.map((q: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => handleFollowUpClick(q)}
                      className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {q}
                        </span>
                        <svg 
                          className="w-4 h-4 text-gray-400 group-hover:text-[#0095FF] transition-colors" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Research Process</h2>
            
            {progressState?.thinkingSteps && progressState.thinkingSteps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Process Steps</h3>
                <div className="relative">
                  {progressState.thinkingSteps.length > 1 && (
                    <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                  )}
                  
                  <div className="space-y-4">
                    {progressState.thinkingSteps.map((step: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 relative">
                        <div className="relative z-10 w-6 h-6 bg-[#0095FF] rounded-full flex items-center justify-center flex-shrink-0">
                          <div className="text-white text-xs font-bold">✓</div>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 pt-0.5">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {result?.search_queries && result.search_queries.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Search Queries</h3>
                <div className="space-y-2">
                  {result.search_queries.map((query: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="w-6 h-6 bg-[#0095FF] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <span className="text-gray-700 dark:text-gray-300">{query}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sources</h2>
            
            {result?.sources && result.sources.length > 0 ? (
              <div className="grid gap-4">
                {result.sources.map((source: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors bg-white dark:bg-gray-800"
                    >
                      <div className="flex-shrink-0 w-6 h-6 bg-[#0095FF] text-white rounded text-xs font-medium flex items-center justify-center mt-1">
                        {index + 1}
                      </div>
                      
                      {source.image && (
                        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                          <img
                            src={source.image}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                          />
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
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No sources available
              </div>
            )}
          </div>
        )}

        {/* IMAGES TAB - TEMPORARILY COMMENTED OUT FOR TESTING */}
        {/* {activeTab === 'images' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Images</h2>
            
            {result?.images && result.images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {result.images.map((image: any, index: number) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 group">
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(image.url, '_blank')}
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
        )} */}
      </div>
    </div>
  );
}
