import { Focus, Globe, Users, PlayCircle, Calculator, Plane, HeartPulse, GraduationCap, LineChart } from 'lucide-react';
import type { FocusMode } from './types.ts';
import ActionButton from '../SearchInput/ActionButton.tsx';
import { useTheme } from '../theme/ThemeContext.tsx';
import { useColorScheme } from '../../hooks/useColorScheme.ts';

interface FocusButtonProps {
  mode: FocusMode;
  onClick: () => void;
}

export default function FocusButton({ mode, onClick }: FocusButtonProps) {
  const { theme } = useTheme();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');

  const getModeIcon = () => {
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
      case 'focus':
      default:
        return Focus;
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'web':
        return 'Web Search';
      case 'social':
        return 'Social Search';
      case 'video':
        return 'Video Search';
      case 'math':
        return 'Math Search';
      case 'travel':
        return 'Travel Search';
      case 'health':
        return 'Health Search';
      case 'academic':
        return 'Academic Search';
      case 'finance':
        return 'Finance Search';
      case 'focus':
      default:
        return 'Focus Search';
    }
  };

  return (
    <div className="group relative">
      <ActionButton
        icon={getModeIcon()}
        label={getModeLabel()}
        onClick={onClick}
      />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
        {getModeLabel()}
      </div>
    </div>
  );
}