import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation.ts";
import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";

interface CollapseButtonProps {
  isCollapsed: boolean;
  onClick: () => void;
  position?: "top" | "bottom";
}

export default function CollapseButton(
  { isCollapsed, onClick, position = "top" }: CollapseButtonProps,
) {
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const isDarkMode = (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const isGrayAccent = selectedAccentColor === 'gray';
  const hoverTextColor = isGrayAccent ? accentColor.dark : accentColor.primary;
  const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
  const tooltipForeground = isDarkMode ? '#F9FAFB' : '#111827';
  const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';
  const Icon = isCollapsed ? ChevronRight : ChevronLeft;

  const button = (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full
        flex
        items-center
        justify-center
        p-2.5
        text-gray-600
        transition-colors
        rounded-md
        hover:bg-gray-100
        dark:hover:bg-[#1a1a1a]
        dark:text-gray-400
      `}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverTextColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '';
      }}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Icon size={20} strokeWidth={2.5} />
    </button>
  );

  // Add tooltip wrapper for bottom position when collapsed
  if (position === "bottom" && isCollapsed) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block text-xs py-1 px-2 rounded whitespace-nowrap border z-50"
          style={{
            backgroundColor: tooltipBackground,
            color: tooltipForeground,
            borderColor: tooltipBorder,
          }}
        >
          {t('expand')}
        </div>
      </div>
    );
  }

  // Add tooltip wrapper for top position when NOT collapsed
  if (position === "top" && !isCollapsed) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute left-1/2 -translate-x-1/2 md:-translate-x-[62%] -bottom-8 hidden group-hover:block text-xs py-1 px-2 rounded whitespace-nowrap border z-50"
          style={{
            backgroundColor: tooltipBackground,
            color: tooltipForeground,
            borderColor: tooltipBorder,
          }}
        >
          {t('collapse')}
        </div>
      </div>
    );
  }

  // For all other cases, return button without tooltip
  return button;
}
