import { useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { useTranslation } from '../../hooks/useTranslation';
import { NARRATOR_VOICES, loadNarratorVoice, saveNarratorVoice } from '../../services/movie/audio/narratorPrefs';

// Narrator voice for "Listen" — saved to the account when signed in, else this browser.
export default function NarratorVoiceSelect() {
  const { session } = useSession();
  const { t } = useTranslation();
  const [voice, setVoice] = useState(() => loadNarratorVoice(session?.user));

  return (
    <select
      value={voice}
      onChange={(e) => {
        setVoice(e.target.value);
        saveNarratorVoice(e.target.value, session?.user);
      }}
      aria-label={t('settingsNarrator')}
      className="h-[40px] px-2 rounded-md border text-sm"
      style={{ backgroundColor: 'var(--ui-bg-secondary)', borderColor: 'var(--ui-border-default)', color: 'var(--ui-text-primary)' }}
    >
      {NARRATOR_VOICES.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name} · {t(v.gender === 'male' ? 'voiceMale' : 'voiceFemale')}
        </option>
      ))}
    </select>
  );
}
