import { Sparkles } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

interface ProTooltipProps {
  remainingSearches?: number;
  maxSearches?: number;
  onUpgrade?: () => void;
  onSignIn?: () => void;
  onClose?: () => void;
  isLoggedIn?: boolean;
  subscription?: { isActive: boolean }
}

export default function ProTooltip({ 
  remainingSearches,
  maxSearches,
  subscription,
  onSignIn,
  onClose,
  isLoggedIn = false,
  // alwaysShowUpgrade = false
}: ProTooltipProps) {
  const accentColor = useAccentColor();
  // Guest user view
  if (!isLoggedIn) {
    return (
      <div
        className={`absolute left-0 top-full mt-2 rounded-lg p-4 shadow-xl w-80 z-50 border transition-colors duration-200
          ${window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'bg-[#1a1a1a] border-gray-800 text-white'
            : 'bg-white border-gray-200 text-gray-900'}
        `}
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} style={{ color: accentColor.primary }} />
            <h3 className={window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-white font-medium' : 'text-gray-900 font-medium'}>Pro Search</h3>
        </div>
        
        <div className="space-y-4">
            <p className={`text-sm ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-gray-400' : 'text-gray-700'}`}>
            Pro Search includes advanced search capabilities and 3x more sources.
          </p>
          
          <button
            onClick={onSignIn}
            className="w-full text-white py-2.5 rounded-lg transition-colors text-sm font-medium"
            style={{ backgroundColor: accentColor.primary }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = accentColor.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = accentColor.primary)}
          >
            Sign in for Pro Searches
          </button>
        </div>
      </div>
    );
  }

  // Premium user view
  if (subscription?.isActive && typeof remainingSearches === 'number' && typeof maxSearches === 'number' && maxSearches > 0) {
    const percentage = (remainingSearches / maxSearches) * 100;
    return (
      <div
        className={`absolute left-0 top-full mt-2 rounded-lg p-4 shadow-xl w-80 z-50 border transition-colors duration-200
          ${window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'bg-[#1a1a1a] border-gray-800 text-white'
            : 'bg-white border-gray-200 text-gray-900'}
        `}
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} style={{ color: accentColor.primary }} />
            <h3 className={window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-white font-medium' : 'text-gray-900 font-medium'}>Pro Search</h3>
        </div>
        <div className="space-y-4">
            <p className={`text-sm ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-gray-400' : 'text-gray-700'}`}>
            Pro Search includes advanced search capabilities and 3x more sources.
          </p>
          <div className="space-y-2">
            <div className="w-full bg-[#222222] rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%`, backgroundColor: accentColor.primary }}
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
      className={`absolute left-0 top-full mt-2 rounded-lg p-4 shadow-xl w-80 z-50 border transition-colors duration-200
        ${window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'bg-[#1a1a1a] border-gray-800 text-white'
          : 'bg-white border-gray-200 text-gray-900'}
      `}
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} style={{ color: accentColor.primary }} />
          <h3 className={window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-white font-medium' : 'text-gray-900 font-medium'}>Pro Search</h3>
      </div>
      <div className="space-y-4">
          <p className={`text-sm ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'text-gray-400' : 'text-gray-700'}`}>
          Pro Search includes advanced search capabilities and 3x more sources.
        </p>
        <div className="space-y-2">
          <div className="w-full bg-[#222222] rounded-full h-1.5">
            {typeof remainingSearches === 'number' && typeof maxSearches === 'number' && maxSearches > 0 ? (
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  remainingSearches === 0
                    ? 'bg-red-500'
                    : remainingSearches <= maxSearches / 3
                      ? 'bg-yellow-500'
                      : ''
                }`}
                style={{
                  width: `${(remainingSearches / maxSearches) * 100}%`,
                  backgroundColor:
                    remainingSearches === 0
                      ? undefined
                      : remainingSearches <= maxSearches / 3
                        ? undefined
                        : accentColor.primary,
                }}
              />
            ) : (
              <div className="h-1.5 rounded-full transition-all duration-300 bg-gray-300 w-full" />
            )}
          </div>
          <p className={`text-sm ${
            typeof remainingSearches === 'number' && typeof maxSearches === 'number' && maxSearches > 0
              ? remainingSearches === 0
                ? 'text-red-500'
                : remainingSearches <= maxSearches / 3
                  ? 'text-yellow-500'
                  : 'text-gray-400'
              : 'text-gray-400'
          }`}>
            {typeof remainingSearches === 'number' ? `${remainingSearches} searches left today` : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
