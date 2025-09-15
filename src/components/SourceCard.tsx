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
    image?: string;
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
        {/* Enhanced Card Layout */}
        <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#0095FF]/30 transition-all duration-300 group-hover:shadow-lg">
          {/* Image Section */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
            {source.image || hostname ? (
              <img
                src={source.image || `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`}
                alt=""
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  // Silently hide favicon on error to prevent console noise
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0095FF]/20 to-[#0095FF]/5 flex items-center justify-center">
                <Globe size={32} className="text-[#0095FF]/40" />
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-4">
            {/* Title */}
            <h3 className="text-gray-900 dark:text-white text-base font-medium mb-2 line-clamp-2 group-hover:text-[#0095FF] transition-colors">
              {source.title}
            </h3>

            {/* Domain */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              {hostname && (
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                  alt=""
                  className="w-4 h-4 opacity-75"
                  loading="lazy"
                  onError={(e) => {
                    // Silently hide favicon on error to prevent console noise
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
              <span className="font-medium">{domain}</span>
              <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Snippet - only show on larger screens */}
            <p className="hidden md:block text-gray-600 dark:text-gray-400 text-sm mt-2 line-clamp-2">
              {source.snippet}
            </p>
          </div>
        </div>
      </a>
    </div>
  );
}