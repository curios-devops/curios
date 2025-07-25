import { useLanguage } from '../../contexts/LanguageContext.tsx';
import { languages as _languages, Language } from '../../types/language.ts';
import { useState, useRef, useEffect } from 'react';

export function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguage();
  console.log('Current Language:', currentLanguage);

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
      className={`px-1.5 h-6 rounded-full flex items-center justify-center text-xl bg-theme-theme-toggle border border-gray-700 transition-all duration-200 hover:scale-105 focus:outline-none ${open ? 'ring-1 ring-blue-500 scale-105' : ''}`}
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
          <span className="text-sm font-medium text-gray-700 dark:text-gray-100 uppercase">{currentLanguage.code}</span>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 bottom-full mb-2 w-44 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border-2 border-gray-700 z-50 py-2 animate-fade-in text-sm">
          <div className="flex flex-col">
            {_languages
              .filter((l: Language) => l.code !== currentLanguage.code)
              .map((lang: Language) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-left rounded transition-colors font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
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
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-100 capitalize">{lang.name}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
