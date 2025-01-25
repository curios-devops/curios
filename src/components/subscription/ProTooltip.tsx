import React from 'react';
import { Sparkles } from 'lucide-react';

interface ProTooltipProps {
  remainingSearches: number;
  maxSearches: number;
  onUpgrade: () => void;
  onSignIn?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
  subscription?: { isPro: boolean };
  alwaysShowUpgrade?: boolean;
}

export default function ProTooltip({ 
  remainingSearches,
  maxSearches,
  onUpgrade,
  onSignIn,
  onClose,
  isLoggedIn = false,
  subscription,
  alwaysShowUpgrade = false
}: ProTooltipProps) {
  const percentage = (remainingSearches / maxSearches) * 100;
  const warningThreshold = Math.floor(maxSearches / 3);
  const showWarning = remainingSearches <= warningThreshold;
  const isExhausted = remainingSearches === 0;

  // Guest user view
  if (!isLoggedIn) {
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

  // Logged in user view
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
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isExhausted 
                  ? 'bg-red-500' 
                  : showWarning 
                    ? 'bg-yellow-500'
                    : 'bg-[#007BFF]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className={`text-sm ${
            isExhausted 
              ? 'text-red-500' 
              : showWarning 
                ? 'text-yellow-500'
                : 'text-gray-400'
          }`}>
            {isExhausted 
              ? 'No Pro searches left' 
              : `${remainingSearches} of ${maxSearches} Pro searches left ${subscription?.isPro ? 'this month' : 'today'}`
            }
          </p>
        </div>

        {/* Show upgrade button for non-pro users or when quota is low */}
        {(alwaysShowUpgrade || isExhausted || showWarning) && (
          <button
            onClick={onUpgrade}
            className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
          >
            {isExhausted ? 'Get More Pro Searches' : 'Upgrade to Pro'}
          </button>
        )}
      </div>
    </div>
  );
}