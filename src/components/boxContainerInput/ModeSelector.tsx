import { BookOpen, Clapperboard, Search, Rocket, PersonStanding, Crown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

export type ModeType = 'auto' | 'search' | 'stories' | 'movie' | 'character' | 'avatar' | 'fastsearch';

interface Mode {
  id: ModeType;
  label: string;
  icon: React.ElementType;
  premium?: boolean; // shows a crown (consumes a Pro Credit)
}

// 'fastsearch' is the new primary "Search" (default). Legacy 'search' is kept in
// the type for old routes but is no longer offered in the dropdown.
const modes: Mode[] = [
  { id: 'auto', label: 'auto', icon: Rocket },
  { id: 'fastsearch', label: 'search', icon: Search },
  { id: 'stories', label: 'stories', icon: BookOpen },
  // Video = Movie mode (question → explainer video); Cinematic was merged into it.
  { id: 'movie', label: 'video', icon: Clapperboard },
  // Avatar was merged into Character (half-body option inside the page).
  { id: 'character', label: 'character', icon: PersonStanding, premium: true },
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
              {mode.premium && <Crown size={14} style={{ color: accentColor.primary }} />}
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
