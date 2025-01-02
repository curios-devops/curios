import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clock, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { performSearch } from '../services/searchService';
import type { SearchState } from '../types';
import AdBanner from './AdBanner';
import SourcesSection from './SourcesSection';
import AnswerSection from './AnswerSection';
import PhotosSection from './PhotosSection';
import { formatTimeAgo } from '../utils/time';

export default function SearchResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('q') || '';
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
  const [showAllSources, setShowAllSources] = useState(false);
  
  const [searchState, setSearchState] = useState<SearchState>({
    isLoading: true,
    error: null,
    data: null
  });

  const [statusMessage, setStatusMessage] = useState('Initializing search...');

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
        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        const response = await performSearch(query, setStatusMessage);
        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        console.error('Search failed:', error);
        setSearchState({
          isLoading: false,
          error: error instanceof Error ? error.message : 'Search services are currently unavailable. Please try again later.',
          data: null
        });
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#111111] to-black text-white">
      {/* Top bar with time and query */}
      <div className="sticky top-0 bg-[#111111]/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center">
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock size={14} />
            <span className="text-xs">{timeAgo}</span>
          </div>
          <div className="flex-1 flex justify-center">
            <h2 className="text-white text-xs font-medium">{query}</h2>
          </div>
          <div className="w-[76px]"></div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Back button and main query */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate('/')}
            className="text-[#0095FF] hover:text-[#0080FF] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-medium text-white">{query}</h1>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            {searchState.isLoading && (
              <div className="flex flex-col items-center justify-center p-12 bg-[#111111] rounded-xl border border-gray-800">
                <Loader2 className="animate-spin text-[#0095FF] mb-4" size={28} />
                <p className="text-gray-400 text-sm">{statusMessage}</p>
                <p className="text-xs text-gray-500 mt-2">This might take a few moments</p>
              </div>
            )}

            {searchState.error && (
              <div className="bg-red-500/10 text-red-500 p-6 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle size={18} />
                  <p className="text-sm">{searchState.error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-500 px-4 py-2 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}

            {searchState.data && (
              <>
                <SourcesSection
                  sources={searchState.data.sources}
                  showAllSources={showAllSources}
                  setShowAllSources={setShowAllSources}
                />
                <AnswerSection answer={searchState.data.answer} />
              </>
            )}
          </div>

          {!searchState.error && (
            <div className="w-80 shrink-0">
              <div className="sticky top-24">
                {searchState.data?.images && (
                  <PhotosSection images={searchState.data.images} />
                )}
                <AdBanner
                  dataAdSlot={import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT}
                  style={{ minHeight: '600px' }}
                  className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}