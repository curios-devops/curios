import { useState, useRef, useEffect } from 'react';
import { languages, Language } from '../../types/language.ts';
import { useLanguage } from '../../contexts/LanguageContext.tsx';

type LanguageItemProps = { lang: Language; setLanguage: (language: Language) => void; setIsOpen: (value: boolean) => void; };

const LanguageItem: React.FC<LanguageItemProps> = ({ lang, setLanguage, setIsOpen }) => {
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
 <div className="flex items-center gap-2">        <span className="text-xl flex items-center justify-center">{lang.flag}</span>
        <span className="text-xl flex items-center justify-center" style={{ position: 'relative', top: '-1px', left: '-1px' }}>{lang.flag}</span>        <span className="text-sm">{lang.name}</span>
 </div>
    </button>
 );
}


export default function LanguageSelector(): JSX.Element {
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
        className="w-[40px] h-[40px] flex items-center justify-between transition-colors rounded-md border"
        style={{
          backgroundColor: 'var(--ui-bg-secondary)',
          borderColor: 'var(--ui-border-default)',
          color: isOpen ? 'var(--ui-text-primary)' : 'var(--ui-text-muted)',
        }}
      >
        <div className='flex items-center gap-2 px-2'>
 <span className="text-xl flex items-center justify-center" style={{ position: 'relative', top: '-1px', left: '-1px' }}>{currentLanguage.flag}</span>        </div>
        <DropdownIcon className="w-[10px] h-[10px] transition-all mr-2" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 mt-2 p-2 border shadow-lg z-50 w-max min-w-[200px] flex flex-col rounded-lg"
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
        >
          {languages.map((lang: Language) => (
            <LanguageItem
              key={lang.code}
              lang={lang}
              setLanguage={setLanguage}
              setIsOpen={setIsOpen}
            />
          ))}
        </div>
      )} 
    </div>
  );
}