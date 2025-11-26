import { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { useTheme } from "./theme/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { useAccentColor } from "../hooks/useAccentColor";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const accentColor = useAccentColor();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const menuItems = [
    { label: t('helpAndFaq'), href: "#" },
    { label: t('releaseNotes'), href: "#" },
    { label: t('termsAndPolicies'), href: "/policies" },
    { label: t('keyboardShortcuts'), href: "#" },
    { label: t('reportIllegalContent'), href: "#" },
  ];

  const isDarkMode = (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(true)}
        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-md relative group border
          ${isDarkMode
            ? 'bg-[#23272A] border-[#3A3F42] text-white'
            : 'bg-[#FAFBF9] border-[#D1D5DB] text-[#2A3B39]'}
        `}
        style={{ 
          zIndex: 201,
          transition: 'border-color 200ms'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = accentColor.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isDarkMode ? '#3A3F42' : '#D1D5DB';
        }}
        aria-label={t('help')}
      >
        <span className="text-sm">?</span>
        {/* Tooltip */}
        <span
          className={`absolute bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-bold
            ${isDarkMode
              ? 'bg-gray-800 text-gray-100'
              : 'bg-gray-100 text-gray-800'}
          `}
        >
          {t('help')}
        </span>
      </button>
      {isOpen && (
        <div className={`absolute right-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border transition-colors duration-200 py-1 z-50 animate-fade-in text-xs
          ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
            ? 'bg-[#181A1B] border-[#23272A] text-white'
            : 'bg-white border-[#E3E6E3] text-[#222E2A]'}
        `}>
          <div className="flex flex-col">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs hover:bg-[#23272A]/10"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
