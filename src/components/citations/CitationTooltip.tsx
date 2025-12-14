import { useState } from 'react';

interface CitationTooltipProps {
  citation: {
    url: string;
    title: string;
    siteName: string;
    snippet?: string;
  };
  children: React.ReactNode;
}

// Helper to extract clean domain name from URL
function extractDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and .com/.org/.net etc
    return hostname
      .replace(/^www\./, '')
      .replace(/\.(com|org|net|io|co|gov|edu|info|biz)(\.[a-z]{2})?$/, '')
      .split('.')[0]; // Take first part if still has dots
  } catch {
    return '';
  }
}

export default function CitationTooltip({ citation, children }: CitationTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleClick = () => {
    window.open(citation.url, '_blank', 'noopener,noreferrer');
  };

  const cleanDomain = extractDomainName(citation.url);
  const fullDomain = (() => {
    try {
      return new URL(citation.url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  })();

  return (
    <span 
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleClick}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md transition-colors duration-200 cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
        title={`Source: ${cleanDomain}`}
      >
        {children}
      </button>
      
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 cursor-pointer"
          onClick={handleClick}
        >
          {/* Pointer arrow */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></div>
          
          {/* Favicon + Domain name */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-shrink-0 w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <img
                src={`https://www.google.com/s2/favicons?domain=${fullDomain}&sz=32`}
                alt=""
                className="w-4 h-4 rounded-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {cleanDomain}
            </span>
          </div>
          
          {/* Title */}
          <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
            {citation.title}
          </h4>
          
          {/* Snippet */}
          {citation.snippet && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
              {citation.snippet}
            </p>
          )}
        </div>
      )}
    </span>
  );
}
