import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
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
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Pro Search</h2>
      </div>

      <div className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors duration-200">
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2 className="text-[#0095FF] animate-spin" size={18} />
                <span className="text-gray-600 dark:text-gray-400">Analyzing perspectives for "{query}"...</span>
              </div>
              <div className="space-y-3">
                <div className="h-2 bg-gray-100 dark:bg-[#222222] rounded w-3/4 animate-pulse"></div>
                <div className="h-2 bg-gray-100 dark:bg-[#222222] rounded w-1/2 animate-pulse"></div>
                <div className="h-2 bg-gray-100 dark:bg-[#222222] rounded w-2/3 animate-pulse"></div>
              </div>
            </div>
          ) : perspectives.length > 0 ? (
            <div className="space-y-1">
              {perspectives.map((perspective, index) => (
                <div 
                  key={perspective.id} 
                  className="border-b border-gray-200 dark:border-gray-800/50 last:border-b-0"
                >
                  <button
                    onClick={() => setExpandedPerspective(
                      expandedPerspective === perspective.id ? null : perspective.id
                    )}
                    className="w-full flex items-center justify-between py-3 group hover:bg-gray-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-all duration-200 px-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#0095FF] text-sm font-medium w-6">0{index + 1}</span>
                      <div className="text-left">
                        <h3 className="text-gray-900 dark:text-white font-medium text-sm">{perspective.title}</h3>
                        {expandedPerspective !== perspective.id && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-1">{perspective.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 ml-4">
                      {expandedPerspective === perspective.id ? (
                        <ChevronUp className="text-gray-400 group-hover:text-[#0095FF] transition-colors" size={18} />
                      ) : (
                        <ChevronDown className="text-gray-400 group-hover:text-[#0095FF] transition-colors" size={18} />
                      )}
                    </div>
                  </button>
                  
                  <div 
                    className={`
                      overflow-hidden transition-all duration-200 ease-in-out
                      ${expandedPerspective === perspective.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                  >
                    <div className="py-2 pl-11 pr-4 space-y-4">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{perspective.description}</p>
                      
                      {perspective.sources && perspective.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {perspective.sources.slice(0, 5).map((source, sourceIndex) => {
                            let domain = '';
                            try {
                              const url = new URL(source.url);
                              domain = url.hostname.replace('www.', '');
                            } catch {
                              return null;
                            }
                            
                            return (
                              <a
                                key={sourceIndex}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-[#0095FF] transition-colors bg-gray-50 dark:bg-[#1a1a1a] px-2 py-1.5 rounded-lg group"
                              >
                                <img 
                                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                                  alt=""
                                  className="w-4 h-4 opacity-75 group-hover:opacity-100 transition-opacity"
                                  loading="lazy"
                                />
                                <span className="truncate max-w-[200px]">{domain}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No perspectives found for this query.</p>
          )}
        </div>
      </div>
    </div>
  );
}