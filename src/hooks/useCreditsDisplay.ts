// The viewer's credits-indicator choice (Settings → Credits), kept in localStorage and shared
// live between Settings and the indicator in the header.
import { useSyncExternalStore } from 'react';
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

export function useCreditsDisplay(): [CreditsDisplay, (patch: Partial<CreditsDisplay>) => void] {
  const value = useSyncExternalStore(subscribe, read);
  const update = (patch: Partial<CreditsDisplay>) => {
    current = { ...read(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* this session only */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return [value, update];
}
