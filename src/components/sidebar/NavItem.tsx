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
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const isGuest = !session;
  const isGrayAccent = selectedAccentColor === 'gray';
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const selectedBackground = isGrayAccent
    ? (isDarkMode ? accentColor.light : '#F9F9F9')
    : 'var(--ui-bg-secondary)';
  const selectedTextColor = isGrayAccent ? accentColor.dark : accentColor.primary;
  const selectedBorderColor = isGrayAccent
    ? (isDarkMode ? 'var(--ui-border-subtle)' : '#ECECEC')
    : accentColor.light;

  const hoverBackground = selectedBackground;
  const hoverTextColor = selectedTextColor;
  const hoverBorderColor = selectedBorderColor;

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
      } p-2.5 rounded-lg border transition-colors duration-200 ${
        isActive
          ? "font-medium"
          : ""
      }`}
      style={
        isActive
          ? {
              color: selectedTextColor,
              backgroundColor: 'transparent',
              borderColor: 'transparent',
            }
          : {
              color: 'var(--ui-text-secondary)',
              borderColor: 'transparent',
            }
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverTextColor;
        e.currentTarget.style.backgroundColor = hoverBackground;
        e.currentTarget.style.borderColor = hoverBorderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = isActive ? selectedTextColor : 'var(--ui-text-secondary)';
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
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
