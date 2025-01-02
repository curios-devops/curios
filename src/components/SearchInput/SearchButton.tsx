import React from 'react';
import { ArrowRight } from 'lucide-react';

interface SearchButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
}

export default function SearchButton({ onClick, isActive, disabled }: SearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg 
        transition-all duration-250 ease-in-out
        transform hover:scale-102
        flex items-center justify-center
        translate-y-[1px]
        ${disabled || !isActive
          ? 'bg-[#2a2a2a] hover:bg-[#333333]'
          : 'bg-[#007bff] hover:bg-[#0056b3] hover:shadow-lg'
        }
      `}
      aria-label="Search"
    >
      <ArrowRight 
        size={16} 
        className={`
          transition-colors duration-250 ease-in-out
          ${disabled || !isActive ? 'text-gray-500' : 'text-white'}
        `}
      />
    </button>
  );
}