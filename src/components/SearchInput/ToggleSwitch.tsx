import React from 'react';

interface ToggleSwitchProps {
  isEnabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function ToggleSwitch({ isEnabled, onToggle, disabled = false }: ToggleSwitchProps) {
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
              ? 'bg-[#007BFF] border-[#007BFF] focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-[#007BFF]' 
              : 'bg-[#2a2a2a] border-gray-700 hover:border-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-gray-700'
          }
          border
          translate-y-[1px]
        `}
      >
        <span
          className={`
            absolute 
            top-0.5 
            left-0.5 
            w-4 
            h-4 
            rounded-full 
            transition-transform 
            duration-300 
            ease-in-out
            ${isEnabled 
              ? 'translate-x-5 bg-white' 
              : 'translate-x-0 bg-gray-500'
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
              ? 'text-[#007BFF] font-bold' 
              : 'text-gray-500 font-normal'
          }
        `}
      >
        Pro
      </span>
    </div>
  );
}