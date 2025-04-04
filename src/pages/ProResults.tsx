import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performSearch } from '../services/searchService';
import { formatTimeAgo } from '../utils/time';
import ShareMenu from '../components/ShareMenu';
import TopBar from '../components/results/TopBar';
import MainContent from '../components/results/MainContent';
import Sidebar from '../components/results/Sidebar';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { SearchState } from '../types';
import ProSearchSection from '../components/ProSearchSection';
import { logger } from '../utils/logger';

export default function ProResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [showAllSources, setShowAllSources] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing Pro Search...');
  
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
    const fetchResults = async () => {
      if (!query.trim()) {
        setSearchState({
          isLoading: false,
          error: 'Please enter a search query',
          data: null
        });
        return;
      }

      try {
        logger.info('Starting Pro search', { query });
        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await performSearch(query, {
          isPro: true,
          onStatusUpdate: (status) => {
            logger.debug('Pro search status update', { status });
            setStatusMessage(status);
          }
        });

        logger.info('Pro search completed', {
          hasResults: !!response.sources.length,
          imageCount: response.images.length,
          videoCount: response.videos?.length || 0,
          hasPerspectives: !!response.perspectives?.length
        });

        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        logger.error('Pro search failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          query
        });
        setSearchState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Search services are currently unavailable',
          data: null
        });
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] to-black text-white">
      <TopBar query={query} timeAgo={timeAgo} />
      <main className="max-w-7xl mx-auto px-6 py-6">
        <ShareMenu
          url={window.location.href}
          title={`[PRO] CuriosAI Search: ${query || ''}`}
          text={searchState.data?.answer.slice(0, 100) + '...' || ''}
        />
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')}
            className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-white">{query}</h1>
            <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
              <Sparkles className="text-[#0095FF]" size={14} />
              <span className="text-[#0095FF] text-sm font-medium">Pro</span>
            </div>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex-1">
            {/* Pro Search Section */}
            <ProSearchSection 
              query={query}
              isLoading={searchState.isLoading}
              perspectives={searchState.data?.perspectives}
            />
            {/* Main Content */}
            <MainContent 
              searchState={searchState}
              showAllSources={showAllSources}
              setShowAllSources={setShowAllSources}
              statusMessage={statusMessage}
              isPro={true}
            />
          </div>
          {/* Sidebar */}
          {!searchState.error && (
            <Sidebar 
              images={searchState.data?.images}
              videos={searchState.data?.videos}
            />
          )}
        </div>
      </main>
    </div>
  );
}