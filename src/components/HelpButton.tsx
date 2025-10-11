import { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { useTheme } from "./theme/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useTranslation();

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors shadow-md relative group border
          ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
            ? 'bg-[#23272A] hover:bg-[#33393B] text-[#F3F6F4] border-[#23272A]'
            : 'bg-[#FAFBF9] hover:border-[#007BFF] text-[#2A3B39] border-[#E3E6E3]'}
        `}
        aria-label={`${t('help')} menu`}
      >
  <HelpCircle size={18} className={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'text-[#F3F6F4]' : 'text-[#2A3B39]'} />
        {/* Tooltip */}
        <span
          className={`absolute bottom-9 right-0 translate-x-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50
            ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
              ? 'bg-gray-800 text-gray-100'
              : 'bg-gray-100 text-gray-800'}
          `}
        >
          {t('helpFaqTooltip')}
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
