import { useTheme } from '../theme/ThemeContext.tsx';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  /** Filled with the theme accent (same look as the submit arrow) — the suggested action. */
  accent?: boolean;
  className?: string;
}

export default function ActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  isActive = false,
  disabled = false,
  accent = false,
  className
}: ActionButtonProps) {
  const { theme } = useTheme();
  const accentColor = useAccentColor();

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200
          ${
            accent
              ? 'text-white hover:shadow-lg'
              : disabled
              ? 'text-gray-600 cursor-not-allowed'
              : isActive
              ? 'bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
              : 'text-gray-500 bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          }
          ${className || ''}
        `}
        style={accent ? { backgroundColor: accentColor.primary } : isActive ? { color: accentColor.primary } : undefined}
        onMouseEnter={(e) => {
          if (accent) {
            e.currentTarget.style.backgroundColor = accentColor.hover;
          } else if (!disabled && !isActive) {
            e.currentTarget.style.color = accentColor.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (accent) {
            e.currentTarget.style.backgroundColor = accentColor.primary;
          } else if (!disabled && !isActive) {
            e.currentTarget.style.color = '';
          }
        }}
        aria-label={label}
      >
        <Icon size={16} />
      </button>
      
      {tooltip && (
        <div className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
          ${theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            ? 'bg-gray-800 text-gray-100'
            : 'bg-gray-100 text-gray-800'}
        `}
        >
            {tooltip}
        </div>
        )}
    </div>
  );
}