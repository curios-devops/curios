import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';

interface SourceCardProps {
  source: {
    url: string;
    title: string;
    snippet: string;
  };
  index: number;
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const domain = new URL(source.url).hostname.replace('www.', '');
  
  return (
    <div className="group relative">
      <a 
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {/* Compact View */}
        <div className="block bg-[#222222] p-3 rounded-lg transition-all duration-300 border border-gray-800 group-hover:bg-[#333333] group-hover:border-[#0095FF]/20 h-[88px] flex flex-col justify-between">
          <h3 className="text-white text-xs font-medium line-clamp-3 min-h-[48px]">{source.title}</h3>
          <div className="flex items-center gap-1.5 text-xs mt-auto">
            <Globe size={12} className="text-gray-400 group-hover:text-[#0095FF]" />
            <span className="text-gray-400 group-hover:text-[#0095FF]">{domain}</span>
            <span className="text-gray-500">· {index + 1}</span>
          </div>
        </div>

        {/* Expanded View (Shows on Hover) */}
        <div className="absolute left-[-50%] right-[-50%] top-full mt-2 z-10 bg-[#333333] rounded-lg p-4 border border-[#0095FF]/20 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl pointer-events-none">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#0095FF]" />
              <span className="text-[#0095FF] text-xs">{domain}</span>
            </div>
            <ExternalLink size={12} className="text-[#0095FF]" />
          </div>
          <h3 className="text-white text-sm font-medium mb-2">{source.title}</h3>
          <p className="text-xs text-gray-400 line-clamp-3">{source.snippet}</p>
        </div>
      </a>
    </div>
  );
}