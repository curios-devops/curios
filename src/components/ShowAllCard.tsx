import React from 'react';
import { Globe } from 'lucide-react';

interface ShowAllCardProps {
  totalSources: number;
  sources?: Array<{ url: string }>;
  onClick: () => void;
}

export default function ShowAllCard({ totalSources, sources, onClick }: ShowAllCardProps) {
  // Get unique domains from remaining sources (up to 3)
  const domains = sources
    ?.slice(0, 3)
    .map(source => {
      try {
        return new URL(source.url).hostname;
      } catch {
        return null;
      }
    })?.filter(Boolean) as string[] || [];

  return (
    <button
      onClick={onClick}
      className="w-full h-full bg-[#222222] p-3 rounded-lg border border-gray-800 hover:bg-[#333333] hover:border-[#0095FF]/20 transition-all duration-300"
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex -space-x-1.5 mb-2">
          {domains.map((domain, i) => (
            <div 
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-[#333333] ring-2 ring-[#222222]"
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                alt=""
                className="w-4 h-4 opacity-75 group-hover:opacity-100"
                loading="lazy"
                onError={(e) => {
                  // Fallback to Globe icon if favicon fails to load
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.appendChild(
                    Object.assign(document.createElement('div'), {
                      className: 'w-4 h-4 text-gray-400',
                      innerHTML: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
                    })
                  );
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center">
          <span className="text-gray-400 text-xs">
            Show {totalSources} more
          </span>
        </div>
      </div>
    </button>
  );
}