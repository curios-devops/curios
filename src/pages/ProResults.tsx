import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { performSearch } from '../services/searchService';
import { formatTimeAgo } from '../utils/time';
import TopBar from '../components/results/TopBar';
import MainContent from '../components/results/MainContent';
import Sidebar from '../components/results/Sidebar';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { SearchState } from '../types';
import ProSearchSection from '../components/ProSearchSection';

export default function ProResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || '';
  const [showAllSources, setShowAllSources] = useState(false);
  
  const [searchStartTime] = useState(Date.now());
  const [timeAgo, setTimeAgo] = useState('just now');
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
        setSearchState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await performSearch(query, {
          isPro: true,
          onStatusUpdate: setStatusMessage
        });

        console.log('Pro Search response:', response); // Debug log

        setSearchState({
          isLoading: false,
          error: null,
          data: response
        });
      } catch (error) {
        console.error('Search failed:', error);
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
            <Sidebar images={searchState.data?.images} />
          )}
        </div>
      </main>
    </div>
  );
}