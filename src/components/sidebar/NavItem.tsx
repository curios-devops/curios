import { useNavigate } from "react-router-dom";
import { useSession } from "../../hooks/useSession.ts";
import { useAccentColor } from "../../hooks/useAccentColor.ts";
import type { LucideIcon } from "lucide-react";

export interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  requiresAuth?: boolean;
  authContext?: "default" | "pro" | "library" | "spaces";
  onAuthRequired?: (context: string) => void;
}

export default function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  requiresAuth = false,
  authContext = "default",
  onAuthRequired,
}: NavItemProps) {
  const navigate = useNavigate();
  const { session } = useSession();
  const accentColor = useAccentColor();
  const isGuest = !session;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (requiresAuth && isGuest) {
      onAuthRequired?.(authContext);
      return;
    }

    navigate(to);
  };

  const navButton = (
    <a
      href={to}
      onClick={handleClick}
      className={`flex items-center ${
        isCollapsed ? "justify-center" : "gap-3"
      } p-2.5 rounded-lg transition-colors duration-200 ${
        isActive
          ? "bg-[#eef1f2] dark:bg-[#1a1a1a] font-medium"
          : "text-gray-600 dark:text-gray-400 hover:bg-[#eef1f2] dark:hover:bg-[#1a1a1a]"
      }`}
      style={isActive ? { color: accentColor.primary } : undefined}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = accentColor.primary;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '';
        }
      }}
    >
      <Icon size={24} />
      {!isCollapsed && (
        <span className="text-sm font-medium tracking-[-0.01em]">
          {label}
        </span>
      )}
    </a>
  );

  // Add tooltip wrapper when collapsed
  if (isCollapsed) {
    return (
      <div className="relative group">
        {navButton}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block bg-gray-100 dark:bg-[#1a1a1a] text-gray-800 dark:text-white text-sm py-1 px-2 rounded whitespace-normal text-wrap break-words">
          {label}
        </div>
      </div>
    );
  }

  return navButton;
}
