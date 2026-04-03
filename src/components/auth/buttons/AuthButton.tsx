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
        py-2 
        px-3 
        rounded-lg 
        transition-all 
        duration-150 
        text-xs
        ${type === 'signup' ? 'font-medium' : ''}
        ${isActive 
          ? 'transform scale-[0.98]' 
          : 'bg-gray-100 dark:bg-[#222222] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#1a1a1a]'
        }
      `}
      style={isActive ? { backgroundColor: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' } : undefined}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--accent-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '';
        }
      }}
    >
      {children}
    </button>
  );
}