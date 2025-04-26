import { ArrowRight } from 'lucide-react';

interface SearchButtonProps {
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
}

export default function SearchButton({ onClick, disabled, isActive }: SearchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg 
        transition-all duration-250 ease-in-out
        transform hover:scale-102
        flex items-center justify-center
        translate-y-[1px]
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-lg'
        }
        ${isActive 
          ? 'bg-[#007BFF] hover:bg-[#0056b3]' 
          : 'bg-gray-100 dark:bg-[#007BFF] hover:bg-gray-200 dark:hover:bg-[#0056b3]'
        }
        !opacity-100
      `}
      aria-label="Search"
    >
      <ArrowRight 
        size={16} 
        className={`transition-colors duration-250 ease-in-out ${
          isActive 
            ? 'text-white' 
            : 'text-gray-600 dark:text-white'
        }`}
      />
    </button>
  );
}