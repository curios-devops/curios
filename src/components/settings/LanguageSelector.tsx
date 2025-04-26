import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { languages } from '../../types/language';

export default function LanguageSelector() {
  const { currentLanguage, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-[#222222] text-2xl px-3 py-2 rounded-full hover:bg-[#2a2a2a] transition-colors"
        title={currentLanguage.name}
      >
        {currentLanguage.flag}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 p-2 bg-[#222222] rounded-xl border border-gray-800 shadow-lg flex flex-wrap gap-2 max-w-[280px] w-max z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
              className={`text-2xl p-2 rounded-full hover:bg-[#333333] transition-all transform hover:scale-110 ${
                currentLanguage.code === lang.code ? 'bg-[#333333] scale-110' : ''
              }`}
              title={lang.name}
            >
              {lang.flag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}