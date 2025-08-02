import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
        className="w-7 h-7 rounded-full border flex items-center justify-center bg-theme-theme-toggle text-gray-700 text-sm font-medium transition-colors border-[#23272A] dark:border-[#23272A]/60 border-[#E3E6E3]/60 focus:outline-none"
        aria-label={`${t('help')} menu`}
      >
        <HelpCircle size={18} className="text-on-surface text-gray-700 dark:text-[#F3F6F4]" />
        <span className="sr-only">{t('help')}</span>
      </button>

      {isOpen && (
        <div className={`absolute bottom-full right-0 mb-2 w-56 rounded-xl shadow-lg border transition-colors duration-200 py-1 z-50 animate-fade-in text-xs
          ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
            ? 'bg-[#181A1B] border-[#23272A] text-white'
            : 'bg-white border-[#E3E6E3] text-[#222E2A]'}
        `}>
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className={`flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs
                ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
                  ? 'bg-transparent text-[#F3F6F4] hover:bg-[#23272A] hover:text-[#F3F6F4]'
                  : 'bg-transparent text-[#222E2A] hover:bg-[#F5F7F6] hover:text-[#222E2A]'}
              `}
              onClick={() => setIsOpen(false)}
            >
              <span className="text-base mr-1">
                {index === 0 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7" /><text x="8" y="11" textAnchor="middle" fontSize="8" fill="currentColor">?</text></svg></span>}
                {index === 1 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="12" height="12" rx="2" /><line x1="4" y1="6" x2="12" y2="6" /><line x1="4" y1="10" x2="12" y2="10" /></svg></span>}
                {index === 2 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="10" height="10" rx="2" /><line x1="5" y1="7" x2="11" y2="7" /><line x1="5" y1="9" x2="11" y2="9" /></svg></span>}
                {index === 3 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="8" rx="2" /><rect x="5" y="2" width="6" height="2" rx="1" /></svg></span>}
                {index === 4 && <span className="inline-block w-4 h-4 align-middle"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="8,2 14,14 2,14" /></svg></span>}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
