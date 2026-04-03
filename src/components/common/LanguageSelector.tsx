import { useLanguage } from '../../contexts/LanguageContext.tsx';
import { languages, Language } from '../../types/language.ts';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useAccentColor } from '../../hooks/useAccentColor';
import { useState, useRef, useEffect } from 'react';

const LanguageSelector = () => {
  const { currentLanguage, setLanguage } = useLanguage();
  const { theme, accentColor: selectedAccentColor } = useTheme();
  const { t } = useTranslation();
  const accentColor = useAccentColor();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDarkMode = (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches));
  const isGrayAccent = selectedAccentColor === 'gray';
  const controlBackground = isGrayAccent ? accentColor.dark : accentColor.primary;
  const controlForeground = isGrayAccent ? accentColor.light : 'var(--ui-text-on-accent)';
  const controlHoverBackground = isGrayAccent ? accentColor.primary : accentColor.hover;
  const tooltipBackground = isGrayAccent ? accentColor.primary : 'var(--ui-bg-elevated)';
  const tooltipForeground = isGrayAccent ? accentColor.dark : 'var(--ui-text-primary)';
  const tooltipBorder = isGrayAccent ? accentColor.dark : 'var(--ui-border-subtle)';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-medium shadow-md relative group border"
        style={{
          boxShadow: open 
            ? `0 0 0 2px ${isGrayAccent ? accentColor.dark : accentColor.primary}`
            : undefined,
          outline: 'none',
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
        aria-label="Language selector"
      >
        {/* Flag only for active language */}
        <div className="flex items-center justify-center">
          {currentLanguage.flag.startsWith('/') ? (
            currentLanguage.code === 'ca' ? (
              <img src="/ca.svg" alt="Catalan flag" className="w-5 h-3.5 rounded object-cover" />
            ) : (
              <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-3.5 rounded object-cover" />
            )
          ) : (
            <div className="overflow-hidden w-5 h-3.5 rounded relative flex-shrink-0">
              <span style={{ fontSize: '18px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.3)' }}>{currentLanguage.flag}</span>
            </div>
          )}
        </div>
        {/* Tooltip */}
        <span
          className="absolute bottom-9 right-0 translate-x-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border"
          style={{
            backgroundColor: tooltipBackground,
            color: tooltipForeground,
            borderColor: tooltipBorder,
          }}
        >
          {t('languageSelectorTooltip')}
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border transition-colors duration-200 py-1 z-50 animate-fade-in text-xs"
          style={{
            backgroundColor: 'var(--ui-bg-elevated)',
            borderColor: 'var(--ui-border-subtle)',
            color: 'var(--ui-text-primary)',
          }}
        >
          <div className="flex flex-col">
            {languages
              .filter((l: Language) => l.code !== currentLanguage.code)
              .map((lang: Language) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs"
                  style={{ color: 'var(--ui-text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)';
                    e.currentTarget.style.color = isGrayAccent ? accentColor.dark : accentColor.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--ui-text-primary)';
                  }}
                  title={lang.name}
                >
                  {lang.code === 'ca' ? (
                    <img src="/ca.svg" alt="Catalan flag" className="w-6 h-4 rounded object-cover" />
                  ) : lang.flag.startsWith('/') ? (
                    <img src={lang.flag} alt={`Language ${lang.code} flag`} className="w-6 h-4 rounded object-cover" />
                  ) : (
                    <div className="overflow-hidden w-6 h-4 rounded relative">
                      <span style={{ fontSize: '22px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.6)' }}>{lang.flag}</span>
                    </div>
                  )}
                  <span className="text-xs font-normal capitalize">{lang.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
