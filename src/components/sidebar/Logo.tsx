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
          <span className="font-helvetica font-semibold text-xl tracking-tight text-gray-900 dark:text-white">Curios</span>
          <span className="font-helvetica font-semibold text-xl tracking-tight ml-0.5 text-gray-500 dark:text-gray-400">AI</span>
        </div>
      )}
    </div>
  );
}