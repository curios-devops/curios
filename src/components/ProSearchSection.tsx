import React, { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import type { Perspective } from '../types';

interface ProSearchSectionProps {
  query: string;
  isLoading?: boolean;
  perspectives?: Perspective[];
}

export default function ProSearchSection({ 
  query, 
  isLoading = true,
  perspectives = []
}: ProSearchSectionProps) {
  const [expandedPerspective, setExpandedPerspective] = useState<string | null>(null);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="text-[#0095FF]" size={22} />
        <h2 className="text-xl font-medium text-white">Pro Search</h2>
      </div>

      <div className="bg-[#111111] rounded-xl border border-gray-800 overflow-hidden">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="text-[#0095FF] animate-spin" size={18} />
                <span className="text-gray-400">Analyzing perspectives...</span>
              </div>
              <div className="space-y-3">
                <div className="h-2 bg-[#222222] rounded w-3/4 animate-pulse"></div>
                <div className="h-2 bg-[#222222] rounded w-1/2 animate-pulse"></div>
                <div className="h-2 bg-[#222222] rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ) : perspectives.length > 0 ? (
            <div className="space-y-1">
              {perspectives.map((perspective, index) => (
                <div 
                  key={perspective.id} 
                  className="border-b border-gray-800/50 last:border-b-0"
                >
                  <button
                    onClick={() => setExpandedPerspective(
                      expandedPerspective === perspective.id ? null : perspective.id
                    )}
                    className="w-full flex items-center justify-between py-2 group hover:bg-[#1a1a1a] rounded-lg transition-colors px-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#0095FF] text-sm font-medium w-6">0{index + 1}</span>
                      <div className="text-left">
                        <h3 className="text-white font-medium text-sm">{perspective.title}</h3>
                        <p className="text-gray-400 text-xs">{perspective.description}</p>
                      </div>
                    </div>
                    {expandedPerspective === perspective.id ? (
                      <ChevronUp className="text-gray-400 group-hover:text-[#0095FF] transition-colors shrink-0" size={18} />
                    ) : (
                      <ChevronDown className="text-gray-400 group-hover:text-[#0095FF] transition-colors shrink-0" size={18} />
                    )}
                  </button>
                  
                  {expandedPerspective === perspective.id && perspective.sources && (
                    <div className="py-2 pl-9 pr-2">
                      <div className="flex flex-wrap gap-2">
                        {perspective.sources.map((source, sourceIndex) => (
                          <a
                            key={sourceIndex}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0095FF] transition-colors bg-[#1a1a1a] px-2 py-1 rounded-lg"
                          >
                            <img 
                              src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=16`}
                              alt=""
                              className="w-3 h-3"
                            />
                            <span className="truncate max-w-[200px]">{source.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No perspectives found for this query.</p>
          )}
        </div>
      </div>
    </div>
  );
}