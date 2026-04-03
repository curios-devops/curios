import { useEffect, useRef, useState } from "react";
// import { Link } from "react-router-dom";
import { useTheme } from "./theme/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { useAccentColor } from "../hooks/useAccentColor";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, accentColor: selectedAccentColor } = useTheme();
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
  const isGrayAccent = selectedAccentColor === 'gray';
  const controlBackground = isGrayAccent ? accentColor.dark : accentColor.primary;
  const controlForeground = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';
  const controlHoverBackground = isGrayAccent ? accentColor.primary : accentColor.hover;
  const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
  const tooltipForeground = isGrayAccent ? accentColor.dark : 'var(--ui-text-primary)';
  const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(true)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shadow-md relative group border"
        style={{ 
          zIndex: 201,
          transition: 'border-color 200ms, background-color 200ms, color 200ms',
          backgroundColor: controlBackground,
          color: controlForeground,
          borderColor: isGrayAccent ? accentColor.dark : accentColor.primary,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = controlHoverBackground;
          if (isGrayAccent) {
            e.currentTarget.style.color = accentColor.dark;
            e.currentTarget.style.borderColor = accentColor.dark;
          } else {
            e.currentTarget.style.borderColor = accentColor.hover;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = controlBackground;
          e.currentTarget.style.color = controlForeground;
          e.currentTarget.style.borderColor = isGrayAccent ? accentColor.dark : accentColor.primary;
        }}
        aria-label={t('help')}
      >
        <span className="text-sm">?</span>
        {/* Tooltip */}
        <span
          className="absolute bottom-9 left-1/2 -translate-x-1/2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border"
          style={{
            backgroundColor: tooltipBackground,
            color: tooltipForeground,
            borderColor: tooltipBorder,
          }}
        >
          {t('help')}
        </span>
      </button>
      {isOpen && (
        <div
          className="absolute right-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border transition-colors duration-200 py-1 z-50 animate-fade-in text-xs"
          style={{
            backgroundColor: 'var(--ui-bg-elevated)',
            borderColor: 'var(--ui-border-subtle)',
            color: 'var(--ui-text-primary)',
          }}
        >
          <div className="flex flex-col">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs"
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                  e.currentTarget.style.color = isGrayAccent ? accentColor.dark : accentColor.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--ui-text-primary)';
                }}
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
