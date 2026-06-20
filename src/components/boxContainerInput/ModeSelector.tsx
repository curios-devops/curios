import { BookOpen, Clapperboard, Popcorn, UserCircle, Search } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

export type ModeType = 'search' | 'stories' | 'cinematic' | 'movie' | 'avatar' | 'fastsearch';

interface Mode {
  id: ModeType;
  label: string;
  icon: React.ElementType;
}

// 'fastsearch' is the new primary "Search" (default). Legacy 'search' is kept in
// the type for old routes but is no longer offered in the dropdown.
const modes: Mode[] = [
  { id: 'fastsearch', label: 'search', icon: Search },
  { id: 'stories', label: 'stories', icon: BookOpen },
  { id: 'cinematic', label: 'cinematic', icon: Clapperboard },
  { id: 'movie', label: 'movie', icon: Popcorn },
  { id: 'avatar', label: 'avatar', icon: UserCircle }
];

interface ModeSelectorProps {
  selectedMode: ModeType;
  onModeSelect: (mode: ModeType) => void;
  onClose: () => void;
}

export default function ModeSelector({ selectedMode, onModeSelect, onClose }: ModeSelectorProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();

  const handleModeClick = (modeId: ModeType) => {
    onModeSelect(modeId);
    onClose();
  };

  return (
    <>
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = selectedMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => handleModeClick(mode.id)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 transition-colors text-left relative"
            style={{
              color: isActive ? accentColor.primary : 'var(--ui-text-primary)',
              fontWeight: isActive ? 500 : 400,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex items-center gap-3">
              <Icon
                size={18}
                style={{
                  color: isActive ? accentColor.primary : 'var(--ui-text-secondary)'
                }}
              />
              <span className="font-medium capitalize">
                {t(mode.label)}
              </span>
            </div>

            {/* Red dot indicator for active mode */}
            {isActive && (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: accentColor.primary }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}
