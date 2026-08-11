import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";
import CuriosLogo from "../common/CuriosLogo.tsx";
import { appSettings, LOGO_GRAY } from "../../config/appSettings.ts";

// `variant` picks which app-settings.md block drives the look:
//   'sidebar' → SIDEBAR_* keys (desktop sidebar + mobile drawer)
//   'header'  → HEADER_*  keys (mobile top header)
export default function Logo({ isCollapsed, variant = 'sidebar' }: { isCollapsed: boolean; variant?: 'sidebar' | 'header' }) {
  const accentColor = useAccentColor();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const isDarkMode =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const logoAccentColor =
    selectedAccentColor === 'gray'
      ? isDarkMode
        ? '#F3F4F6'
        : '#111827'
      : accentColor.primary;

  // Sizes (L/M/S) + AI on/off come from app-settings.md, per context.
  const logo = variant === 'header' ? appSettings.header.logo : appSettings.sidebar.logo;
  const font = appSettings.wordmarkFont;
  const iconPx = isCollapsed ? logo.iconSize + 4 : logo.iconSize;
  const baseWordmark = { fontFamily: font.fontFamily, fontWeight: font.fontWeight, letterSpacing: font.letterSpacing } as const;
  const gray = appSettings.wordmarkColor === 'gray';

  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}>
      <CuriosLogo size={iconPx} colorOverride={logoAccentColor} />
      {!isCollapsed && (
        <div className="flex items-center">
          <span
            className={gray ? '' : 'text-gray-900 dark:text-white'}
            style={{ ...baseWordmark, fontSize: logo.nameFontSize, ...(gray ? { color: LOGO_GRAY } : {}) }}
          >
            Curios
          </span>
          {logo.showAi && (
            gray ? (
              <span className="ml-0.5" style={{ ...baseWordmark, fontSize: logo.aiFontSize, color: LOGO_GRAY }}>AI</span>
            ) : (
              <span
                className="ml-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
                style={{ ...baseWordmark, fontSize: logo.aiFontSize }}
              >
                AI
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}
