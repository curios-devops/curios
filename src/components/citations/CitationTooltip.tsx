import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

interface CitationTooltipProps {
  citation: {
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  };
  children: React.ReactNode;
}

export default function CitationTooltip({ citation, children }: CitationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = () => {
    window.open(citation.url, '_blank', 'noopener,noreferrer');
  };

  const extractSiteName = (url: string): string => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '').split('.')[0];
    } catch {
      return 'Unknown Site';
    }
  };

  const displaySiteName = citation.siteName || extractSiteName(citation.url);

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleClick}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer"
        title={`Source: ${displaySiteName}`}
      >
        {children}
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <div className="flex items-start space-x-3">
                        <img
              src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(citation.url)}&size=16`}
              alt=""
              className="w-4 h-4 flex-shrink-0"
              onError={(e) => {
                // Fallback: hide broken favicon or show placeholder
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {displaySiteName}
              </h4>
              <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 line-clamp-2">
                {citation.title}
              </p>
              {citation.snippet && (
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-2 line-clamp-3">
                  {citation.snippet}
                </p>
              )}
              <button
                onClick={handleClick}
                className="text-blue-600 dark:text-blue-400 text-xs mt-2 hover:underline flex items-center gap-1"
              >
                <ExternalLink size={10} />
                Visit website →
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
