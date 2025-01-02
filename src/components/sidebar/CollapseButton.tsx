import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CollapseButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
  position?: 'top' | 'bottom';
}

export default function CollapseButton({ isCollapsed, onClick, position = 'top' }: CollapseButtonProps) {
  const Icon = isCollapsed ? ChevronRight : ChevronLeft;
  
  const button = (
    <button
      onClick={onClick}
      className={`
        w-full
        flex 
        items-center 
        justify-center 
        p-2.5
        text-gray-400 
        hover:text-[#007BFF] 
        transition-colors 
        rounded-md 
        hover:bg-[#1a1a1a]
      `}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <Icon size={20} strokeWidth={2.5} />
    </button>
  );

  // Add tooltip wrapper for bottom position when collapsed
  if (position === 'bottom' && isCollapsed) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block bg-[#1a1a1a] text-white text-sm py-1 px-2 rounded whitespace-nowrap">
          Expand
        </div>
      </div>
    );
  }

  // Add tooltip wrapper for top position when NOT collapsed
  if (position === 'top' && !isCollapsed) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 hidden group-hover:block bg-[#1a1a1a] text-white text-sm py-1 px-2 rounded whitespace-nowrap">
          Collapse
        </div>
      </div>
    );
  }

  // For all other cases, return button without tooltip
  return button;
}