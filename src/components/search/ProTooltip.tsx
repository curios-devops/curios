import React from 'react';
import { Sparkles } from 'lucide-react';

interface ProTooltipProps {
  remainingSearches?: number;
  maxSearches?: number;
  onUpgrade: () => void;
  onSignIn?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
}

export default function ProTooltip({ 
  remainingSearches,
  maxSearches,
  onUpgrade,
  onSignIn,
  onClose,
  isLoggedIn = false
}: ProTooltipProps) {
  // For logged in users
  if (isLoggedIn && typeof remainingSearches === 'number' && maxSearches) {
    const percentage = (remainingSearches / maxSearches) * 100;
    
    return (
      <div 
        className="absolute right-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50"
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#007BFF]" size={18} />
          <h3 className="text-white font-medium">Pro Search</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Pro Search considers twice as many sources when searching for your answer.
          </p>
          
          <div className="space-y-2">
            <div className="w-full bg-[#222222] rounded-full h-1.5">
              <div 
                className="bg-[#007BFF] h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {remainingSearches} of {maxSearches} Pro searches left today
            </p>
          </div>

          {/* Always show the upgrade button for logged-in users */}
          <button
            onClick={onUpgrade}
            className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
          >
            Get more Pro Searches
          </button>
        </div>
      </div>
    );
  }

  // For guest users
  return (
    <div 
      className="absolute right-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50"
      onMouseLeave={onClose}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-[#007BFF]" size={18} />
        <h3 className="text-white font-medium">Pro Search</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Pro Search considers twice as many sources when searching for your answer.
        </p>
        
        <button
          onClick={onSignIn}
          className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
        >
          Sign in for Pro Searches
        </button>
      </div>
    </div>
  );
}