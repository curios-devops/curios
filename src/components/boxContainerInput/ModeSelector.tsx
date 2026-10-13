import { useState } from 'react';
import { BookOpen, Clapperboard, Search, Rocket, PersonStanding, Crown, Popcorn, Gamepad2, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';

// 'movies' = Movie 🍿 forced on (TEMPORARY test entry; normally Movie is auto-detected inside Video/Auto).
export type ModeType = 'auto' | 'search' | 'stories' | 'movie' | 'movies' | 'games' | 'music' | 'character' | 'avatar' | 'fastsearch';

interface Mode {
  id: ModeType;
  label: string;
  icon: React.ElementType;
  premium?: boolean; // shows a crown (consumes a Pro Credit)
}

// 'fastsearch' is the new primary "Search" (default). Legacy 'search' is kept in
// the type for old routes but is no longer offered in the dropdown.
// The menu shows Auto, Search, Video, Magazine and Character; "More" opens the rest. Auto
// reaches every mode by itself (movies, games and music included).
const modes: Mode[] = [
  { id: 'auto', label: 'auto', icon: Rocket },
  { id: 'fastsearch', label: 'search', icon: Search },
  // Video = Movie mode (question → explainer video); Cinematic was merged into it.
  { id: 'movie', label: 'video', icon: Clapperboard },
  // Magazine (route 'stories'): the answer as a magazine story.
  { id: 'stories', label: 'stories', icon: BookOpen },
  // Avatar was merged into Character (half-body option inside the page).
  { id: 'character', label: 'character', icon: PersonStanding, premium: true },
];
const moreModes: Mode[] = [
  // Movie 🍿: film fact sheet (Auto/Video also detect films by themselves).
  { id: 'movies', label: 'movies', icon: Popcorn },
  // Games 🎮: browser games + similar commercial games for the query.
  { id: 'games', label: 'games', icon: Gamepad2 },
  // Music 🎵: song / artist / album fact sheet (Auto also routes music questions here).
  { id: 'music', label: 'music', icon: Music },
];

interface ModeSelectorProps {
  selectedMode: ModeType;
  onModeSelect: (mode: ModeType) => void;
  onClose: () => void;
}

export default function ModeSelector({ selectedMode, onModeSelect, onClose }: ModeSelectorProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();

  // Opened already when the chosen mode is one of the hidden ones.
  const [showMore, setShowMore] = useState(() => moreModes.some((m) => m.id === selectedMode));
  const shown = showMore ? [...modes, ...moreModes] : modes;
  const MoreIcon = showMore ? ChevronUp : ChevronDown;

  const handleModeClick = (modeId: ModeType) => {
    onModeSelect(modeId);
    onClose();
  };

  return (
    <>
      {shown.map((mode) => {
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
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
        style={{ color: 'var(--ui-text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        <MoreIcon size={18} />
        <span className="font-medium">{t(showMore ? 'lessModes' : 'moreModes')}</span>
      </button>
    </>
  );
}
