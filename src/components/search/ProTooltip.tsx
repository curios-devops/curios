import React from 'react';
import { Sparkles } from 'lucide-react';

interface ProTooltipProps {
  remainingSearches?: number;
  maxSearches?: number;
  onUpgrade: () => void;
  onSignIn?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
  subscription?: { isActive: boolean };
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
  // Guest user view
  if (!isLoggedIn) {
    return (
      <div 
        className="absolute left-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50"
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#007BFF]" size={18} />
          <h3 className="text-white font-medium">Pro Search</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Pro Search includes advanced search capabilities and 3x more sources.
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

  // Premium user view
  if (subscription?.isActive) {
    const percentage = (remainingSearches / maxSearches) * 100;
    
    return (
      <div
        className="absolute left-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50"
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#007BFF]" size={18} />
          <h3 className="text-white font-medium">Pro Search</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Pro Search includes advanced search capabilities and 3x more sources.
          </p>
          
          <div className="space-y-2">
            <div className="w-full bg-[#222222] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300 bg-[#007BFF]"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">
              {remainingSearches} searches left today
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard user view
  return (
    <div
      className="absolute left-0 top-full mt-2 bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-800 w-80 z-50"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-[#007BFF]" size={18} />
        <h3 className="text-white font-medium">Pro Search</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Pro Search includes advanced search capabilities and 3x more sources.
        </p>
        
        <div className="space-y-2">
          <div className="w-full bg-[#222222] rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                remainingSearches === 0 
                  ? 'bg-red-500' 
                  : remainingSearches <= maxSearches / 3
                    ? 'bg-yellow-500'
                    : 'bg-[#007BFF]'
              }`}
              style={{ width: `${(remainingSearches / maxSearches) * 100}%` }}
            />
          </div>
          <p className={`text-sm ${
            remainingSearches === 0 
              ? 'text-red-500' 
              : remainingSearches <= maxSearches / 3
                ? 'text-yellow-500'
                : 'text-gray-400'
          }`}>
            {remainingSearches} searches left today
          </p>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}