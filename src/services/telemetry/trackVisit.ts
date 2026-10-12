// One anonymous row per page view for /tele: feature, app language and the browser's time zone
// (region = its continent). No IP, no email; a random per-browser id counts unique visitors.
import { supabase } from '../../lib/supabase.ts';

const FEATURES: [RegExp, string][] = [
  [/^\/$/, 'home'],
  [/^\/(fast-search|search|pro-search)/, 'search'],
  [/^\/(movie-results|movie\/)/, 'movies'],
  [/^\/(music-results|song\/)/, 'music'],
  [/^\/(games-results|arcade\/)/, 'games'],
  [/^\/arcade$/, 'made-with-ai'],
  [/^\/stories-results/, 'stories'],
  [/^\/(character|avatar-search)/, 'character'],
  [/^\/(explore|feed|topic|s\/)/, 'discover'],
  [/^\/(spaces|history|library)/, 'library'],
];

export const featureOf = (path: string) => FEATURES.find(([re]) => re.test(path))?.[1] ?? 'other';

const VISITOR_KEY = 'curios_vid';
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  } catch { return null; }
}

export function trackVisit(path: string, lang: string) {
  if (import.meta.env.DEV) return;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  void supabase.rpc('track_visit', { feature: featureOf(path), lang, tz, visitor: visitorId() }).then(undefined, () => undefined);
}
