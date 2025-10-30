import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router';
import { SwarmController } from '../agents/swarmController.ts';
import { formatTimeAgo } from '../../../../utils/time.ts';
import { updateMetaTags, generateShareableMetaTags } from '../../../../utils/metaTags.ts';
import ShareMenu from '../../../../components/ShareMenu.tsx';
import { Loader2, Image as ImageIcon, Video as VideoIcon, FileText, Newspaper, ArrowLeft, Clock } from 'lucide-react';
import type { SearchState, SearchResponse, Perspective } from '../../../../types/index.ts';
import ProSearchSection from '../../../../components/ProSearchSection.tsx';
import { logger } from '../../../../utils/logger.ts';
import SourcesSection from '../../../../components/SourcesSection.tsx';
import AnswerSection from '../../../../components/AnswerSection.tsx';

interface ProSearchData extends SearchResponse {
  perspectives: Perspective[];
}

type TabType = 'all' | 'news' | 'videos' | 'images' | 'sources';

export default function ProSearchResultsV2() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [statusMessage, setStatusMessage] = useState('Initializing Pro Search...');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  } as SearchState);
  
  const [proData, setProData] = useState<ProSearchData | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(searchStartTime));
    }, 1000);
    return () => clearInterval(interval);
  }, [searchStartTime]);

  const updateSearchState = useCallback((updates: Partial<SearchState>) => {
    setSearchState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Initialize search on component mount or query change
  useEffect(() => {
    if (!query.trim()) return;
    
    updateSearchState({ isLoading: true, error: null });
    setStatusMessage('Starting Pro Search...');
    
    const executeSearch = async () => {
      try {
        const controller = new SwarmController();
        
        setStatusMessage('Analyzing your query with multiple perspectives...');
        
        const response = await controller.processQuery(
          query,
          (status: string) => setStatusMessage(status),
          true // isPro
        );
        const { research, article, images, videos } = response;
        
        // Format the data for the UI
        const formattedData: ProSearchData = {
          answer: article.content,
          sources: (research.results || []).map(r => ({
            title: r.title || '',
            url: r.url || '',
            snippet: r.content || '',
            source: 'web'
          })),
          images: images || [],
          videos: videos || [],
          perspectives: research.perspectives || [],
          followUpQuestions: article.followUpQuestions || []
        };
        
        setProData(formattedData);
        updateSearchState({
          isLoading: false,
          error: null,
          data: {
            answer: article.content,
            sources: research.results.map((r) => ({
              title: r.title || '',
              url: r.url || '',
              snippet: r.content || '',
              source: 'web'
            })),
            images: images || [],
            videos: videos || []
          }
        });
        
        // Update meta tags
        const metaTags = generateShareableMetaTags(
          `[PRO] CuriosAI Search: ${query}`,
          article.content.substring(0, 200),
          images[0]?.url
        );
        updateMetaTags(metaTags);
        
        // Final status update to ensure UI completion
        setStatusMessage('Search completed successfully!');
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error('Search error:', error);
        updateSearchState({
          isLoading: false,
          error: errorMessage,
          data: null
        });
        setStatusMessage('Search completed with errors');
      }
    };

    executeSearch();
  }, [query, updateSearchState]);

  const renderTabContent = () => {
    if (searchState.isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400">{statusMessage}</p>
        </div>
      );
    }

    if (searchState.error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Search Error</h3>
          <p className="mt-2 text-red-700 dark:text-red-300">{searchState.error}</p>
          <button
            type="button"
            onClick={() => globalThis.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Search Again
          </button>
        </div>
      );
    }

    if (!searchState.data) return null;

    switch (activeTab) {
      case 'all':
        return (
          <div className="space-y-6">
            {/* Pro Search Perspectives Section */}
            {proData && (
              <ProSearchSection 
                query={query}
                isLoading={false}
                perspectives={proData.perspectives}
              />
            )}

            {/* Answer Section from Writer Agent */}
            <AnswerSection 
              answer={searchState.data.answer} 
              citations={searchState.data.citations || []}
            />

            {/* Top Sources */}
            <SourcesSection
              sources={searchState.data.sources}
              showAllSources={false}
              setShowAllSources={() => {}}
            />
          </div>
        );

      case 'news':
        return (
          <div className="space-y-4">
            {searchState.data.sources && searchState.data.sources.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  News Results
                </h3>
                <div className="space-y-4">
                  {searchState.data.sources.slice(0, 10).map((source, index) => (
                    <a
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                    >
                      <h4 className="text-blue-600 dark:text-blue-400 font-medium mb-2 hover:underline">
                        {source.title}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                        {source.snippet}
                      </p>
                      <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                        {new URL(source.url).hostname}
                      </p>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                No news articles found for this query
              </div>
            )}
          </div>
        );

      case 'videos':
        return (
          <div className="space-y-4">
            {searchState.data.videos && searchState.data.videos.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Video Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchState.data.videos.map((video, index) => (
                    <a
                      key={index}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
                    >
                      {video.thumbnail && (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                          {video.title}
                        </h4>
                        {video.duration && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {video.duration}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                No videos found for this query
              </div>
            )}
          </div>
        );

      case 'images':
        return (
          <div className="space-y-4">
            {searchState.data.images && searchState.data.images.length > 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Image Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {searchState.data.images.map((image, index) => (
                    <a
                      key={index}
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={image.image || image.url}
                        alt={image.alt || image.title || 'Image result'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                No images found for this query
              </div>
            )}
          </div>
        );

      case 'sources':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              All Sources
            </h3>
            <SourcesSection
              sources={searchState.data.sources}
              showAllSources={true}
              setShowAllSources={() => {}}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getTabCount = (tab: TabType): number => {
    if (!searchState.data) return 0;
    
    switch (tab) {
      case 'all':
        return searchState.data.sources.length;
      case 'news':
        return searchState.data.sources.length;
      case 'videos':
        return searchState.data.videos?.length || 0;
      case 'images':
        return searchState.data.images?.length || 0;
      case 'sources':
        return searchState.data.sources.length;
      default:
        return 0;
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 z-10 transition-colors duration-200">
        {/* Top row with back arrow, query title and time */}
        <div className="px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => globalThis.window?.history.back()}
                className="text-[#0095FF] hover:text-[#0080FF] transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-medium text-gray-900 dark:text-white">{query}</h1>
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <Clock size={14} />
                <span className="text-xs">{timeAgo}</span>
              </div>
            </div>
            <ShareMenu
              url={globalThis.window?.location.href || ''}
              title={`[PRO] CuriosAI Search: ${query}`}
              text={searchState.data?.answer?.substring(0, 100) + '...' || ''}
              query={query}
              images={searchState.data?.images || []}
            />
          </div>
        </div>
        
        {/* Tab navigation - integrated directly without extra border */}
        <div className="px-6">
          <div className="max-w-7xl mx-auto">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabChange('all')}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'border-[#0095FF] text-[#0095FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FileText size={16} />
                Overview
                {!searchState.isLoading && getTabCount('all') > 0 && (
                  <span className="text-xs opacity-60">({getTabCount('all')})</span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('news')}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'news'
                    ? 'border-[#0095FF] text-[#0095FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Newspaper size={16} />
                News
                {!searchState.isLoading && getTabCount('news') > 0 && (
                  <span className="text-xs opacity-60">({getTabCount('news')})</span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('videos')}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'videos'
                    ? 'border-[#0095FF] text-[#0095FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <VideoIcon size={16} />
                Videos
                {!searchState.isLoading && getTabCount('videos') > 0 && (
                  <span className="text-xs opacity-60">({getTabCount('videos')})</span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('images')}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'images'
                    ? 'border-[#0095FF] text-[#0095FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <ImageIcon size={16} />
                Images
                {!searchState.isLoading && getTabCount('images') > 0 && (
                  <span className="text-xs opacity-60">({getTabCount('images')})</span>
                )}
              </button>

              <button
                onClick={() => handleTabChange('sources')}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sources'
                    ? 'border-[#0095FF] text-[#0095FF]'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FileText size={16} />
                Sources
                {!searchState.isLoading && getTabCount('sources') > 0 && (
                  <span className="text-xs opacity-60">({getTabCount('sources')})</span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </div>
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        {renderTabContent()}
      </main>
    </div>
  );
}
