import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { useTranslation } from '../../hooks/useTranslation';
import { NARRATOR_VOICES, loadNarratorVoice, saveNarratorVoice } from '../../services/movie/audio/narratorPrefs';

// Narrator voice for "Listen" — saved to the account when signed in, else this browser.
// Same dropdown pattern as LanguageSelector (button + floating list).
export default function NarratorVoiceSelect({ openUp = false }: { openUp?: boolean }) {
  const { session } = useSession();
  const { t } = useTranslation();
  const [voice, setVoice] = useState(() => loadNarratorVoice(session?.user));
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const current = NARRATOR_VOICES.find((v) => v.id === voice) ?? NARRATOR_VOICES[0];
  const genderLabel = (g: string) => t(g === 'male' ? 'voiceMale' : 'voiceFemale');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('settingsNarrator')}
        className="h-[40px] px-3 gap-2 flex items-center justify-between transition-colors rounded-md border text-sm"
        style={{
          backgroundColor: 'var(--ui-bg-secondary)',
          borderColor: 'var(--ui-border-default)',
          color: 'var(--ui-text-primary)',
        }}
      >
        {current.name}
        <svg className="w-[10px] h-[10px] text-gray-500 dark:text-gray-400" width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <div
          className={`absolute right-0 ${openUp ? 'bottom-full mb-2' : 'mt-2'} p-2 border shadow-lg z-50 w-max min-w-[200px] flex flex-col rounded-lg`}
          style={{ backgroundColor: 'var(--ui-bg-elevated)', borderColor: 'var(--ui-border-default)' }}
        >
          {NARRATOR_VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                setVoice(v.id);
                saveNarratorVoice(v.id, session?.user);
                setIsOpen(false);
              }}
              className="px-2 py-1.5 rounded-md transition-colors w-full flex items-center justify-between gap-4 text-sm"
              style={{ color: v.id === voice ? 'var(--accent-primary)' : 'var(--ui-text-primary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ui-bg-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{v.name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{genderLabel(v.gender)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
