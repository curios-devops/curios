// No React imports needed - using pure CSS for tooltip

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

  const handleClick = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getFaviconDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  // If after deduplication there's only 1 citation, render a simple button without tooltip
  if (uniqueCitations.length === 1) {
    return (
      <button
        type="button"
        onClick={() => handleClick(uniqueCitations[0]?.url)}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {primarySiteName}
      </button>
    );
  }

  return (
    <span className="relative inline-block group/tooltip">
      <button
        type="button"
        onClick={() => handleClick(uniqueCitations[0]?.url)}
        className="inline-flex items-center px-2 py-0.5 mx-0.5 text-white text-xs font-medium rounded-md cursor-pointer hover:opacity-90"
        style={{ backgroundColor: 'var(--accent-primary)' }}
      >
        {primarySiteName} +{additionalCount}
      </button>
      
      {/* Dynamic tooltip with icon + website name + title preview per line */}
      <span className="invisible group-hover/tooltip:visible absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-0.5 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-0 pointer-events-auto transition-all duration-300 delay-100 group-hover/tooltip:delay-1000">
        {/* Pointer arrow */}
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 rotate-45"></span>
        
        {uniqueCitations.map((citation, index) => {
          const faviconDomain = getFaviconDomain(citation.url);
          const titlePreview = citation.title 
            ? (citation.title.length > 25 ? citation.title.slice(0, 25) + '...' : citation.title)
            : '';
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(citation.url)}
              className="w-full flex items-center gap-1.5 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left first:rounded-t-lg last:rounded-b-lg min-h-[20px]"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=32`}
                alt=""
                className="w-3 h-3 flex-shrink-0"
              />
              <span className="text-[10px] leading-none text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">
                <span className="font-medium">{citation.siteName}</span>
                {titlePreview && (
                  <span className="text-gray-500 dark:text-gray-400"> • {titlePreview}</span>
                )}
              </span>
            </button>
          );
        })}
      </span>
    </span>
  );
}
