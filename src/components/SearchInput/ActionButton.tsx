import { Focus, Globe, Users, PlayCircle, Calculator, Plane, HeartPulse, GraduationCap, LineChart } from 'lucide-react';
import type { FocusMode } from '../search/types.ts';
import { useTheme } from '../theme/ThemeContext.tsx';
import type { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
    label: string;
  tooltip?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  mode?: FocusMode;
  className?: string;
}

export default function ActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  isActive = false,
  disabled = false,
  mode,
  className
}: ActionButtonProps) {
  const { theme } = useTheme();

  const getFocusIcon = () => {
    if (!mode || Icon !== Focus) return Icon;
    
    switch (mode) {
      case 'web':
        return Globe;
      case 'social':
        return Users;
      case 'video':
        return PlayCircle;
      case 'math':
        return Calculator;
      case 'travel':
        return Plane;
      case 'health':
        return HeartPulse;
      case 'academic':
        return GraduationCap;
      case 'finance':
        return LineChart;
      default:
        return Focus;
    }
  };

  const FinalIcon = getFocusIcon();

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
              ? 'text-[#007BFF] bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
              : 'text-gray-500 bg-gray-100 dark:bg-transparent hover:text-[#007BFF] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
          }
          ${className || ''}
        `}
        aria-label={label}
      >
        <FinalIcon size={18} />
      </button>
      
      {tooltip && (
        <div className={`
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none
          ${theme === 'light' ? 'bg-gray-100 text-gray-800' : 'bg-[#1a1a1a] text-white'}
        `}
        >
            {tooltip}
        </div>
        )}
    </div>
  );
}