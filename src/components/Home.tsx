import React from 'react';
import SearchContainer from '../components/search/SearchContainer';
import HelpButton from '../components/HelpButton';
import { useSubscription } from '../hooks/useSubscription';

export default function Home() {
  const { subscription } = useSubscription();

  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-40 mb-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <h1 className="text-3xl font-medium animate-fade-in">
              <span className="text-[#007BFF]">AI</span>
              <span className="text-white"> - Smart Search</span>
            </h1>
            {subscription?.isPro && (
              <span className="bg-[#007BFF] text-xs text-white px-2 py-0.5 rounded animate-fade-in">
                PRO
              </span>
            )}
          </div>

          <SearchContainer />
        </div>
      </div>
      
      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>
    </div>
  );
}