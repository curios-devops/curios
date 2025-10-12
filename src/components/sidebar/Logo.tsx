import { useAccentColor } from "../../hooks/useAccentColor.ts";

export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
  const accentColor = useAccentColor();
  
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}>
      <svg 
        width={isCollapsed ? "32" : "28"} 
        height={isCollapsed ? "32" : "28"} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M16 8L10 10L8 16L14 14L16 8Z" 
          stroke={accentColor.primary} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle 
          cx="12" 
          cy="12" 
          r="9" 
          stroke={accentColor.primary} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
      </svg>
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          <span className="font-helvetica font-semibold text-xl tracking-tight text-gray-900 dark:text-white">Curios</span>
          <span className="font-helvetica font-semibold text-xl tracking-tight ml-0.5" style={{ color: accentColor.primary }}>AI</span>
        </div>
      )}
    </div>
  );
}