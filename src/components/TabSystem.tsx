import React, { useState } from 'react';

// Helper function to calculate reading and listening time
const calculateReadingTime = (text: string) => {
  const wordsPerMinute = 200;
  const listeningWordsPerMinute = 150;
  
  // Strip HTML and markdown, count words
  const plainText = text
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const words = plainText.split(' ').filter(word => word.length > 0).length;
  const readingTime = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  // Calculate listening time in minutes and seconds
  const totalListeningSeconds = Math.ceil(words / listeningWordsPerMinute * 60);
  const listeningMinutes = Math.floor(totalListeningSeconds / 60);
  const listeningSeconds = totalListeningSeconds % 60;
  
  return { 
    readingTime, 
    listeningTime: `${listeningMinutes}:${String(listeningSeconds).padStart(2, '0')}` 
  };
};

// Helper function to format current date and time
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

interface TabSystemProps {
  result: any;
  progressState: any;
  loading: boolean;
}

interface SourceItemProps {
  source: any;
  index: number;
}

const SourceItem: React.FC<SourceItemProps> = ({ source, index }) => (
  <div className="flex gap-4 p-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div className="flex-1">
      <div className="flex items-start gap-4">
        <span className="text-[#0095FF] font-semibold text-base bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full min-w-[32px] text-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-medium text-[#0095FF] dark:text-[#0095FF] mb-1 hover:underline cursor-pointer line-clamp-2">
            {source.title}
          </h3>
          <div className="text-sm text-green-700 dark:text-green-400 mb-3 truncate">
            {source.url}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {source.snippet}
          </p>
        </div>
      </div>
    </div>
    
    {/* Image on the right */}
    {source.image && (
      <div className="flex-shrink-0 ml-4">
        <img 
          src={source.image} 
          alt=""
          className="w-24 h-18 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
        />
      </div>
    )}
  </div>
);

export const TabSystem: React.FC<TabSystemProps> = ({ result, progressState, loading }) => {
  const [activeTab, setActiveTab] = useState<'curios' | 'steps' | 'sources'>('curios');

  // Handle follow-up question clicks
  const handleFollowUpClick = (question: string) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', question);
    searchParams.set('type', 'insights');
    // Force page reload to trigger new insights workflow
    window.location.href = `/insights-results?${searchParams.toString()}`;
  };

  const tabs = [
    { 
      id: 'curios', 
      label: 'Curios AI', 
      icon: (
        <img 
          src="/compass.svg" 
          alt="Compass" 
          className="w-4 h-4"
        />
      ),
      customLabel: (
        <span>
          Curios<span className="text-[#0095FF]">AI</span>
        </span>
      )
    },
    { id: 'steps', label: 'Steps', icon: '📋' },
    { id: 'sources', label: `Sources${result?.sources ? ` · ${result.sources.length}` : ''}`, icon: '🔍' }
  ];

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[#0095FF] bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span className="text-base flex items-center">
                {typeof tab.icon === 'string' ? tab.icon : tab.icon}
              </span>
              <span className="hidden sm:inline">
                {tab.customLabel || tab.label}
              </span>
              <span className="sm:hidden">
                {tab.customLabel ? (
                  <span>
                    Curios<span className="text-[#0095FF]">AI</span>
                  </span>
                ) : (
                  tab.label.split(' ')[0]
                )}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0095FF]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'curios' && (
          <div className="space-y-6">
            {!loading && result ? (
              <>
                {/* Focus Category */}
                <div className="mb-4">
                  <span className="bg-black text-white px-3 py-1 text-sm font-medium uppercase tracking-wider">
                    {result.focus_category || 'ANALYSIS'}
                  </span>
                </div>

                {/* News Article Header */}
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {getCurrentDateTime()}
                  </div>
                  
                  {/* Headline */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
                    {result.headline || 'Breaking Analysis'}
                  </h1>
                  
                  {/* Subtitle */}
                  {result.subtitle && (
                    <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                      {result.subtitle}
                    </p>
                  )}

                  {/* Listen section */}
                  <div className="py-3">
                    {/* Listen to article section */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {(() => {
                        const { listeningTime } = calculateReadingTime(result.markdown_report || '');
                        return (
                          <div className="flex items-center gap-2">
                            <span>🎧</span>
                            <span>Listen to this article · {listeningTime} min</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Article Body */}
                <div className="prose dark:prose-invert max-w-none">
                  <div 
                    className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ 
                      __html: result.markdown_report
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>')
                        // More comprehensive # removal - handles "# Text" or "## Text" at start of lines
                        .replace(/^#{1,6}\s*/gm, '')
                        .replace(/<br\s*\/?>\s*#{1,6}\s*/g, '<br/>')
                        .replace(/#{1,6}\s*(.*?)<br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                        .replace(/#{1,6}\s*(.*?)$/gm, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                        // Convert standalone bold text (likely headers) to proper headers  
                        .replace(/<br\/><strong>([^<]+)<\/strong><br\/>/g, '<h2 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">$1</h2>')
                    }} 
                  />
                </div>

                {/* Follow-up Questions */}
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
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  {loading ? 'Generating comprehensive report...' : 'No results available'}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'steps' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Research Process</h2>
            </div>
            
            {/* Process Steps - now first */}
            {progressState?.thinkingSteps && progressState.thinkingSteps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3 text-gray-800 dark:text-gray-200">Process Steps</h3>
                <div className="relative">
                  {/* Vertical connecting line */}
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

            {/* Search Queries - now second */}
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

            {(!progressState?.thinkingSteps || progressState.thinkingSteps.length === 0) && (!result?.search_queries || result.search_queries.length === 0) && !loading && (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">No process steps available</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Sources</h2>
            
            {result?.sources && result.sources.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {result.sources.map((source: any, index: number) => (
                  <SourceItem key={index} source={source} index={index} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400">
                  {loading ? 'Gathering sources...' : 'No sources available'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TabSystem;
