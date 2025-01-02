import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function ActionButton({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  disabled = false
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
        disabled
          ? 'text-gray-600 cursor-not-allowed'
          : isActive
          ? 'text-[#007BFF] hover:bg-[#2a2a2a]'
          : 'text-gray-500 hover:text-[#007BFF] hover:bg-[#2a2a2a]'
      }`}
      aria-label={label}
    >
      <Icon size={18} className="translate-y-[1px]" />
    </button>
  );
}