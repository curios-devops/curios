import React from 'react';
import { Focus, Globe, Users, PlayCircle, Calculator, Plane, HeartPulse, GraduationCap, LineChart } from 'lucide-react';
import type { FocusMode } from './types';
import ActionButton from '../SearchInput/ActionButton';

interface FocusButtonProps {
  mode: FocusMode;
  onClick: () => void;
}

export default function FocusButton({ mode, onClick }: FocusButtonProps) {
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
      case 'research':
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
      case 'research':
        return 'Research Search';
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
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a1a] text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {getModeLabel()}
      </div>
    </div>
  );
}