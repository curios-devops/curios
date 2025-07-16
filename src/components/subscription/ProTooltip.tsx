import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface ProTooltipProps {
  remainingSearches: number | null;
  maxSearches: number;
  onUpgrade?: () => void; // Make onUpgrade optional as it's not needed for premium users
  onSignIn?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
  subscription?: { isActive: boolean };
  _alwaysShowUpgrade?: boolean; // Add _alwaysShowUpgrade property (prefixed to indicate unused)
}
// Remove the duplicate export interface line

export default function ProTooltip({ 
  remainingSearches,
  maxSearches,
  onUpgrade,
  onSignIn,
  onClose,
  isLoggedIn = false,
  subscription,
  _alwaysShowUpgrade = false
}: ProTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const safeRemainingSearches = remainingSearches ?? 0;
  const percentage = (safeRemainingSearches / maxSearches) * 100;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Guest view
  if (!isLoggedIn) {
    return (
      <div
        className="absolute left-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#007BFF]" size={18} />
          <h3 className="text-gray-900 dark:text-white font-medium transition-colors duration-200">Pro Search</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
            Sign in to access Pro Search with advanced capabilities and more sources.
          </p>
          
          <button
            type="button"
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
    return (
      <div
        className="absolute left-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-[#007BFF]" size={18} />
          <h3 className="text-gray-900 dark:text-white font-medium transition-colors duration-200">Pro Search</h3>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
            Pro Search includes advanced search capabilities and 3x more sources.
          </p>
          
          <div className="space-y-2">
            <div className="w-full bg-gray-100 dark:bg-[#222222] rounded-full h-1.5 transition-colors duration-200">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  safeRemainingSearches === 0 
                    ? 'bg-red-500' 
                    : safeRemainingSearches <= maxSearches / 3
                      ? 'bg-yellow-500'
                      : 'bg-[#007BFF]'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <p className={`text-sm ${
              safeRemainingSearches === 0 
                ? 'text-red-500' 
                : safeRemainingSearches <= maxSearches / 3
                  ? 'text-yellow-500'
                  : 'text-gray-600 dark:text-gray-400'
            } transition-colors duration-200`}>
              {safeRemainingSearches} searches left today
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard user view
  return (
    <div 
      ref={tooltipRef}
      className="absolute left-0 top-full mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg p-4 shadow-xl border border-gray-200 dark:border-gray-800 w-80 z-50 transition-colors duration-200"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-[#007BFF]" size={18} />
        <h3 className="text-gray-900 dark:text-white font-medium transition-colors duration-200">Pro Search</h3>
      </div>
      
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400 text-sm transition-colors duration-200">
          Pro Search includes advanced search capabilities and 3x more sources.
        </p>
        
        <div className="space-y-2">
          <div className="w-full bg-gray-100 dark:bg-[#222222] rounded-full h-1.5 transition-colors duration-200">
            <div 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                safeRemainingSearches === 0 
                  ? 'bg-red-500' 
                  : safeRemainingSearches <= maxSearches / 3
                    ? 'bg-yellow-500'
                    : 'bg-[#007BFF]'
              }`}
              style={{ width: `${(safeRemainingSearches / maxSearches) * 100}%` }}
            />
          </div>
          <p className={`text-sm ${
            safeRemainingSearches === 0 
              ? 'text-red-500' 
              : safeRemainingSearches <= maxSearches / 3
                ? 'text-yellow-500'
                : 'text-gray-600 dark:text-gray-400'
          } transition-colors duration-200`}>
            {safeRemainingSearches} searches left today
          </p>
        </div>

        <button
          type="button"
          onClick={onUpgrade}
          className="w-full bg-[#007BFF] text-white py-2.5 rounded-lg hover:bg-[#0056b3] transition-colors text-sm font-medium"
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}