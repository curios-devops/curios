import React from 'react';
import SearchContainer from '../components/search/SearchContainer';
import HelpButton from '../components/HelpButton';
import { useUserType } from '../hooks/useUserType';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const userType = useUserType();
  const isPremium = userType === 'premium';

  return (
    <div className="min-h-screen bg-black relative">
      <div className="max-w-4xl mx-auto px-8 py-12">
        <div className="max-w-2xl mx-auto mt-40 mb-8">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex items-center justify-center gap-3">
              <h1 className="text-3xl font-medium animate-fade-in flex items-center gap-2">
                <span className="text-[#007BFF]">AI</span>
                <span className="text-white"> - Smart Search</span>
                {isPremium && (
                  <div className="relative group">
                    <div className="flex items-center gap-1 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                      <Sparkles className="text-[#007BFF]" size={14} />
                      <span className="text-[#007BFF] text-sm font-medium">Pro</span>
                    </div>
                  </div>
                )}
              </h1>
            </div>
          </div>

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