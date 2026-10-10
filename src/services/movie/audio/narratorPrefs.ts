// Narrator voice for "Listen" (ElevenLabs). Same storage pattern as Character prefs:
// localStorage for everyone + the account (auth user_metadata) for signed-in users,
// so the chosen narrator follows them across devices. Default: a female narrator
// (we don't know the user's gender, and don't guess it).

import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { VOICES } from '../../character/voices';

const KEY = 'curios_narrator_voice';

// Narration-friendly subset of the ElevenLabs premade voices we already use.
const NARRATOR_IDS = [
  'EXAVITQu4vr4xnSDxMaL', // Sarah — default
  'Xb7hH8MSUJpSbSDYk0k2', // Alice
  'pFZP5JQG7iQjIQuC4Bku', // Lily
  'JBFqnCBsd6RMkjVDRZzb', // George
  'iP95p4xoKVk53GoZ742B', // Chris
  'bIHbv24MWmeRgasZH58o', // Will
];
export const NARRATOR_VOICES = NARRATOR_IDS.map((id) => VOICES.find((v) => v.id === id)!).filter(Boolean);
export const DEFAULT_NARRATOR_VOICE = NARRATOR_IDS[0];

const valid = (id: unknown): id is string => typeof id === 'string' && NARRATOR_IDS.includes(id);

/** Account choice wins (cross-device); then this browser; then the default. */
export function loadNarratorVoice(user: User | null | undefined): string {
  const fromAccount = user?.user_metadata?.narrator_voice;
  if (valid(fromAccount)) return fromAccount;
  try {
    const local = localStorage.getItem(KEY);
    if (valid(local)) return local;
  } catch { /* storage blocked */ }
  return DEFAULT_NARRATOR_VOICE;
}

export function saveNarratorVoice(voiceId: string, user: User | null | undefined) {
  if (!valid(voiceId)) return;
  try { localStorage.setItem(KEY, voiceId); } catch { /* storage blocked */ }
  if (user) void supabase.auth.updateUser({ data: { narrator_voice: voiceId } }).then(undefined, () => undefined);
}

export function narratorGender(voiceId: string): 'female' | 'male' {
  return VOICES.find((v) => v.id === voiceId)?.gender === 'male' ? 'male' : 'female';
}
