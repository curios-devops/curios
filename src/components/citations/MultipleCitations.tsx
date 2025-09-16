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
        className="inline-flex items-center px-2 py-0.5 mx-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer"
        title={`${citations.length} sources from ${primarySiteName}`}
      >
        {primarySiteName} +{additionalCount}
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
          <div className="mb-3">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              Sources • {citations.length}
            </h4>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {citations.map((citation, index) => (
              <div
                key={index}
                onClick={() => handleSourceClick(citation.url)}
                className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200"
              >
                <img
                  src={`https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(citation.url)}&size=16`}
                  alt=""
                  className="w-4 h-4 mt-1 flex-shrink-0"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {citation.siteName || new URL(citation.url).hostname.replace('www.', '')}
                  </h5>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mt-1 line-clamp-2">
                    {citation.title}
                  </p>
                  {citation.snippet && (
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-2">
                      {citation.snippet.slice(0, 100)}...
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </span>
  );
}
