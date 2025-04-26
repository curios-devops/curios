import { DivideIcon as LucideIcon, Focus, Globe, Users, PlayCircle, Calculator, Plane, HeartPulse, GraduationCap, LineChart } from 'lucide-react';
import type { FocusMode } from '../search/types.ts';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  mode?: FocusMode;
}

export default function ActionButton({
  icon: Icon,
  label,
  tooltip,
  onClick,
  isActive = false,
  disabled = false,
  mode
}: ActionButtonProps) {
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
        className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
          disabled
            ? 'text-gray-600 cursor-not-allowed'
            : isActive
            ? 'text-[#007BFF] bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
            : 'text-gray-500 bg-gray-100 dark:bg-transparent hover:text-[#007BFF] hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
        }`}
        aria-label={label}
      >
        <FinalIcon size={18} className="translate-y-[1px]" />
      </button>
      
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {tooltip}
        </div>
      )}
    </div>
  );
}