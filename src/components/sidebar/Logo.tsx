import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";
import CuriosLogo from "../common/CuriosLogo.tsx";
import { appSettings, LOGO_GRAY, LOGO_ICON_PX } from "../../config/appSettings.ts";

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

  // Text sizes (L/M/S) + AI on/off come from app-settings.md, per context; icon size is fixed.
  const logo = variant === 'header' ? appSettings.header.logo : appSettings.sidebar.logo;
  const font = appSettings.wordmarkFont;
  const iconPx = isCollapsed ? LOGO_ICON_PX + 4 : LOGO_ICON_PX;
  const baseWordmark = { fontFamily: font.fontFamily, fontWeight: font.fontWeight, letterSpacing: font.letterSpacing } as const;
  const gray = appSettings.wordmarkColor === 'gray';
  // PAMBA: "Curios" in Pamba's near-black ink, "AI" thinner and gray.
  const pamba = appSettings.wordmarkColor === 'pamba';
  // DARK: "Curios" in the header ink, "AI" in the accent color (icon keeps its gray).
  const dark = appSettings.wordmarkColor === 'dark';

  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}>
      <CuriosLogo
        size={iconPx}
        frameColor={appSettings.logoMark.iconColor}
        colorOverride={appSettings.logoMark.dotColor === 'accent' ? logoAccentColor : appSettings.logoMark.dotColor}
        pulse={appSettings.logoMark.dotPulse}
      />
      {!isCollapsed && (
        <div className="flex items-center">
          <span
            className={pamba ? 'text-[#15130D] dark:text-[#F3F1EC]' : dark ? 'text-gray-600 dark:text-gray-300' : gray ? '' : 'text-gray-900 dark:text-white'}
            style={{ ...baseWordmark, fontSize: logo.nameFontSize, ...(gray ? { color: LOGO_GRAY } : {}) }}
          >
            Curios
          </span>
          {logo.showAi && (
            pamba ? (
              <span className="ml-0.5 text-[#8A857A] dark:text-[#A8A396]" style={{ ...baseWordmark, fontSize: logo.aiFontSize, fontWeight: 300 }}>AI</span>
            ) : dark ? (
              <span className="ml-0.5" style={{ ...baseWordmark, fontSize: logo.aiFontSize, color: logoAccentColor }}>AI</span>
            ) : gray ? (
              <span className="ml-0.5" style={{ ...baseWordmark, fontSize: logo.aiFontSize, color: logoAccentColor }}>AI</span>
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
