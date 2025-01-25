import React from 'react';
import { Link2 } from 'lucide-react';
import SourceCard from './SourceCard';
import ShowAllCard from './ShowAllCard';
import type { Source } from '../types';

interface SourcesSectionProps {
  sources: Source[];
  showAllSources: boolean;
  setShowAllSources: (show: boolean) => void;
  maxSources?: number;
}

export default function SourcesSection({ 
  sources, 
  showAllSources, 
  setShowAllSources,
  maxSources = 3
}: SourcesSectionProps) {
  // Always show 3 sources + ShowAllCard, or all sources if showAllSources is true
  const displayedSources = showAllSources ? sources : sources.slice(0, 3);
  const remainingSources = sources.length - 3;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="text-[#0095FF]" size={22} />
        <h2 className="text-xl font-medium text-white">Sources</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {displayedSources.slice(0, 3).map((source, index) => (
          <SourceCard key={index} source={source} index={index} />
        ))}
        {!showAllSources && remainingSources > 0 && (
          <ShowAllCard 
            totalSources={remainingSources} 
            onClick={() => setShowAllSources(true)} 
          />
        )}
        {showAllSources && sources.slice(3).map((source, index) => (
          <SourceCard key={index + 3} source={source} index={index + 3} />
        ))}
      </div>
    </div>
  );
}