import { useNavigate } from "react-router-dom";
import { useSession } from "../../hooks/useSession.ts";
import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";
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
  const { accentColor: selectedAccentColor } = useTheme();
  const isGuest = !session;
  const interactiveTextColor = selectedAccentColor === 'gray' ? accentColor.dark : accentColor.primary;

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
          ? "font-medium"
          : ""
      }`}
      style={
        isActive
          ? {
              color: interactiveTextColor,
              backgroundColor: 'var(--ui-bg-elevated)',
            }
          : {
              color: 'var(--ui-text-secondary)',
            }
      }
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = interactiveTextColor;
          e.currentTarget.style.backgroundColor = 'var(--ui-bg-elevated)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = 'var(--ui-text-secondary)';
          e.currentTarget.style.backgroundColor = 'transparent';
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
        <div
          className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block text-sm py-1 px-2 rounded whitespace-normal text-wrap break-words"
          style={{
            backgroundColor: 'var(--ui-bg-elevated)',
            color: 'var(--ui-text-primary)',
            border: '1px solid var(--ui-border-subtle)',
          }}
        >
          {label}
        </div>
      </div>
    );
  }

  return navButton;
}
