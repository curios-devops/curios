import { useLanguage } from '../../contexts/LanguageContext.tsx';
import { languages, Language } from '../../types/language.ts';
import { useTheme } from '../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useState, useRef, useEffect } from 'react';

const LanguageSelector = () => {
  const { currentLanguage, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
  className={`px-3 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors shadow-md relative group border
    ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
      ? 'bg-[#23272A] hover:bg-[#33393B] text-[#F3F6F4] border-[#23272A]'
      : 'bg-[#FAFBF9] hover:border-[#007BFF] text-[#2A3B39] border-[#E3E6E3]'}
    ${open ? ((theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) ? 'ring-2 ring-blue-500 scale-105' : 'ring-2 ring-[#007BFF] scale-105') : ''}`}
        aria-label="Language selector"
      >
        {/* Flag + short code for active language */}
        <div className="flex items-center gap-1">
          {currentLanguage.flag.startsWith('/') ? (
            currentLanguage.code === 'ca' ? (
              <img src="/ca.svg" alt="Catalan flag" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-5 h-5 rounded-full object-cover" />
            )
          ) : (
            <div className="overflow-hidden w-5 h-5 rounded-full relative flex-shrink-0">
              <span style={{ fontSize: '18px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.3)' }}>{currentLanguage.flag}</span>
            </div>
          )}
          <span className={`text-xs font-medium uppercase ${theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'text-[#F3F6F4]' : 'text-[#2A3B39]' }`}>
            {currentLanguage.code}
          </span>
        </div>
        {/* Tooltip */}
        <span
          className={`absolute bottom-9 right-0 translate-x-0 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50
            ${theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
              ? 'bg-gray-800 text-gray-100'
              : 'bg-gray-100 text-gray-800'}
          `}
        >
          {t('languageSelectorTooltip')}
        </span>
      </button>
      {open && (
        <div className={`absolute right-0 bottom-full mb-2 w-44 rounded-xl shadow-lg border transition-colors duration-200 py-1 z-50 animate-fade-in text-xs
          ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
            ? 'bg-[#181A1B] border-[#23272A] text-white'
            : 'bg-white border-[#E3E6E3] text-[#222E2A]'}
        `}>
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
                  className={`flex items-center gap-2 px-4 py-2 text-left rounded-lg transition-colors font-normal text-xs
                    ${(theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))
                      ? 'bg-transparent text-[#F3F6F4] hover:bg-[#23272A] hover:text-[#F3F6F4]'
                      : 'bg-transparent text-[#222E2A] hover:bg-[#F5F7F6] hover:text-[#222E2A]'}
                  `}
                  title={lang.name}
                >
                  {lang.code === 'ca' ? (
                    <img src="/ca.svg" alt="Catalan flag" className="w-6 h-6 rounded-full object-cover" />
                  ) : lang.flag.startsWith('/') ? (
                    <img src={lang.flag} alt={`Language ${lang.code} flag`} className="w-6 h-6 rounded-full object-cover" />
                  ) : (
                    <div className="overflow-hidden w-6 h-6 rounded-full relative">
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
