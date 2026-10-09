import { useState, useRef, useEffect } from 'react';
import { languages, Language } from '../../types/language.ts';
import { useLanguage } from '../../contexts/LanguageContext.tsx';

type LanguageItemProps = { lang: Language; uiLang: string; setLanguage: (language: Language) => void; setIsOpen: (value: boolean) => void; };

// Language name in the current UI language ("Alemán" while in Spanish), via the browser's Intl data.
function localizedName(code: string, uiLang: string): string {
  try {
    const name = new Intl.DisplayNames([uiLang], { type: 'language' }).of(code) ?? '';
    return name.charAt(0).toLocaleUpperCase(uiLang) + name.slice(1);
  } catch {
    return '';
  }
}

const LanguageItem: React.FC<LanguageItemProps> = ({ lang, uiLang, setLanguage, setIsOpen }) => {
  const local = localizedName(lang.code, uiLang);
  return (
      <button
 type="button"
 key={lang.code}
      onClick={() => {
 setLanguage(lang);
 setIsOpen(false);
      }}      className="px-2 py-1 rounded-md transition-colors w-full"
      style={{ color: 'var(--ui-text-primary)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
 <div className="flex items-center gap-2">
        <img src={lang.flag} alt="" className="w-6 h-6 rounded-full shrink-0" />
        <span className="text-sm">{local || lang.name}</span>
 </div>
    </button>
 );
}


export default function LanguageSelector({ openUp = false }: { openUp?: boolean }): JSX.Element {
  const DropdownIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

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
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-[40px] px-2 gap-1.5 flex items-center justify-between transition-colors rounded-md border"
        style={{
          backgroundColor: 'var(--ui-bg-secondary)',
          borderColor: 'var(--ui-border-default)',
          color: isOpen ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)',
        }}
      >
        <img src={currentLanguage.flag} alt={currentLanguage.name} className="w-6 h-6 rounded-full" />
        <DropdownIcon className="w-[10px] h-[10px] transition-all" />
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 ${openUp ? 'bottom-full mb-2' : 'mt-2'} p-2 border shadow-lg z-50 w-max min-w-[200px] flex flex-col rounded-lg`}
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
        >
          {languages.map((lang: Language) => (
            <LanguageItem
              key={lang.code}
              lang={lang}
              uiLang={currentLanguage.code}
              setLanguage={setLanguage}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>
      )} 
    </div>
  );
}