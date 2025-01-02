import React from 'react';

interface ShowAllCardProps {
  totalSources: number;
  onClick: () => void;
}

export default function ShowAllCard({ totalSources, onClick }: ShowAllCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full h-full bg-[#222222] p-3 rounded-lg border border-gray-800 hover:bg-[#333333] hover:border-[#0095FF]/20 transition-all duration-300"
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex -space-x-1.5 mb-2">
          <div className="w-4 h-4 rounded-full bg-red-500/80 flex items-center justify-center text-[8px] text-white">CN</div>
          <div className="w-4 h-4 rounded-full bg-blue-500/80 flex items-center justify-center text-[8px] text-white">W</div>
          <div className="w-4 h-4 rounded-full bg-purple-500/80 flex items-center justify-center text-[8px] text-white">NY</div>
        </div>
        <div className="flex items-center">
          <span className="text-gray-400 text-xs">Show all</span>
        </div>
      </div>
    </button>
  );
}