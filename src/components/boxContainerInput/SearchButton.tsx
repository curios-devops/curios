import { ArrowRight } from 'lucide-react';
import { useAccentColor } from '../../hooks/useAccentColor';

interface SearchButtonProps {
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  isRouting?: boolean;
}

export default function SearchButton({ onClick, disabled, isRouting = false }: SearchButtonProps) {
  const accentColor = useAccentColor();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-8 h-8 rounded-lg 
        transition-all duration-250 ease-in-out
        flex items-center justify-center
        ${disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-lg'
        }
        !opacity-100
      `}
      style={{
        backgroundColor: accentColor.primary,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = accentColor.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = accentColor.primary;
        }
      }}
      aria-label="Search"
    >
      {isRouting ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <ArrowRight
          size={18}
          className="transition-colors duration-250 ease-in-out text-white"
        />
      )}
    </button>
  );
}