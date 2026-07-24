import { useAccentColor } from "../../hooks/useAccentColor.ts";
import { useTheme } from "../theme/ThemeContext.tsx";
import CuriosLogo from "../common/CuriosLogo.tsx";

export default function Logo({ isCollapsed }: { isCollapsed: boolean }) {
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
  
  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2'}`}>
      <CuriosLogo size={isCollapsed ? 32 : 28} colorOverride={logoAccentColor} />
      {!isCollapsed && (
        <div className="flex items-center tracking-tight">
          {/* font-michroma (new brand logo font, design-kit.md) layered after
              font-helvetica — .font-helvetica stays as the legacy fallback;
              revert by dropping font-michroma from these two spans. */}
          <span className="font-helvetica font-michroma font-semibold text-lg tracking-tight text-gray-900 dark:text-white">Curios</span>
          <span className="font-helvetica font-michroma font-semibold text-lg tracking-tight ml-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">AI</span>
        </div>
      )}
    </div>
  );
}