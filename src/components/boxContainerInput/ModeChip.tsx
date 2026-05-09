import { X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation.ts';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import type { ModeType } from './ModeSelector.tsx';

interface ModeChipProps {
  mode: ModeType;
  onClear: () => void;
}

export default function ModeChip({ mode, onClear }: ModeChipProps) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Don't show chip for default 'search' mode
  if (mode === 'search') return null;

  const chipBackground = isGrayAccent
    ? isDarkMode
      ? '#374151' // gray-700
      : '#E5E7EB' // gray-200
    : `${accentColor.primary}15`; // 15% opacity of accent

  const chipText = isGrayAccent
    ? isDarkMode
      ? '#F9FAFB' // gray-50
      : '#111827' // gray-900
    : accentColor.primary;

  const chipBorder = isGrayAccent
    ? isDarkMode
      ? '#4B5563' // gray-600
      : '#D1D5DB' // gray-300
    : `${accentColor.primary}40`; // 40% opacity of accent

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border"
      style={{
        backgroundColor: chipBackground,
        color: chipText,
        borderColor: chipBorder,
      }}
    >
      <span className="capitalize">{t(mode)}</span>
      <button
        type="button"
        onClick={onClear}
        className="hover:opacity-70 transition-opacity"
        aria-label="Clear mode"
      >
        <X size={14} />
      </button>
    </div>
  );
}
