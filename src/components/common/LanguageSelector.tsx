import { useLanguage } from '../../contexts/LanguageContext.tsx';
import React from "react";
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
    <div className="relative" ref={ref} >
      <button
      type='button'
      onClick={() => setOpen(!open)}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xl bg-gray-200 dark:bg-[#1a1a1a] border border-gray-300 dark:border-gray-700 shadow-md transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 ${open ? 'ring-2 ring-blue-500 scale-110' : ''}`}
      >
        {currentLanguage.flag.startsWith('/') ? (
 // Prioritize /ca.svg for Catalan
          currentLanguage.code === 'ca' ? (
 <img src="/ca.svg" alt="Catalan flag" className="w-6 h-6 rounded-full object-cover" />
 ) : (
 <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-6 h-6 rounded-full object-cover" />
 )
        ) : (
          <div className="overflow-hidden w-6 h-6 rounded-full relative flex-shrink-0">
            <span style={{ fontSize: '22px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.6)' }}>{currentLanguage.flag}</span>
          </div>
        )}
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-2 animate-fade-in" style={{ border: '1px solid red' }}>
          <div className="flex flex-wrap gap-2 justify-center p-2 mb-1">
            {_languages /* Removed min-w-[30px] */
              .filter((l: Language) => l.code !== currentLanguage.code)
              .map((lang: Language) => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang);
                    setOpen(false);
                  }} /* Added px-2 */
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors hover:scale-105 dark:hover:bg-[#2a2a2a] dark:focus:ring-blue-700"
                  title={lang.name}
                >
                  {lang.code === 'ca' ? ( // Check specifically for 'ca' code
                    <img
                      src="/ca.svg" // Use the new SVG for Catalan
                      alt="Catalan flag"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : lang.flag.startsWith('/') ? (
                    <img
                      src={lang.flag}
                      alt={`Language ${lang.code} flag`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="overflow-hidden w-6 h-6 rounded-full relative">
                      {/* Added flex-shrink-0 */}
                      <span style={{ fontSize: '22px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.6)' }}>{lang.flag}</span>
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
