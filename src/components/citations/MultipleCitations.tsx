// Import useState for mobile click handling
import { useState, useRef } from 'react';

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
  // Deduplicate citations by URL to avoid showing the same source multiple times
  const uniqueCitations = Array.from(
    new Map(citations.map(citation => [citation.url, citation])).values()
  );

  const additionalCount = uniqueCitations.length - 1;
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(prev => !prev);
  };

  const getFaviconDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  return (
    <span
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleButtonClick}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90 active:opacity-75"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {uniqueCitations.length === 1 ? primarySiteName : `${primarySiteName} +${additionalCount}`}
      </button>

      {/* Dynamic tooltip */}
      {showTooltip && (
        <span
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pointer arrow */}
          <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></span>

          {/* Navigation header - only show for multiple citations */}
          {uniqueCitations.length > 1 && (
            <div className="flex items-center justify-between px-3 py-0.5 border-b border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev > 0 ? prev - 1 : uniqueCitations.length - 1));
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Previous source"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {currentIndex + 1} / {uniqueCitations.length}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex((prev) => (prev < uniqueCitations.length - 1 ? prev + 1 : 0));
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Next source"
              >
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Current citation */}
          {(() => {
            const citation = uniqueCitations.length === 1 ? uniqueCitations[0] : uniqueCitations[currentIndex];
            const faviconDomain = getFaviconDomain(citation.url);

            return (
              <div className={`px-3 ${uniqueCitations.length === 1 ? 'py-1' : 'py-1.5'}`}>
                {/* Icon and website name */}
                <div className="flex items-center gap-1 mb-0">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
                    alt=""
                    className="w-5 h-5 flex-shrink-0"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {citation.siteName}
                  </span>
                </div>

                {/* Title with link */}
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-medium text-gray-900 dark:text-white hover:text-[var(--accent-primary)] dark:hover:text-[var(--accent-primary)] mb-0 line-clamp-2 leading-tight"
                  onClick={() => setShowTooltip(false)}
                >
                  {citation.title}
                </a>

                {/* Snippet */}
                {citation.snippet && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-tight mt-0">
                    {citation.snippet}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Footer with source count - only show for multiple citations */}
          {uniqueCitations.length > 1 && (
            <div className="px-3 py-0.5 border-t border-gray-200 dark:border-gray-700 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {uniqueCitations.length} sources
              </span>
            </div>
          )}
        </span>
      )}
    </span>
  );
}
