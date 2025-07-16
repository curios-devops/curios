import _React from 'react';
import { useTheme } from '../../theme/ThemeContext.tsx';

interface DividerProps {
  text: string;
}

export default function Divider({ text }: DividerProps) {
  const { theme } = useTheme();
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-800"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className={`px-4 ${theme === 'dark' ? 'bg-[#1a1a1a] text-gray-500' : 'bg-white text-gray-600'}`}>
          {text}
        </span>
      </div>
    </div>
  );
}