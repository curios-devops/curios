import { useState } from 'react';
import { ChevronDown, Sparkles, Brain, Lightbulb, Microscope, User } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTheme } from '../theme/ThemeContext.tsx';

export type SearchMode = 'auto' | 'pro' | 'reasoning' | 'deep-research' | 'operator';

interface SearchModeSelectorProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
  isLoggedIn: boolean;
  isPro: boolean;
}

export default function SearchModeSelector({ mode, onChange, isLoggedIn, isPro }: SearchModeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const accentColor = useAccentColor();
  const { accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';

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
  const activeAccentColor = isGrayAccent ? accentColor.dark : accentColor.primary;

  if (!isLoggedIn) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
        style={{ backgroundColor: 'var(--ui-bg-elevated)' }}
      >
        <selectedMode.icon size={16} style={{ color: activeAccentColor }} />
        <span className="text-sm" style={{ color: 'var(--ui-text-primary)' }}>{selectedMode.name}</span>
        <ChevronDown size={16} style={{ color: 'var(--ui-text-muted)' }} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[320px] rounded-lg shadow-xl z-50"
          style={{ backgroundColor: 'var(--ui-bg-primary)', border: '1px solid var(--ui-border-default)' }}
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
                className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors
                  ${(modeOption.comingSoon || (modeOption.requiresPro && !isPro)) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                style={{ backgroundColor: mode === modeOption.id ? 'var(--ui-bg-elevated)' : 'transparent' }}
              >
                <modeOption.icon
                  size={18}
                  style={{ color: mode === modeOption.id ? activeAccentColor : 'var(--ui-text-muted)' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--ui-text-primary)' }}>
                      {modeOption.name}
                    </span>
                    {modeOption.requiresPro && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: activeAccentColor,
                          color: isGrayAccent ? accentColor.light : 'white',
                        }}
                      >
                        PRO
                      </span>
                    )}
                    {modeOption.comingSoon && (
                      <span className="text-[10px] font-medium bg-yellow-500 text-black px-1.5 py-0.5 rounded">
                        SOON
                      </span>
                    )}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                    {modeOption.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!isPro && (
            <div className="p-3" style={{ borderTop: '1px solid var(--ui-border-subtle)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--ui-text-muted)' }}>
                5 enhanced queries remaining today
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}