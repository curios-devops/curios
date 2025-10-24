import React, { useState } from 'react';
import { ChevronDown, Sparkles, Brain, Lightbulb, Microscope, User } from 'lucide-react';

export type SearchMode = 'auto' | 'pro' | 'reasoning' | 'deep-research' | 'operator';

interface SearchModeSelectorProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  isLoggedIn: boolean;
  isPro: boolean;
}

export default function SearchModeSelector({ mode, onChange, isLoggedIn, isPro }: SearchModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    {
      id: 'auto' as const,
      name: 'Auto',
      description: 'Adapts to each query',
      icon: Brain,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      description: '3x more sources and detailed answers',
      icon: Sparkles,
      requiresPro: true
    },
    {
      id: 'reasoning' as const,
      name: 'Reasoning',
      description: 'Advanced problem solving',
      icon: Lightbulb,
      requiresPro: true,
      comingSoon: true
    },
    {
      id: 'deep-research' as const,
      name: 'Deep Research',
      description: 'In-depth reports on complex topics',
      icon: Microscope,
      requiresPro: true
    },
    {
      id: 'operator' as const,
      name: 'Operator',
      description: 'Interacts with web browsers like a human',
      icon: User,
      requiresPro: true,
      comingSoon: true
    }
  ];

  const selectedMode = modes.find(m => m.id === mode) || modes[0];

  if (!isLoggedIn) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2a2a2a] transition-colors"
      >
        <selectedMode.icon size={16} className="text-[#007BFF]" />
        <span className="text-white text-sm">{selectedMode.name}</span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-[320px] bg-[#1a1a1a] rounded-lg border border-gray-800 shadow-xl z-50"
        >
          <div className="p-1">
            {modes.map((modeOption) => (
              <button
                key={modeOption.id}
                onClick={() => {
                  if (!modeOption.comingSoon && (!modeOption.requiresPro || isPro)) {
                    onChange(modeOption.id);
                    setIsOpen(false);
                  }
                }}
                disabled={modeOption.comingSoon || (modeOption.requiresPro && !isPro)}
                className={`
                  w-full flex items-start gap-3 p-3 rounded-lg text-left
                  ${mode === modeOption.id ? 'bg-[#333333]' : 'hover:bg-[#222222]'}
                  ${(modeOption.comingSoon || (modeOption.requiresPro && !isPro)) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <modeOption.icon 
                  size={18} 
                  className={mode === modeOption.id ? 'text-[#007BFF]' : 'text-gray-400'} 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium">
                      {modeOption.name}
                    </span>
                    {modeOption.requiresPro && (
                      <span className="text-[10px] font-medium bg-[#007BFF] text-white px-1.5 py-0.5 rounded">
                        PRO
                      </span>
                    )}
                    {modeOption.comingSoon && (
                      <span className="text-[10px] font-medium bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                        SOON
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-xs">
                    {modeOption.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!isPro && (
            <div className="p-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                5 enhanced queries remaining today
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}