import React, { useEffect, useState } from 'react';

interface ResearchProgressProps {
  stage: string;
  timeRemaining: string;
  progress: number;
  thinkingSteps: string[];
  isComplete: boolean;
  searchTerms?: string[];
  sources?: any[];
}

export const ResearchProgress: React.FC<ResearchProgressProps> = ({
  timeRemaining,
  progress,
  thinkingSteps,
  isComplete,
  searchTerms = [],
  sources = []
}) => {
  const [visibleSteps, setVisibleSteps] = useState<string[]>([]);
  const [showSearching, setShowSearching] = useState(false);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    if (thinkingSteps.length > visibleSteps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(thinkingSteps.slice(0, visibleSteps.length + 1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [thinkingSteps, visibleSteps]);

  useEffect(() => {
    // Show searching section when search terms are available
    if (searchTerms.length > 0) {
      setShowSearching(true);
    }
  }, [searchTerms]);

  useEffect(() => {
    // Show sources section when sources are available
    if (sources.length > 0) {
      setShowSources(true);
    }
  }, [sources]);

  return (
    <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-xl">🧠</div>
        <h3 className="text-lg font-medium">Curios AI Insights</h3>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-1 bg-gray-600 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-gradient-to-r from-[#0095FF] to-[#0080FF] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-sm text-gray-400">
          {isComplete ? 'Complete' : timeRemaining}
        </div>
      </div>
      
      {/* Thinking Process */}
      {visibleSteps.length > 0 && (
        <div className="mb-6">
          <div className="space-y-4">
            {visibleSteps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                <div className="text-gray-300 text-sm leading-relaxed">
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Searching Section */}
      {showSearching && (
        <div className="mb-6">
          <h4 className="text-gray-300 font-medium mb-3">Searching</h4>
          <div className="space-y-2">
            {searchTerms.map((term, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: `${(visibleSteps.length + index) * 0.1}s`
                }}
              >
                <div className="text-gray-400">🔍</div>
                <span className="text-gray-300 text-sm">{term}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading Sources Section */}
      {showSources && (
        <div>
          <h4 className="text-gray-300 font-medium mb-3">Reading sources · {sources.length}</h4>
          <div className="space-y-3">
            {sources.slice(0, 8).map((source, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 opacity-0 animate-fade-in-up"
                style={{
                  animationDelay: `${(visibleSteps.length + searchTerms.length + index) * 0.1}s`
                }}
              >
                <div className="flex items-center gap-2 flex-shrink-0">
                  {source.icon && (
                    <div className="w-4 h-4 text-xs">{source.icon}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-blue-400 text-sm font-medium truncate">
                    {source.title}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {source.domain}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchProgress;
