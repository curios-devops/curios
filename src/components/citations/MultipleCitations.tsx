import { useState } from 'react';

interface MultipleCitationsProps {
  citations: Array<{
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  }>;
  primarySiteName: string;
}

// Helper to extract clean domain name from URL
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
      .split('.')[0];
  } catch {
    return '';
  }
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
      <button
        onClick={() => handleSourceClick(citations[0].url)}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
        title={`${citations.length} sources from ${primarySiteName}`}
      >
        {primarySiteName} +{additionalCount}
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4">
          {/* Pointer arrow */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
          
          {/* Header */}
          <div className="mb-3 text-gray-500 dark:text-gray-400 text-sm">
            Sources · {citations.length}
          </div>
          
          {/* Sources list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {citations.map((citation, index) => {
              const cleanDomain = extractDomainName(citation.url);
              const fullDomain = (() => {
                try {
                  return new URL(citation.url).hostname.replace('www.', '');
                } catch {
                  return '';
                }
              })();
              
              return (
                <div
                  key={index}
                  onClick={() => handleSourceClick(citation.url)}
                  className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 -mx-2 transition-colors"
                >
                  {/* Favicon */}
                  <div className="flex-shrink-0 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                      alt=""
                      className="w-4 h-4 rounded-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Title and domain - single line */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {citation.title.length > 30 ? citation.title.slice(0, 30) + '...' : citation.title}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 text-sm flex-shrink-0 capitalize">
                      {cleanDomain}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </span>
  );
}
