import { Link2 } from 'lucide-react';
import SourceCard from './SourceCard';
import ShowAllCard from './ShowAllCard';
import type { Source } from '../types';

interface SourcesSectionProps {
  sources: Source[];
  showAllSources: boolean;
  setShowAllSources: (show: boolean) => void;
}

export default function SourcesSection({ 
  sources, 
  showAllSources, 
  setShowAllSources
}: SourcesSectionProps) {
  // Always show 3 sources + ShowAllCard, or all sources if showAllSources is true
  const displayedSources = showAllSources ? sources : sources.slice(0, 3);
  const remainingSources = sources.length - 3;

  return (
    <div className="mb-6">
      {/* CuriosAI Header Section */}
      <div className="mb-6 p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          CuriosAI Web Search
        </h1>
        <p className="text-[#0095FF] text-lg font-medium mb-3">
          curiosai.com
        </p>
        <p className="text-gray-600 dark:text-gray-400 text-base">
          Advanced AI-powered web search with comprehensive results and insights
        </p>
      </div>

      {/* Sources Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="text-[#0095FF]" size={22} />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Sources</h2>
      </div>
      
      {/* Sources Grid - Updated for better layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {displayedSources?.slice(0, 3).map((source, index) => (
          <SourceCard key={index} source={source} />
        ))}
        {!showAllSources && remainingSources > 0 && sources.length > 3 && (
          <ShowAllCard 
            totalSources={remainingSources}
            sources={sources.slice(3)}
            onClick={() => setShowAllSources(true)} 
          />
        )}
        {showAllSources && sources?.slice(3).map((source, index) => (
          <SourceCard key={index + 3} source={source} />
        ))}
      </div>
    </div>
  );
}