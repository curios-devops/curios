import { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface MultipleCitationsProps {
  citations: Array<{
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  }>;
  primarySiteName: string;
}

export default function MultipleCitations({ citations, primarySiteName }: MultipleCitationsProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const additionalCount = citations.length - 1;

  const handleSourceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        onClick={() => handleSourceClick(citations[0].url)}
        className="inline-flex items-center justify-center px-2 py-1 bg-[#007BFF] text-white text-xs font-medium rounded-md mx-0.5 cursor-pointer hover:bg-[#0056b3] transition-colors"
        title={`${citations.length} sources from ${primarySiteName}`}
      >
        {primarySiteName} +{additionalCount}
      </span>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 w-96 max-w-md">
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                Sources · {citations.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Multiple sources from {primarySiteName}
              </div>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {citations.map((citation, index) => (
                <div
                  key={index}
                  onClick={() => handleSourceClick(citation.url)}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${new URL(citation.url).hostname}&sz=16`}
                      alt=""
                      className="w-3 h-3"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <Globe size={10} className="text-gray-600 dark:text-gray-400 hidden" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      {new URL(citation.url).hostname.replace('www.', '')}
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                      {citation.title}
                    </div>
                    {citation.snippet && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">
                        {citation.snippet.slice(0, 100)}...
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1 text-xs text-[#007BFF]">
                      <ExternalLink size={8} />
                      <span>Visit source</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
