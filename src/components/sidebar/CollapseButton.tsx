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
  const { accentColor: selectedAccentColor } = useTheme();
  const isGrayAccent = selectedAccentColor === 'gray';
  const hoverTextColor = isGrayAccent ? accentColor.dark : accentColor.primary;
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
        <div className="absolute left-1/2 -translate-x-1/2 -top-8 hidden group-hover:block text-sm py-1 px-2 rounded whitespace-nowrap"
          style={{
            backgroundColor: 'var(--ui-bg-elevated)',
            color: 'var(--ui-text-primary)',
            border: '1px solid var(--ui-border-subtle)',
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
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-8 hidden group-hover:block text-sm py-1 px-2 rounded whitespace-nowrap"
          style={{
            backgroundColor: 'var(--ui-bg-elevated)',
            color: 'var(--ui-text-primary)',
            border: '1px solid var(--ui-border-subtle)',
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
