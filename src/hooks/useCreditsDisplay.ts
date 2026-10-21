// The viewer's credits-indicator choice (Settings → Credits), shared live between Settings and
// the indicator in the header. Kept in localStorage, and on the profile (credits_display) for
// signed-in people so it comes back on their next visit, on any device.
import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '../lib/supabase.ts';
import { parseCreditsDisplay, type CreditsDisplay } from '../services/creditsLook.ts';

const KEY = 'creditsDisplay';
const EVENT = 'curios:credits-display';

let current: CreditsDisplay | null = null;
function read(): CreditsDisplay {
  if (!current) {
    let raw: string | null = null;
    try { raw = localStorage.getItem(KEY); } catch { /* storage blocked → default */ }
    current = parseCreditsDisplay(raw);
  }
  return current;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { current = null; onChange(); } };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function apply(next: CreditsDisplay) {
  current = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* this session only */ }
  window.dispatchEvent(new Event(EVENT));
}

export function useCreditsDisplay(): [CreditsDisplay, (patch: Partial<CreditsDisplay>) => void] {
  const value = useSyncExternalStore(subscribe, read);
  const update = (patch: Partial<CreditsDisplay>) => {
    const next = { ...read(), ...patch };
    apply(next);
    void supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user?.id;
      if (id) void supabase.from('profiles').update({ credits_display: next }).eq('id', id).then(undefined, () => {});
    });
  };
  return [value, update];
}

/** Once per signed-in user: their saved choice (if any) replaces this browser's. */
export function useLoadCreditsDisplay(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;
    supabase.from('profiles').select('credits_display').eq('id', userId).maybeSingle()
      .then(({ data }) => { if (data?.credits_display) apply(parseCreditsDisplay(JSON.stringify(data.credits_display))); })
      .then(undefined, () => {});
  }, [userId]);
}
