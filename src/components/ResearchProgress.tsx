import React, { useEffect, useState } from 'react';
import { Brain, Check, Lightbulb, Search, BookOpen } from 'lucide-react';
import { useAccentColor } from '../hooks/useAccentColor';

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

  useEffect(() => {
    if (thinkingSteps.length > visibleSteps.length) {
      const timer = setTimeout(() => {
        setVisibleSteps(thinkingSteps.slice(0, visibleSteps.length + 1));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [thinkingSteps, visibleSteps]);

  // Calculate which steps are complete
  const isAnalyzing = visibleSteps.length > 0;
  const isSearching = searchTerms.length > 0;
  const isReadingSources = sources.length > 0;
  
  const accentColors = useAccentColor();

  // Solid checkmark component with accent color background and white check
  const SolidCheckmark = () => (
    <div 
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: accentColors.primary }}
    >
      <Check size={14} className="text-white" strokeWidth={3} />
    </div>
  );

  return (
    <div className="bg-gray-800 dark:bg-gray-900 rounded-xl p-6 text-white">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <Brain style={{ color: accentColors.primary }} size={24} />
        <h3 className="text-lg font-medium">Curios AI Insights</h3>
      </div>
      
      {/* Vertical Timeline Progress */}
      <div className="relative pl-8">
        {/* Continuous Vertical Line (rendered first, behind everything) */}
        {/* Single line from top of first checkmark to bottom of last visible checkmark */}
        {isAnalyzing && (
          <div 
            className="absolute left-[11px] w-0.5 opacity-0 animate-fade-in-up"
            style={{ 
              backgroundColor: accentColors.primary,
              top: '10px',
              bottom: isReadingSources ? '0px' : isSearching ? 'calc(100% - 130px)' : 'calc(100% - 70px)',
              animationDelay: '0.1s',
              zIndex: 0
            }}
          />
        )}

        {/* Step 1: Insights */}
        <div className="relative mb-1">
          <div className="absolute -left-8 w-6 h-6 flex items-center justify-center z-10">
            {isAnalyzing ? (
              <SolidCheckmark />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-600 rounded-full animate-pulse bg-gray-800" />
            )}
          </div>
          <div className="opacity-0 animate-fade-in-up">
            <div className="font-medium text-sm mb-1 flex items-center gap-2" style={{ color: accentColors.primary }}>
              <Lightbulb size={16} />
              <span>Insights</span>
            </div>
            {visibleSteps.length > 0 && (
              <div className="text-gray-400 text-xs space-y-1 mt-2">
                {visibleSteps.slice(-2).map((step, index) => (
                  <div key={index}>{step}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Searching */}
        <div className="relative mb-1 mt-4">
          <div className="absolute -left-8 w-6 h-6 flex items-center justify-center z-10">
            {isSearching ? (
              <SolidCheckmark />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-600 rounded-full bg-gray-800" />
            )}
          </div>
          {isSearching && (
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: accentColors.primary }}>
                <Search size={16} />
                <span>Searching</span>
              </div>
              <div className="text-gray-400 text-xs space-y-1">
                {searchTerms.slice(0, 3).map((term, index) => (
                  <div key={index} className="truncate pl-1">
                    {term}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!isSearching && (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <Search size={16} />
              <span>Searching...</span>
            </div>
          )}
        </div>

        {/* Step 3: Reading Sources */}
        <div className="relative mt-4">
          <div className="absolute -left-8 w-6 h-6 flex items-center justify-center z-10">
            {isReadingSources ? (
              <SolidCheckmark />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-600 rounded-full bg-gray-800" />
            )}
          </div>
          {isReadingSources && (
            <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="font-medium text-sm mb-2 flex items-center gap-2" style={{ color: accentColors.primary }}>
                <BookOpen size={16} />
                <span>Reading sources · {sources.length}</span>
              </div>
              <div className="space-y-2">
                {sources.slice(0, 5).map((source, index) => (
                  <div 
                    key={index}
                    className="text-xs opacity-0 animate-fade-in-up pl-1"
                    style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                  >
                    <div className="text-blue-400 truncate">{source.title}</div>
                    <div className="text-gray-500 truncate">{source.domain}</div>
                  </div>
                ))}
                {sources.length > 5 && (
                  <div className="text-gray-500 text-xs pl-1">
                    +{sources.length - 5} more sources
                  </div>
                )}
              </div>
            </div>
          )}
          {!isReadingSources && (
            <div className="text-gray-500 text-sm flex items-center gap-2">
              <BookOpen size={16} />
              <span>Reading sources...</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar at bottom */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full transition-all duration-500 ease-out"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(to right, ${accentColors.primary}, ${accentColors.hover})`
            }}
          />
        </div>
        <div className="text-sm text-gray-400">
          {isComplete ? 'Complete' : timeRemaining}
        </div>
      </div>
    </div>
  );
};

export default ResearchProgress;
