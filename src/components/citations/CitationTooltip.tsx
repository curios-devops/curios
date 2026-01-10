// import { useState } from 'react'; // Temporarily disabled - tooltip commented out

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
  // Temporarily disabled tooltip to isolate freeze issue
  // const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (citation?.url) {
      window.open(citation.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Temporarily disabled tooltip code
  // Get domain for favicon
  // const getFaviconDomain = (url: string): string => {
  //   try {
  //     return new URL(url).hostname.replace('www.', '');
  //   } catch {
  //     return '';
  //   }
  // };

  // const faviconDomain = citation?.url ? getFaviconDomain(citation.url) : '';

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {children}
      </button>
      
      {/* Tooltip temporarily commented out to isolate freeze issue */}
      {/*
      {showTooltip && citation && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 z-50"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={handleClick}
        >
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
          
          <div className="flex items-center gap-2 mb-2">
            {faviconDomain && (
              <div className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
                  alt=""
                  className="w-4 h-4"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
              {citation.siteName || 'Source'}
            </span>
          </div>
          
          {citation.title && (
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
              {citation.title}
            </h4>
          )}
          
          {citation.snippet && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4 leading-relaxed">
              {citation.snippet}
            </p>
          )}
        </div>
      )}
      */}
    </span>
  );
}
