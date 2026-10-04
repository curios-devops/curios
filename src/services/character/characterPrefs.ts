// Remembered Character choices: body (full / half), the presenter picked for
// each body (which also fixes its voice) and captions on/off. Kept in
// localStorage for everyone and in the account (auth user_metadata) for
// signed-in users, so the next visit — on any device — loads the same setup.

import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export interface CharacterPrefs {
  body: 'full' | 'half';
  fullId: string | null;
  halfId: string | null;
  captions: boolean;
}

const KEY = 'curios_character_prefs';
export const DEFAULT_PREFS: CharacterPrefs = { body: 'full', fullId: null, halfId: null, captions: true };

export function normalizePrefs(raw: unknown): CharacterPrefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<CharacterPrefs>;
  return {
    body: r.body === 'half' ? 'half' : 'full',
    fullId: typeof r.fullId === 'string' ? r.fullId : null,
    halfId: typeof r.halfId === 'string' ? r.halfId : null,
    captions: typeof r.captions === 'boolean' ? r.captions : true,
  };
}

/** Account prefs win (cross-device); then this browser; then defaults. */
export function loadPrefs(user: User | null | undefined): CharacterPrefs {
  const fromAccount = user?.user_metadata?.character_prefs;
  if (fromAccount) return normalizePrefs(fromAccount);
  try {
    const local = localStorage.getItem(KEY);
    if (local) return normalizePrefs(JSON.parse(local));
  } catch { /* storage blocked */ }
  return DEFAULT_PREFS;
}

/**
 * Signed-in users: read the account fresh — the user object cached in a
 * long-lived session predates any prefs saved later (e.g. on another device).
 */
export async function fetchPrefs(user: User | null | undefined): Promise<CharacterPrefs> {
  if (!user) return loadPrefs(null);
  const { data } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return loadPrefs(data.user ?? user);
}

export function savePrefs(prefs: CharacterPrefs, user: User | null | undefined) {
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage blocked */ }
  if (user) void supabase.auth.updateUser({ data: { character_prefs: prefs } }).then(undefined, () => undefined);
}
