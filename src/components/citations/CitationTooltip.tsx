import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

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
      <span
        onClick={handleClick}
        className="cursor-pointer"
        title={`Source: ${displaySiteName}`}
      >
        {children}
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-80 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-sm flex items-center justify-center">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${new URL(citation.url).hostname}&sz=16`}
                  alt=""
                  className="w-4 h-4"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <Globe size={14} className="text-gray-600 dark:text-gray-400 hidden" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {new URL(citation.url).hostname.replace('www.', '')}
                </div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {citation.title}
                </div>
                {citation.snippet && (
                  <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">
                    {citation.snippet.slice(0, 120)}...
                  </div>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-[#007BFF] hover:text-[#0056b3] cursor-pointer">
                  <ExternalLink size={10} />
                  <span>Visit source</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
