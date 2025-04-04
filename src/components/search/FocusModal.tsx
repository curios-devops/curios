import React, { useEffect, useRef } from 'react';
import { Globe, Users, PlayCircle, Calculator, Plane, HeartPulse, GraduationCap, LineChart } from 'lucide-react';
import { FocusMode } from './types';

interface FocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMode: FocusMode;
  onSelectMode: (mode: FocusMode) => void;
}

export default function FocusModal({ isOpen, onClose, selectedMode, onSelectMode }: FocusModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modes = [
    {
      id: 'web',
      icon: Globe,
      title: 'Web',
      description: ['Search across the', 'entire internet'],
    },
    {
      id: 'social',
      icon: Users,
      title: 'Social',
      description: ['Search discussions', 'and opinions'],
    },
    {
      id: 'video',
      icon: PlayCircle,
      title: 'Video',
      description: ['Discover and watch', 'video content'],
    },
    {
      id: 'math',
      icon: Calculator,
      title: 'Math',
      description: ['Solve equations and', 'calculations'],
    },
    {
      id: 'travel',
      icon: Plane,
      title: 'Travel & Local',
      description: ['Find places and', 'local information'],
    },
    {
      id: 'health',
      icon: HeartPulse,
      title: 'Health & Fitness',
      description: ['Access wellness', 'information'],
    },
    { 
      id: 'academic',
      icon: GraduationCap, 
      title: 'Academic',
      description: ['Search academic', 'papers and research'],
      requiresPro: true
    },
    {
      id: 'finance',
      icon: LineChart,
      title: 'Finance',
      description: ['Financial insights', 'and market data'],
      requiresPro: true
    }
  ];

  return (
    <div 
      ref={modalRef}
      className="absolute top-[calc(100%+0.5rem)] left-0 bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-xl z-50 p-2"
      style={{ width: 'calc(100% + 2rem)' }}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              onSelectMode(mode.id as FocusMode);
              onClose();
            }}
            className={`
              p-2 rounded-lg border transition-all text-left
              ${selectedMode === mode.id
                ? 'bg-[#007BFF]/10 border-[#007BFF] text-white'
                : 'bg-[#222222] border-gray-800 text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }
            `}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 mb-1">
                <mode.icon size={14} className={selectedMode === mode.id ? 'text-[#007BFF]' : ''} />
                <span className="text-xs font-medium">{mode.title}</span>
                {mode.requiresPro && (
                  <span className="text-[9px] bg-[#007BFF] text-white px-1 rounded ml-auto">
                    Pro
                  </span>
                )}
              </div>
              <div className="text-[10px] leading-[1.2] text-gray-500">
                <p>{mode.description[0]}</p>
                <p>{mode.description[1]}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}