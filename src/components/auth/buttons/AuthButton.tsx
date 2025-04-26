import React from 'react';

interface AuthButtonProps {
  onClick: () => void;
  type: 'signup' | 'signin';
  isActive: boolean;
  children: React.ReactNode;
}

export default function AuthButton({ onClick, type, isActive, children }: AuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full 
        py-2.5 
        px-4 
        rounded-lg 
        transition-all 
        duration-150 
        text-[15px]
        ${type === 'signup' ? 'font-medium' : ''}
        ${isActive 
          ? 'bg-[#007BFF] text-white transform scale-[0.98]' 
          : 'bg-gray-100 dark:bg-[#222222] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1a1a1a] hover:text-[#007BFF] dark:hover:text-[#007BFF]'
        }
      `}
    >
      {children}
    </button>
  );
}