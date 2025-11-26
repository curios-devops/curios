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
  className?: string;
}

export default function ActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  isActive = false,
  disabled = false,
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
          w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200
          ${
            disabled
              ? 'text-gray-600 cursor-not-allowed'
              : isActive
              ? 'bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
              : 'text-gray-500 bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          }
          ${className || ''}
        `}
        style={isActive ? { color: accentColor.primary } : undefined}
        onMouseEnter={(e) => {
          if (!disabled && !isActive) {
            e.currentTarget.style.color = accentColor.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isActive) {
            e.currentTarget.style.color = '';
          }
        }}
        aria-label={label}
      >
        <Icon size={18} />
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