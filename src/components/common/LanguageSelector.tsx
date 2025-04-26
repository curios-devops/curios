import { useLanguage } from '../../contexts/LanguageContext';
import { languages, Language } from '../../types/language';
import { useState, useRef, useEffect } from 'react';

export function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguage();
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
        onClick={() => setOpen((v) => !v)}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xl bg-gray-200 dark:bg-[#222] border border-gray-300 dark:border-gray-700 shadow-md transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${open ? 'ring-2 ring-blue-500 scale-110' : ''}`}
        title={currentLanguage.name}
        aria-label={`Switch language, current: ${currentLanguage.name}`}
        aria-pressed={open}
        style={{ boxShadow: open ? '0 0 0 4px #3b82f633' : '0 1px 4px #0001', overflow: 'hidden', padding: 0 }}
      >
        <span className="text-xl drop-shadow-sm" style={{ filter: 'drop-shadow(0 1px 2px #0005)' }}>{currentLanguage.flag}</span>
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-[44px] flex flex-col py-1 animate-fade-in">
          {languages.filter(l => l.code !== currentLanguage.code).map((lang: Language) => (
            <button
              key={lang.code}
              onClick={() => { setLanguage(lang); setOpen(false); }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xl hover:bg-gray-100 dark:hover:bg-[#222] transition-colors m-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={lang.name}
              aria-label={`Switch to ${lang.name}`}
              style={{ boxShadow: '0 1px 4px #0001' }}
            >
              <span className="text-2xl drop-shadow-sm" style={{ filter: 'drop-shadow(0 1px 2px #0005)' }}>{lang.flag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}