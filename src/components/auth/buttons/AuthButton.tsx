import React from 'react';

interface AuthButtonProps {
  type: 'signup' | 'signin';
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export default function AuthButton({ type, isActive, onClick, children }: AuthButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full 
        py-2.5 
        px-4 
        rounded-lg 
        transition-all 
        duration-150 
        text-[15px]
        ${isActive 
          ? 'bg-[#007BFF] text-white transform scale-[0.98]' 
          : 'bg-[#222222] text-gray-400 hover:bg-[#1a1a1a] hover:text-[#007BFF]'
        }
      `}
    >
      {children}
    </button>
  );
}