import React from 'react';
import SearchContainer from '../components/search/SearchContainer';
import HelpButton from '../components/HelpButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-40 mb-8">
          <h1 className="text-3xl font-medium mb-8 animate-fade-in text-center">
            <span className="text-[#007BFF]">AI</span>
            <span className="text-white"> - Smart Search</span>
          </h1>

          <SearchContainer />
        </div>
      </div>
      
      {/* Help Button */}
      <div className="fixed bottom-4 right-4">
        <HelpButton />
      </div>
    </div>
  );
}