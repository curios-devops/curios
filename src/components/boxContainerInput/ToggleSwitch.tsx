import React from 'react';
import { useAccentColor } from '../../hooks/useAccentColor.ts';
import { useTheme } from '../theme/ThemeContext.tsx';

interface ToggleSwitchProps {
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
  showWarning?: boolean;
}

export default function ToggleSwitch({ 
  isEnabled, 
  onToggle, 
  disabled = false,
  showWarning = false
}: ToggleSwitchProps) {
  const accentColor = useAccentColor();
  const { accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';
  const activeTrackColor = isGrayAccent ? accentColor.dark : accentColor.primary;
  const activeLabelColor = isGrayAccent ? accentColor.dark : accentColor.primary;

  return (
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={isEnabled}
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative 
          w-10 
          h-5 
          rounded-full 
          transition-all 
          duration-300 
          ease-in-out
          focus:outline-none 
          ${disabled 
            ? 'bg-[#2a2a2a] border-gray-700 cursor-not-allowed opacity-50' 
            : isEnabled 
              ? 'focus:ring-2 focus:ring-offset-2 focus:ring-offset-black' 
              : ''
          }`}
        style={
          disabled
            ? undefined
            : {
                backgroundColor: isEnabled ? activeTrackColor : activeTrackColor,
                borderColor: isEnabled ? activeTrackColor : activeTrackColor,
                boxShadow: isEnabled ? `0 0 0 2px ${activeTrackColor}33` : undefined,
              }
        }
      >
        <span
          className={`
            absolute 
            block 
            top-0.5 
            left-0.5 
            w-4 
            h-4 
            rounded-full 
            transition-transform 
            duration-300 
            ease-in-out
            ${isEnabled 
              ? 'translate-x-5 bg-white shadow-md' 
              : 'translate-x-0 bg-white'
            }
            ${disabled ? 'opacity-50' : ''}
          `}
        />
      </button>
      <span 
        className={`
          text-sm 
          transition-all 
          duration-300
          translate-y-[1px]
          ${disabled
            ? 'text-gray-600'
            : isEnabled 
              ? 'font-bold' 
              : 'text-gray-500 font-normal'
          }
          ${showWarning ? 'text-red-500' : ''}
        `}
        style={!disabled && isEnabled ? { color: activeLabelColor } : undefined}
      >
        Pro
      </span>
    </div>
  );
}