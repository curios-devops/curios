import React from 'react';
import { Clock } from 'lucide-react';

interface TopBarProps {
  query: string;
  timeAgo: string;
}

export default function TopBar({ query, timeAgo }: TopBarProps) {
  return (
    <div className="sticky top-0 bg-[#111111]/80 backdrop-blur-sm border-b border-gray-800 px-6 py-4 z-10">
      <div className="max-w-7xl mx-auto flex items-center">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock size={14} />
          <span className="text-xs">{timeAgo}</span>
        </div>
        <div className="flex-1 flex justify-center">
          <h2 className="text-white text-xs font-medium">{query}</h2>
        </div>
        <div className="w-[76px]"></div>
      </div>
    </div>
  );
}