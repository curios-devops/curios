import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, description, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-gray-800 py-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-xl font-medium text-white mb-2">{title}</h2>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
        {isExpanded ? (
          <ChevronUp className="text-gray-400 mt-1" size={20} />
        ) : (
          <ChevronDown className="text-gray-400 mt-1" size={20} />
        )}
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-[1000px] mt-6' : 'max-h-0'
        }`}
      >
        <div className="prose prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}