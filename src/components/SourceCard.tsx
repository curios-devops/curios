import { Globe, ExternalLink } from 'lucide-react';

// Helper function to get domain info
function getDomainInfo(source: { url: string }) {
  try {
    // Handle special case for fallback URL
    if (source.url === '#') {
      return { domain: 'No source available', hostname: '' };
    } else {
      const url = new URL(source.url);
      return {
        domain: url.hostname.replace('www.', ''),
        hostname: url.hostname
      };
    }
  } catch {
    // If URL is invalid, use a fallback domain
    return { domain: 'Invalid source', hostname: '' };
  }
}

interface SourceCardProps {
  source: {
    url: string;
    title: string;
    snippet: string;
  };
}

export default function SourceCard({ source }: SourceCardProps) {
  const { domain, hostname } = getDomainInfo(source);
  
  return (
    <div className="group relative">
      <a 
        href={source.url !== '#' ? source.url : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={`block ${source.url === '#' ? 'cursor-not-allowed' : ''}`}
        onClick={(e) => {
          if (source.url === '#') {
            e.preventDefault();
          }
        }}
      >
        {/* Compact View */}
        <div className="flex flex-col justify-between p-3 rounded-lg transition-all duration-300 border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-[#222222] group-hover:bg-gray-200 dark:group-hover:bg-[#333333] group-hover:border-[#0095FF]/20 h-[88px]">
          <h3 className="text-gray-900 dark:text-white text-xs font-medium line-clamp-3 min-h-[48px]">
            {source.title}
          </h3>
          <div className="flex items-center gap-2 text-xs mt-auto">
            {hostname ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                alt=""
                className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            ) : (
              <Globe size={12} className="text-gray-400 group-hover:text-[#0095FF]" />
            )}
            <span className="text-gray-500 dark:text-gray-400 group-hover:text-[#0095FF]">{domain}</span>
          </div>
        </div>

        {/* Expanded View (Shows on Hover) */}
        {source.url !== '#' && (
          <div className="absolute left-[-50%] right-[-50%] top-full mt-2 z-10 bg-white dark:bg-[#333333] rounded-lg p-4 border border-[#0095FF]/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl pointer-events-none">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {hostname ? (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
                    alt=""
                    className="w-4 h-4"
                    loading="lazy"
                  />
                ) : (
                  <Globe size={14} className="text-[#0095FF]" />
                )}
                <span className="text-[#0095FF] text-xs">{domain}</span>
              </div>
              <ExternalLink size={12} className="text-[#0095FF]" />
            </div>
            <h3 className="text-gray-900 dark:text-white text-sm font-medium mb-2">{source.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-3">{source.snippet}</p>
          </div>
        )}
      </a>
    </div>
  );
}